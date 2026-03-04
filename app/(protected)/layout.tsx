import { requireAuth } from "@/lib/auth";
import { ProtectedShell } from "@/components/protected-shell";
import { prisma } from "@/lib/prisma";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const assignedGroups = await prisma.trainingGroup.findMany({
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

  return (
    <ProtectedShell role={session.user.role} assignedGroups={assignedGroups} forcePasswordChange={session.user.forcePasswordChange}>
      {children}
    </ProtectedShell>
  );
}
