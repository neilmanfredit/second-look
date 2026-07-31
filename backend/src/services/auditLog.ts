import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function auditLog(
  actorUpn: string,
  action: string,
  target?: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      actorUpn,
      action,
      target,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
}
