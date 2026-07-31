import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthenticatedRequest, getCallerUpn } from "../middleware/auth";
import { reportRateLimit } from "../middleware/rateLimiter";
import { auditLog } from "../services/auditLog";

const router = Router();
const prisma = new PrismaClient();

const ReportSchema = z.object({
  messageId: z.string().min(1),
  reportedUpn: z.string().email(),
  reasonCode: z.enum(["rushed", "inaccurate", "generic", "other"]),
  note: z.string().max(500).optional(),
});

/**
 * POST /api/reports
 * Submit a manual report for a message. Rate-limited per reporter.
 * Fully audited — this could be misused as a harassment vector.
 */
router.post("/", reportRateLimit, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = ReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const reporterUpn = getCallerUpn(req);
  const { messageId, reportedUpn, reasonCode, note } = parsed.data;

  const adminConfig = await prisma.adminConfig.findFirst();
  const dailyLimit = adminConfig?.maxReportsPerDay ?? 10;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = await prisma.report.count({
    where: { reporterUpn, createdAt: { gte: todayStart } },
  });

  if (todayCount >= dailyLimit) {
    res.status(429).json({ error: `Daily report limit of ${dailyLimit} reached.` });
    return;
  }

  const report = await prisma.report.create({
    data: { messageId, reporterUpn, reportedUpn, reasonCode, note },
  });

  await auditLog(reporterUpn, "report.submitted", messageId, {
    reportId: report.id,
    reportedUpn,
    reasonCode,
  });

  res.status(201).json({ id: report.id });
});

export default router;
