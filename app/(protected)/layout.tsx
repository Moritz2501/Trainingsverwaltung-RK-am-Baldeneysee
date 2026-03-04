import { requireAuth } from "@/lib/auth";
import { ProtectedShell } from "@/components/protected-shell";
import { isPrismaConnectionError } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  let assignedGroups: Array<{ id: string; name: string }> = [];

  try {
    assignedGroups = await prisma.trainingGroup.findMany({
      where: {
        assignments: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    if (!isPrismaConnectionError(error)) {
      throw error;
    }
  }

  return (
    <ProtectedShell role={session.user.role} assignedGroups={assignedGroups} forcePasswordChange={session.user.forcePasswordChange}>
      {children}
    </ProtectedShell>
  );
}
