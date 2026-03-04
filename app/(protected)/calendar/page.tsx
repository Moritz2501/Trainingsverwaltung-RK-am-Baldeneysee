import { Prisma, Role } from "@prisma/client";
import { createCalendarEventAction, deleteCalendarEventAction, updateCalendarEventAction } from "@/app/actions";
import { requireAuth } from "@/lib/auth";
import { isPrismaSchemaMismatchError } from "@/lib/prisma-errors";
import { canManageCalendar } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditModal } from "@/components/ui/edit-modal";
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
        where: { active: true, role: { in: [Role.TRAINER, Role.GRUPPEN_VERWALTUNG, Role.LEITUNG] } },
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
        where: { active: true, role: { in: [Role.TRAINER, Role.GRUPPEN_VERWALTUNG, Role.LEITUNG] } },
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
            <form action={createCalendarEventAction} className="ipad-stack grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-2 [&>*]:min-w-0">
              <div className="space-y-1">
                <Label htmlFor="title">Titel</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="type">Typ</Label>
                <select id="type" name="type" className="h-10 min-w-0 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="REGATTA">Regatta</option>
                  <option value="VERANSTALTUNG">Veranstaltung</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="startDate">Startdatum</Label>
                <Input id="startDate" name="startDate" type="date" className="w-full" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">Enddatum</Label>
                <Input id="endDate" name="endDate" type="date" className="w-full" required />
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
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {groups.map((group) => (
                    <label key={group.id} className="flex min-w-0 items-center gap-2 rounded-md border border-border p-2 text-sm">
                      <input type="checkbox" name="groupIds" value={group.id} />
                      <span className="break-words">{group.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Teilnehmende Trainer</Label>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {trainers.map((trainer) => (
                    <label key={trainer.id} className="flex min-w-0 items-center gap-2 rounded-md border border-border p-2 text-sm">
                      <input type="checkbox" name="trainerIds" value={trainer.id} />
                      <span className="break-words">{trainer.displayName}</span>
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
            <div key={event.id} className="min-w-0 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="min-w-0 break-words font-semibold">{event.title}</h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{event.type}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {event.startDate.toLocaleDateString("de-DE")} – {event.endDate.toLocaleDateString("de-DE")} | {event.location}
              </p>
              <p className="text-xs text-muted-foreground">
                Gruppen: {event.groups.map((group) => group.name).join(", ") || "Keine ausgewählt"}
              </p>
              <p className="text-xs text-muted-foreground">
                Trainer: {event.trainers.map((trainer) => trainer.displayName).join(", ") || "Keine ausgewählt"}
              </p>
              <p className="mt-1 break-words text-sm">{event.description}</p>
              {session.user.role !== Role.TRAINER ? (
                <div className="mt-3 space-y-3">
                  <EditModal triggerLabel="Bearbeiten" title="Kalendereintrag bearbeiten">
                    <form action={updateCalendarEventAction} className="ipad-stack mt-3 grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-2 [&>*]:min-w-0">
                      <input type="hidden" name="id" value={event.id} />
                      <input type="hidden" name="durationHours" value={event.durationHours.toString()} />

                      <div className="space-y-1">
                        <Label htmlFor={`title-${event.id}`}>Titel</Label>
                        <Input id={`title-${event.id}`} name="title" defaultValue={event.title} required />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`type-${event.id}`}>Typ</Label>
                        <select
                          id={`type-${event.id}`}
                          name="type"
                          defaultValue={event.type}
                          className="h-10 min-w-0 w-full rounded-md border border-border bg-background px-3 text-sm"
                        >
                          <option value="REGATTA">Regatta</option>
                          <option value="VERANSTALTUNG">Veranstaltung</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`startDate-${event.id}`}>Startdatum</Label>
                        <Input
                          id={`startDate-${event.id}`}
                          name="startDate"
                          type="date"
                          defaultValue={event.startDate.toISOString().slice(0, 10)}
                          className="w-full"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`endDate-${event.id}`}>Enddatum</Label>
                        <Input
                          id={`endDate-${event.id}`}
                          name="endDate"
                          type="date"
                          defaultValue={event.endDate.toISOString().slice(0, 10)}
                          className="w-full"
                          required
                        />
                      </div>
                      <div className="space-y-1 lg:col-span-2">
                        <Label htmlFor={`location-${event.id}`}>Ort</Label>
                        <Input id={`location-${event.id}`} name="location" defaultValue={event.location} required />
                      </div>
                      <div className="space-y-1 lg:col-span-2">
                        <Label htmlFor={`description-${event.id}`}>Beschreibung</Label>
                        <Textarea id={`description-${event.id}`} name="description" defaultValue={event.description} required />
                      </div>

                      <div className="space-y-2 lg:col-span-2">
                        <Label>Teilnehmende Trainingsgruppen</Label>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {groups.map((group) => (
                            <label key={`${event.id}-${group.id}`} className="flex min-w-0 items-center gap-2 rounded-md border border-border p-2 text-sm">
                              <input
                                type="checkbox"
                                name="groupIds"
                                value={group.id}
                                defaultChecked={event.groups.some((entry) => entry.id === group.id)}
                              />
                              <span className="break-words">{group.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 lg:col-span-2">
                        <Label>Teilnehmende Trainer</Label>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {trainers.map((trainer) => (
                            <label key={`${event.id}-${trainer.id}`} className="flex min-w-0 items-center gap-2 rounded-md border border-border p-2 text-sm">
                              <input
                                type="checkbox"
                                name="trainerIds"
                                value={trainer.id}
                                defaultChecked={event.trainers.some((entry) => entry.id === trainer.id)}
                              />
                              <span className="break-words">{trainer.displayName}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="lg:col-span-2">
                        <Button size="sm" className="bg-blue-700 text-white hover:bg-blue-600">
                          Änderungen speichern
                        </Button>
                      </div>
                    </form>
                  </EditModal>

                  <form action={deleteCalendarEventAction}>
                    <input type="hidden" name="id" value={event.id} />
                    <Button variant="destructive" size="sm">
                      Löschen
                    </Button>
                  </form>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kalenderansicht</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <div key={`calendar-${event.id}`} className="min-w-0 rounded-lg border border-border bg-accent/20 p-3">
              <p className="text-xs text-muted-foreground">{event.startDate.toLocaleDateString("de-DE")}</p>
              <p className="break-words font-semibold">{event.title}</p>
              <p className="break-words text-sm text-muted-foreground">{event.location}</p>
            </div>
          ))}
          {events.length === 0 ? <p className="text-sm text-muted-foreground">Keine Einträge für die Kalenderansicht.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
