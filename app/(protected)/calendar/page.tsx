import { Prisma, Role } from "@prisma/client";
import { createCalendarEventAction, deleteCalendarEventAction } from "@/app/actions";
import { requireAuth } from "@/lib/auth";
import { isPrismaSchemaMismatchError } from "@/lib/prisma-errors";
import { canManageCalendar } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function CalendarPage() {
  const session = await requireAuth();
  let schemaMismatch = false;
  let events: Array<{
    id: string;
    title: string;
    type: string;
    startDate: Date;
    endDate: Date;
    location: string;
    description: string;
    durationHours: Prisma.Decimal;
    groups: Array<{ id: string; name: string }>;
    trainers: Array<{ id: string; displayName: string }>;
  }> = [];
  let groups: Array<{ id: string; name: string }> = [];
  let trainers: Array<{ id: string; displayName: string }> = [];

  try {
    [events, groups, trainers] = await Promise.all([
      prisma.calendarEvent.findMany({
        include: {
          groups: { select: { id: true, name: true } },
          trainers: { select: { id: true, displayName: true } },
        },
        orderBy: { startDate: "asc" },
      }),
      prisma.trainingGroup.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: { active: true, role: { in: [Role.TRAINER, Role.GRUPPEN_VERWALTUNG] } },
        orderBy: { displayName: "asc" },
        select: { id: true, displayName: true },
      }),
    ]);
  } catch (error) {
    if (!isPrismaSchemaMismatchError(error)) {
      throw error;
    }

    schemaMismatch = true;
    const [legacyEvents, legacyGroups, legacyTrainers] = await Promise.all([
      prisma.calendarEvent.findMany({
        select: {
          id: true,
          title: true,
          type: true,
          startDate: true,
          endDate: true,
          location: true,
          description: true,
        },
        orderBy: { startDate: "asc" },
      }),
      prisma.trainingGroup.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: { active: true, role: { in: [Role.TRAINER, Role.GRUPPEN_VERWALTUNG] } },
        orderBy: { displayName: "asc" },
        select: { id: true, displayName: true },
      }),
    ]);

    events = legacyEvents.map((event) => ({
      ...event,
      durationHours: new Prisma.Decimal(1),
      groups: [],
      trainers: [],
    }));
    groups = legacyGroups;
    trainers = legacyTrainers;
  }

  const canEdit = canManageCalendar(session.user.role);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Kalender</h1>

      {schemaMismatch ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          Die Datenbank ist noch nicht auf dem neuesten Stand. Bitte Migration ausführen, damit Stunden/Teilnehmer vollständig verfügbar sind.
        </p>
      ) : null}

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Neuer Termin (Regatta/Veranstaltung)</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createCalendarEventAction} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="title">Titel</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="type">Typ</Label>
                <select id="type" name="type" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="REGATTA">Regatta</option>
                  <option value="VERANSTALTUNG">Veranstaltung</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="startDate">Startdatum</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">Enddatum</Label>
                <Input id="endDate" name="endDate" type="date" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="durationHours">Stundenanzahl</Label>
                <Input id="durationHours" name="durationHours" type="number" min="0.25" step="0.25" defaultValue="1" required />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="location">Ort</Label>
                <Input id="location" name="location" required />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea id="description" name="description" required />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Teilnehmende Trainingsgruppen</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {groups.map((group) => (
                    <label key={group.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                      <input type="checkbox" name="groupIds" value={group.id} />
                      <span className="truncate">{group.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Teilnehmende Trainer</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {trainers.map((trainer) => (
                    <label key={trainer.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                      <input type="checkbox" name="trainerIds" value={trainer.id} />
                      <span className="truncate">{trainer.displayName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2">
                <Button className="bg-blue-700 text-white hover:bg-blue-600">Eintrag speichern</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Listenansicht</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? <p className="text-muted-foreground">Keine Termine vorhanden.</p> : null}
          {events.map((event) => (
            <div key={event.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{event.title}</h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{event.type}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {event.startDate.toLocaleDateString("de-DE")} – {event.endDate.toLocaleDateString("de-DE")} | {event.location}
              </p>
              <p className="text-sm text-muted-foreground">Dauer: {Number(event.durationHours.toString()).toLocaleString("de-DE")} Stunden</p>
              <p className="text-xs text-muted-foreground">
                Gruppen: {event.groups.map((group) => group.name).join(", ") || "Keine ausgewählt"}
              </p>
              <p className="text-xs text-muted-foreground">
                Trainer: {event.trainers.map((trainer) => trainer.displayName).join(", ") || "Keine ausgewählt"}
              </p>
              <p className="mt-1 text-sm">{event.description}</p>
              {session.user.role !== Role.TRAINER ? (
                <form action={deleteCalendarEventAction} className="mt-3">
                  <input type="hidden" name="id" value={event.id} />
                  <Button variant="destructive" size="sm">
                    Löschen
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kalenderansicht</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <div key={`calendar-${event.id}`} className="rounded-lg border border-border bg-accent/20 p-3">
              <p className="text-xs text-muted-foreground">{event.startDate.toLocaleDateString("de-DE")}</p>
              <p className="font-semibold">{event.title}</p>
              <p className="text-sm text-muted-foreground">{event.location}</p>
              <p className="text-xs text-muted-foreground">{Number(event.durationHours.toString()).toLocaleString("de-DE")} h</p>
            </div>
          ))}
          {events.length === 0 ? <p className="text-sm text-muted-foreground">Keine Einträge für die Kalenderansicht.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
