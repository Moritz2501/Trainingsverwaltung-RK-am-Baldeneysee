import Link from "next/link";
import { createGroupAction } from "@/app/actions";
import { requireAuth } from "@/lib/auth";
import { canManageGroups, canSeeAllGroups } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function GroupsPage() {
  const session = await requireAuth();

  const groups = canSeeAllGroups(session.user.role)
    ? await prisma.trainingGroup.findMany({
        include: { assignments: { include: { user: true } }, _count: { select: { athletes: true } } },
        orderBy: [{ active: "desc" }, { name: "asc" }],
      })
    : await prisma.trainingGroup.findMany({
        where: { assignments: { some: { userId: session.user.id } } },
        include: { assignments: { include: { user: true } }, _count: { select: { athletes: true } } },
        orderBy: { name: "asc" },
      });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Trainingsgruppen</h1>

      {canManageGroups(session.user.role) ? (
        <Card>
          <CardHeader>
            <CardTitle>Neue Trainingsgruppe anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createGroupAction} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea id="description" name="description" required />
              </div>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" name="active" defaultChecked /> Aktiv
              </label>
              <Button className="bg-blue-700 text-white hover:bg-blue-600 md:col-span-2">Speichern</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>{group.name}</span>
                <span className={`text-xs ${group.active ? "text-green-400" : "text-red-400"}`}>{group.active ? "Aktiv" : "Inaktiv"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Dauerhafte Trainingsgruppe</p>
              <p className="line-clamp-3 text-sm">{group.description}</p>
              <p className="text-xs text-muted-foreground">Sportler: {group._count.athletes}</p>
              <p className="text-xs text-muted-foreground">
                Trainer: {group.assignments.map((entry) => entry.user.displayName).join(", ") || "Nicht zugewiesen"}
              </p>
              <Link href={`/groups/${group.id}`}>
                <Button variant="outline" className="w-full hover:bg-blue-700/20">
                  Details öffnen
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
