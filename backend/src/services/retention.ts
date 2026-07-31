import { PrismaClient } from "@prisma/client";
import winston from "winston";

const prisma = new PrismaClient();
const logger = winston.createLogger({ transports: [new winston.transports.Console()] });

/**
 * Deletes raw ReviewFlag rows older than retentionDays.
 * Reports older than retentionDays are anonymised (upn fields cleared) rather
 * than deleted, preserving aggregate counts for the dashboard.
 *
 * Run this on a schedule (e.g. daily via cron or Azure Functions timer trigger).
 */
export async function runRetentionPurge(retentionDays: number) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const deletedFlags = await prisma.reviewFlag.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  const anonymisedReports = await prisma.report.updateMany({
    where: {
      createdAt: { lt: cutoff },
      reporterUpn: { not: "[anonymised]" },
    },
    data: {
      reporterUpn: "[anonymised]",
      reportedUpn: "[anonymised]",
      note: null,
    },
  });

  logger.info("Retention purge complete", {
    cutoff,
    deletedFlags: deletedFlags.count,
    anonymisedReports: anonymisedReports.count,
  });
}
