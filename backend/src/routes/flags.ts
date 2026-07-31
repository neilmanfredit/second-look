import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthenticatedRequest, getCallerUpn } from "../middleware/auth";
import { computeReviewConfidence } from "../services/reviewConfidence";
import { auditLog } from "../services/auditLog";

const router = Router();
const prisma = new PrismaClient();

const FlagPayloadSchema = z.object({
  messageId: z.string().min(1),
  source: z.enum(["outlook", "teams"]),
  senderUpn: z.string().email(),
  receivedAt: z.coerce.date(),
  sentAt: z.coerce.date(),
  wordCount: z.number().int().positive(),
});

/**
 * POST /api/flags
 * Called by the Outlook add-in or Teams bot when a message is opened.
 * Computes review_confidence_score and stores the flag record.
 */
router.post("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = FlagPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { messageId, source, senderUpn, receivedAt, sentAt, wordCount } = parsed.data;

  const adminConfig = await prisma.adminConfig.findFirst();
  const wpmThreshold = adminConfig?.wpmThreshold ?? 150;
  const minWordCount = adminConfig?.minWordCountToFlag ?? 50;
  const minSeconds = adminConfig?.minSecondsBelowWpm ?? 60;

  const { wpm, flagged, flagReason } = computeReviewConfidence({
    wordCount,
    receivedAt,
    sentAt,
    wpmThreshold,
    minWordCountToFlag: minWordCount,
    minSecondsToFlag: minSeconds,
  });

  const flag = await prisma.reviewFlag.upsert({
    where: { messageId },
    create: { messageId, source, senderUpn, receivedAt, sentAt, wordCount, computedWpm: wpm, flagged, flagReason },
    update: { computedWpm: wpm, flagged, flagReason },
  });

  await auditLog(getCallerUpn(req), "flag.computed", messageId, { flagged, wpm });

  res.json({ flagged, wpm, flagReason, id: flag.id });
});

/**
 * GET /api/flags/:messageId
 * Returns flag status for a message — used by add-ins to check if badge should show.
 */
router.get("/:messageId", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flag = await prisma.reviewFlag.findUnique({
    where: { messageId: req.params.messageId },
    select: { flagged: true, computedWpm: true, flagReason: true },
  });

  if (!flag) {
    res.json({ flagged: false });
    return;
  }

  // Respect opt-out: if caller has opted out, don't surface badge data
  const callerUpn = getCallerUpn(req);
  const pref = await prisma.userPreference.findUnique({ where: { upn: callerUpn } });
  if (pref && !pref.badgesEnabled) {
    res.json({ flagged: false });
    return;
  }

  res.json(flag);
});

export default router;
