import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { assignTrainerToGroupAction, removeTrainerFromGroupAction, updateGroupAction } from "@/app/actions";
import { requireAuth } from "@/lib/auth";
import { canManageGroups } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  const group = await prisma.trainingGroup.findUnique({
    where: { id },
    include: {
      assignments: { include: { user: true } },
    },
  });

  if (!group) {
    notFound();
  }

  const assigned = group.assignments.some((entry) => entry.userId === session.user.id);
  const canEdit = canManageGroups(session.user.role) || assigned;

  if (!canEdit && session.user.role === Role.TRAINER) {
    notFound();
  }

  const trainers = await prisma.user.findMany({
    where: { role: Role.TRAINER, active: true },
    orderBy: { displayName: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gruppe: {group.name}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Gruppendaten</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateGroupAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={group.id} />
            <div className="space-y-1 md:col-span-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={group.name} required />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label htmlFor="season">Saison/Jahr</Label>
              <Input id="season" name="season" type="number" defaultValue={group.season} required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="description">Trainingsinhalte/Notizen</Label>
              <Textarea id="description" name="description" defaultValue={group.description} required />
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="active" defaultChecked={group.active} /> Aktiv
            </label>
            <Button className="bg-blue-700 text-white hover:bg-blue-600 md:col-span-2">Änderungen speichern</Button>
          </form>
        </CardContent>
      </Card>

      {canManageGroups(session.user.role) ? (
        <Card>
          <CardHeader>
            <CardTitle>Trainer zuweisen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={assignTrainerToGroupAction} className="flex flex-col gap-3 md:flex-row">
              <input type="hidden" name="groupId" value={group.id} />
              <select name="userId" className="h-10 rounded-md border border-border bg-background px-3 text-sm" required>
                <option value="">Trainer wählen</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.displayName}
                  </option>
                ))}
              </select>
              <Button className="bg-blue-700 text-white hover:bg-blue-600">Zuweisen</Button>
            </form>

            <div className="space-y-2">
              {group.assignments.length === 0 ? <p className="text-sm text-muted-foreground">Noch keine Zuweisungen.</p> : null}
              {group.assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between rounded-md border border-border p-2">
                  <span>{assignment.user.displayName}</span>
                  <form action={removeTrainerFromGroupAction}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="userId" value={assignment.userId} />
                    <Button variant="destructive" size="sm">
                      Entfernen
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
