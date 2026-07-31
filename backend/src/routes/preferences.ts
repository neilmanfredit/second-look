import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthenticatedRequest, getCallerUpn } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

const PreferenceSchema = z.object({
  badgesEnabled: z.boolean(),
});

/** GET /api/preferences — returns caller's badge opt-in status */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const upn = getCallerUpn(req);
  const pref = await prisma.userPreference.findUnique({ where: { upn } });
  res.json({ badgesEnabled: pref?.badgesEnabled ?? true });
});

/** PUT /api/preferences — update caller's badge opt-in status */
router.put("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = PreferenceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const upn = getCallerUpn(req);
  const pref = await prisma.userPreference.upsert({
    where: { upn },
    create: { upn, badgesEnabled: parsed.data.badgesEnabled },
    update: { badgesEnabled: parsed.data.badgesEnabled },
  });

  res.json({ badgesEnabled: pref.badgesEnabled });
});

export default router;
