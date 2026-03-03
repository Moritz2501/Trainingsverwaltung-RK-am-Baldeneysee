import Link from "next/link";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AttendanceGroupsPage() {
  const session = await requireAuth();
  const restrictedToAssigned = session.user.role === Role.TRAINER || session.user.role === Role.GRUPPEN_VERWALTUNG;

  const groups =
    restrictedToAssigned
      ? await prisma.trainingGroup.findMany({
          where: {
            active: true,
            assignments: {
              some: { userId: session.user.id },
            },
          },
          include: {
            _count: { select: { athletes: true } },
            assignments: { include: { user: true } },
          },
          orderBy: { name: "asc" },
        })
      : await prisma.trainingGroup.findMany({
          where: { active: true },
          include: {
            _count: { select: { athletes: true } },
            assignments: { include: { user: true } },
          },
          orderBy: { name: "asc" },
        });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Anwesenheitslisten</h1>
      {restrictedToAssigned ? (
        <p className="text-sm text-muted-foreground">Hier siehst du nur die Trainingsgruppen, denen du zugeordnet bist.</p>
      ) : (
        <p className="text-sm text-muted-foreground">Hier siehst du alle aktiven Trainingsgruppen.</p>
      )}

      {groups.length === 0 ? <p className="text-sm text-muted-foreground">Keine passenden Trainingsgruppen gefunden.</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Sportler: {group._count.athletes}</p>
              {!restrictedToAssigned ? (
                <p className="text-xs text-muted-foreground">
                  Trainer: {group.assignments.map((entry) => entry.user.displayName).join(", ") || "Nicht zugewiesen"}
                </p>
              ) : null}
              <Link href={`/attendance/${group.id}`}>
                <Button variant="outline" className="w-full hover:bg-blue-700/20">
                  Anwesenheit öffnen
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
