import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import {
  assignTrainerToGroupAction,
  createAthleteAction,
  createAthletesBatchAction,
  createAthleteTrainingEntryAction,
  deleteAthleteAction,
  moveAthletesAction,
  updateAthleteAction,
  updateGroupAction,
} from "@/app/actions";
import { requireAuth } from "@/lib/auth";
import { canManageGroups, canMoveAthletes } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;
  const { q } = await searchParams;
  const query = (q ?? "").trim();

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
        orderBy: [{ active: "desc" }, { name: "asc" }],
      },
    },
  });

  if (!group) {
    notFound();
  }

  const assigned = group.assignments.some((entry) => entry.userId === session.user.id);
  const canEdit = canManageGroups(session.user.role) || assigned;

  if (!canEdit) {
    notFound();
  }

  const trainers = await prisma.user.findMany({
    where: {
      role: { in: [Role.TRAINER, Role.GRUPPEN_VERWALTUNG, Role.LEITUNG, Role.ADMIN] },
      active: true,
    },
    orderBy: { displayName: "asc" },
  });

  const moveTargets = await prisma.trainingGroup.findMany({
    where: { id: { not: group.id }, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const assignedTrainerIds = new Set(group.assignments.map((entry) => entry.userId));
  const canMoveBetweenGroups = canMoveAthletes(session.user.role);
  const filteredAthletes = query
    ? group.athletes.filter((athlete) => athlete.name.toLowerCase().includes(query.toLowerCase()))
    : group.athletes;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">Gruppe: {group.name}</h1>
        <BackButton fallbackHref="/groups" label="Zurück zu Gruppen" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gruppendaten</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateGroupAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
            <CardTitle>Verantwortliche zuweisen (Mehrfachauswahl)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={assignTrainerToGroupAction} className="space-y-3">
              <input type="hidden" name="groupId" value={group.id} />
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {trainers.map((trainer) => (
                  <label key={trainer.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                    <input type="checkbox" name="userIds" value={trainer.id} defaultChecked={assignedTrainerIds.has(trainer.id)} />
                    <span className="truncate">{trainer.displayName} ({trainer.role})</span>
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
            <form action={createAthleteAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input type="hidden" name="groupId" value={group.id} />
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="birthDate">Geburtsdatum (optional)</Label>
                <Input id="birthDate" name="birthDate" type="date" />
              </div>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" name="active" defaultChecked /> Aktiv
              </label>
              <Button className="bg-blue-700 text-white hover:bg-blue-600 md:col-span-2">Sportler speichern</Button>
            </form>

            <form action={createAthletesBatchAction} className="mt-4 space-y-2 rounded-md border border-border p-3">
              <input type="hidden" name="groupId" value={group.id} />
              <Label htmlFor="batchInput">Mehrere Sportler auf einmal (eine Zeile pro Sportler)</Label>
              <p className="text-xs text-muted-foreground">Format: Name oder Name;YYYY-MM-DD (z. B. Max Mustermann;2012-05-08)</p>
              <Textarea id="batchInput" name="batchInput" className="min-h-28" placeholder={"Anna Beispiel\nMax Muster;2013-01-20"} required />
              <Button variant="secondary" className="hover:bg-blue-700/20">Mehrere Sportler speichern</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Sportlerverwaltung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" className="flex flex-col gap-2 md:flex-row md:items-end">
            <div className="w-full space-y-1 md:max-w-md">
              <Label htmlFor="q">Sportler suchen</Label>
              <Input id="q" name="q" defaultValue={query} placeholder="Name eingeben..." />
            </div>
            <Button type="submit" variant="outline">
              Suchen
            </Button>
          </form>

          {canEdit && canMoveBetweenGroups && moveTargets.length > 0 ? (
            <form action={moveAthletesAction} className="rounded-lg border border-border p-3">
              <input type="hidden" name="sourceGroupId" value={group.id} />
              <p className="mb-2 text-sm font-medium">Mehrere Sportler gleichzeitig verschieben</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {filteredAthletes.map((athlete) => (
                  <label key={`move-${athlete.id}`} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                    <input type="checkbox" name="athleteIds" value={athlete.id} />
                    {athlete.name}
                  </label>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <select name="targetGroupId" className="h-10 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm" required>
                  <option value="">Zielgruppe wählen</option>
                  {moveTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
                <Button className="bg-blue-700 text-white hover:bg-blue-600">Ausgewählte Sportler verschieben</Button>
              </div>
            </form>
          ) : null}

          {filteredAthletes.length === 0 ? <p className="text-sm text-muted-foreground">Keine passenden Sportler gefunden.</p> : null}
          {filteredAthletes.map((athlete) => (
            <details key={athlete.id} className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer list-none font-semibold">{athlete.name}</summary>

              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Geburtsdatum: {athlete.birthDate ? athlete.birthDate.toLocaleDateString("de-DE") : "-"}
                  </p>
                  <span className={`text-xs ${athlete.active ? "text-green-400" : "text-red-400"}`}>{athlete.active ? "Aktiv" : "Inaktiv"}</span>
                </div>

                {canEdit ? (
                  <form action={updateAthleteAction} className="grid gap-2 md:grid-cols-2">
                    <input type="hidden" name="id" value={athlete.id} />
                    <input type="hidden" name="groupId" value={group.id} />
                    <Input name="name" defaultValue={athlete.name} required className="md:col-span-1" />
                    <Input
                      type="date"
                      name="birthDate"
                      defaultValue={athlete.birthDate ? athlete.birthDate.toISOString().slice(0, 10) : ""}
                      className="md:col-span-1"
                    />
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
                  <form action={createAthleteTrainingEntryAction} className="grid grid-cols-1 gap-2 md:grid-cols-4">
                    <input type="hidden" name="athleteId" value={athlete.id} />
                    <Input type="date" name="trainingDate" required />
                    <Input name="result" placeholder="Trainingsergebnis" required className="md:col-span-2" />
                    <Textarea name="notes" placeholder="Notizen (optional)" className="md:col-span-4" />
                    <Button size="sm" className="bg-blue-700 text-white hover:bg-blue-600">
                      Ergebnis speichern
                    </Button>
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
                      {entry.notes ? <p className="mt-1 text-xs text-muted-foreground">Notiz: {entry.notes}</p> : null}
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
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
