import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthenticatedRequest, requireAdmin, getCallerUpn } from "../middleware/auth";
import { auditLog } from "../services/auditLog";
import { runRetentionPurge } from "../services/retention";

const router = Router();
const prisma = new PrismaClient();

const ConfigUpdateSchema = z.object({
  wpmThreshold: z.number().int().min(10).max(1000).optional(),
  minWordCountToFlag: z.number().int().min(1).max(500).optional(),
  minSecondsBelowWpm: z.number().int().min(1).max(3600).optional(),
  maxReportsPerDay: z.number().int().min(1).max(100).optional(),
  dataRetentionDays: z.number().int().min(7).max(730).optional(),
});

router.use(requireAdmin as any);

router.get("/config", async (_req: AuthenticatedRequest, res: Response) => {
  const config = await prisma.adminConfig.findFirst();
  res.json(config ?? { wpmThreshold: 150, minWordCountToFlag: 50, minSecondsBelowWpm: 60, maxReportsPerDay: 10, dataRetentionDays: 90 });
});

router.put("/config", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = ConfigUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const callerUpn = getCallerUpn(req);
  const existing = await prisma.adminConfig.findFirst();

  const config = existing
    ? await prisma.adminConfig.update({ where: { id: existing.id }, data: { ...parsed.data, updatedBy: callerUpn } })
    : await prisma.adminConfig.create({ data: { ...parsed.data, updatedBy: callerUpn } });

  await auditLog(callerUpn, "admin.config.updated", undefined, parsed.data);
  res.json(config);
});

/**
 * GET /api/admin/dashboard
 * Aggregate stats for the dashboard. Never exposes individual message content.
 */
router.get("/dashboard", async (_req: AuthenticatedRequest, res: Response) => {
  const [totalFlags, totalReports, reportsByReason, recentFlags] = await Promise.all([
    prisma.reviewFlag.count({ where: { flagged: true } }),
    prisma.report.count(),
    prisma.report.groupBy({ by: ["reasonCode"], _count: { reasonCode: true } }),
    prisma.reviewFlag.findMany({
      where: { flagged: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { source: true, senderUpn: true, wordCount: true, computedWpm: true, createdAt: true, flagReason: true },
    }),
  ]);

  res.json({ totalFlags, totalReports, reportsByReason, recentFlags });
});

/**
 * POST /api/admin/retention/purge
 * Manually trigger a retention purge. Normally scheduled externally.
 */
router.post("/retention/purge", async (req: AuthenticatedRequest, res: Response) => {
  const adminConfig = await prisma.adminConfig.findFirst();
  const days = adminConfig?.dataRetentionDays ?? 90;
  await runRetentionPurge(days);
  await auditLog(getCallerUpn(req), "admin.retention.purge", undefined, { retentionDays: days });
  res.json({ ok: true, retentionDays: days });
});

export default router;
