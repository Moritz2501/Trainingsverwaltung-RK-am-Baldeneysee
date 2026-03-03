import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditLogInput = {
  actorId: string;
  actorRole: Role;
  action: string;
  targetType: string;
  targetId?: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export async function createAuditLog(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorRole: input.actorRole,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        message: input.message,
        metadata: input.metadata,
      },
    });
  } catch {
    // Audit logging must never block business actions.
  }
}
