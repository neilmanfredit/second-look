import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthenticatedRequest, getCallerUpn } from "../middleware/auth";
import { auditLog } from "../services/auditLog";
import rateLimit from "express-rate-limit";

const router = Router();
const prisma = new PrismaClient();

// Max 5 notifications to the same sender per notifier per day — prevents harassment via repeated pings
const notifyRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const authReq = req as AuthenticatedRequest;
    const notifier = authReq.auth?.upn ?? authReq.auth?.preferred_username ?? req.ip ?? "anon";
    const body = req.body as { senderUpn?: string };
    return `${notifier}:${body.senderUpn ?? "unknown"}`;
  },
  message: { error: "You have already sent several notifications to this sender today." },
  standardHeaders: true,
  legacyHeaders: false,
});

const NotifySchema = z.object({
  messageId: z.string().min(1),
  senderUpn: z.string().email(),
});

/**
 * POST /api/notifications
 * Logs that the recipient chose to notify a sender via the compose window.
 * The actual email is sent client-side via Office.js displayNewMessageForm —
 * this endpoint exists only for audit trail purposes.
 */
router.post("/", notifyRateLimit, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = NotifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const notifierUpn = getCallerUpn(req);
  const { messageId, senderUpn } = parsed.data;

  const notification = await prisma.senderNotification.create({
    data: { messageId, senderUpn, notifierUpn },
  });

  await auditLog(notifierUpn, "notification.sent", messageId, { senderUpn, notificationId: notification.id });

  res.status(201).json({ id: notification.id });
});

export default router;
