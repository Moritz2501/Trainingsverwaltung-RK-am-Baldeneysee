import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import {
  assignTrainerToGroupAction,
  createAthleteAction,
  createAthleteTrainingEntryAction,
  deleteAthleteAction,
  updateAthleteAction,
  updateGroupAction,
} from "@/app/actions";
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
      athletes: {
        include: {
          entries: {
            orderBy: { trainingDate: "desc" },
            take: 5,
          },
        },
        orderBy: [{ active: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
      },
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

  const assignedTrainerIds = new Set(group.assignments.map((entry) => entry.userId));

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
            <CardTitle>Trainer zuweisen (Mehrfachauswahl)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={assignTrainerToGroupAction} className="space-y-3">
              <input type="hidden" name="groupId" value={group.id} />
              <div className="grid gap-2 md:grid-cols-2">
                {trainers.map((trainer) => (
                  <label key={trainer.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                    <input type="checkbox" name="userIds" value={trainer.id} defaultChecked={assignedTrainerIds.has(trainer.id)} />
                    {trainer.displayName}
                  </label>
                ))}
              </div>
              <Button className="bg-blue-700 text-white hover:bg-blue-600">Trainer-Zuweisung speichern</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Sportler anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAthleteAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="groupId" value={group.id} />
              <div className="space-y-1">
                <Label htmlFor="firstName">Vorname</Label>
                <Input id="firstName" name="firstName" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Nachname</Label>
                <Input id="lastName" name="lastName" required />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="athleteNotes">Notizen</Label>
                <Textarea id="athleteNotes" name="notes" />
              </div>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" name="active" defaultChecked /> Aktiv
              </label>
              <Button className="bg-blue-700 text-white hover:bg-blue-600 md:col-span-2">Sportler speichern</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Sportlerverwaltung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {group.athletes.length === 0 ? <p className="text-sm text-muted-foreground">Noch keine Sportler in dieser Gruppe.</p> : null}
          {group.athletes.map((athlete) => (
            <div key={athlete.id} className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {athlete.firstName} {athlete.lastName}
                </h3>
                <span className={`text-xs ${athlete.active ? "text-green-400" : "text-red-400"}`}>{athlete.active ? "Aktiv" : "Inaktiv"}</span>
              </div>

              {canEdit ? (
                <form action={updateAthleteAction} className="grid gap-2 md:grid-cols-2">
                  <input type="hidden" name="id" value={athlete.id} />
                  <input type="hidden" name="groupId" value={group.id} />
                  <Input name="firstName" defaultValue={athlete.firstName} required />
                  <Input name="lastName" defaultValue={athlete.lastName} required />
                  <div className="md:col-span-2">
                    <Textarea name="notes" defaultValue={athlete.notes ?? ""} />
                  </div>
                  <label className="flex items-center gap-2 text-sm md:col-span-2">
                    <input type="checkbox" name="active" defaultChecked={athlete.active} /> Aktiv
                  </label>
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    <Button size="sm" className="bg-blue-700 text-white hover:bg-blue-600">
                      Sportler aktualisieren
                    </Button>
                  </div>
                </form>
              ) : null}

              {canEdit ? (
                <form action={createAthleteTrainingEntryAction} className="grid gap-2 md:grid-cols-4">
                  <input type="hidden" name="athleteId" value={athlete.id} />
                  <Input type="date" name="trainingDate" required />
                  <Input name="result" placeholder="Trainingsergebnis" required className="md:col-span-2" />
                  <Button size="sm" className="bg-blue-700 text-white hover:bg-blue-600">
                    Ergebnis speichern
                  </Button>
                  <div className="md:col-span-4">
                    <Textarea name="notes" placeholder="Notiz zum Ergebnis" />
                  </div>
                </form>
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-medium">Letzte Trainingsdaten</p>
                {athlete.entries.length === 0 ? <p className="text-xs text-muted-foreground">Noch keine Einträge.</p> : null}
                {athlete.entries.map((entry) => (
                  <div key={entry.id} className="rounded-md border border-border bg-accent/20 p-2 text-sm">
                    <p>
                      {entry.trainingDate.toLocaleDateString("de-DE")}: {entry.result}
                    </p>
                    {entry.notes ? <p className="text-xs text-muted-foreground">{entry.notes}</p> : null}
                  </div>
                ))}
              </div>

              {canEdit ? (
                <form action={deleteAthleteAction}>
                  <input type="hidden" name="id" value={athlete.id} />
                  <input type="hidden" name="groupId" value={group.id} />
                  <Button variant="destructive" size="sm">
                    Sportler löschen
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
