import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { saveGroupAttendanceAction } from "@/app/actions";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toIsoDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function AttendanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireAuth();
  const { groupId } = await params;
  const { date } = await searchParams;
  const selectedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toIsoDateOnly(new Date());

  const group = await prisma.trainingGroup.findUnique({
    where: { id: groupId },
    include: {
      assignments: true,
      athletes: {
        where: { active: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!group) {
    notFound();
  }

  const canAccess =
    session.user.role === Role.ADMIN ||
    session.user.role === Role.LEITUNG ||
    group.assignments.some((entry) => entry.userId === session.user.id);

  if (!canAccess) {
    notFound();
  }

  const start = new Date(`${selectedDate}T00:00:00.000Z`);
  const end = new Date(`${selectedDate}T23:59:59.999Z`);

  const existingEntries = await prisma.attendanceEntry.findMany({
    where: {
      groupId,
      date: {
        gte: start,
        lte: end,
      },
    },
    select: { athleteId: true, status: true },
  });

  const statusByAthleteId = new Map(existingEntries.map((entry) => [entry.athleteId, entry.status]));
  const presentCount = group.athletes.filter((athlete) => (statusByAthleteId.get(athlete.id) ?? "ABWESEND") === "ANWESEND").length;
  const absentCount = group.athletes.length - presentCount;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">Anwesenheit: {group.name}</h1>
        <BackButton fallbackHref="/attendance" label="Zurück zu Anwesenheit" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datum auswählen</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex flex-col gap-2 md:flex-row md:items-end">
            <div className="w-full space-y-1 md:max-w-xs">
              <Label htmlFor="date">Trainingstag</Label>
              <Input id="date" name="date" type="date" defaultValue={selectedDate} required />
            </div>
            <Button type="submit" variant="outline">
              Laden
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sportler auf anwesend/abwesend setzen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-accent/20 p-3">
              <p className="text-xs text-muted-foreground">Anwesend</p>
              <p className="text-xl font-semibold text-green-400">{presentCount}</p>
            </div>
            <div className="rounded-md border border-border bg-accent/20 p-3">
              <p className="text-xs text-muted-foreground">Abwesend</p>
              <p className="text-xl font-semibold text-red-400">{absentCount}</p>
            </div>
            <div className="rounded-md border border-border bg-accent/20 p-3">
              <p className="text-xs text-muted-foreground">Gesamt</p>
              <p className="text-xl font-semibold">{group.athletes.length}</p>
            </div>
          </div>

          {group.athletes.length === 0 ? <p className="text-sm text-muted-foreground">Keine aktiven Sportler in dieser Gruppe.</p> : null}

          {group.athletes.length > 0 ? (
            <form action={saveGroupAttendanceAction} className="space-y-3">
              <input type="hidden" name="groupId" value={group.id} />
              <input type="hidden" name="date" value={selectedDate} />

              <div className="space-y-2">
                {group.athletes.map((athlete) => {
                  const currentStatus = statusByAthleteId.get(athlete.id) ?? "ABWESEND";
                  return (
                    <div key={athlete.id} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_180px] md:items-center">
                      <div>
                        <p className="font-medium">{athlete.name}</p>
                        <p className="text-xs text-muted-foreground">{athlete.birthDate ? athlete.birthDate.toLocaleDateString("de-DE") : "Geburtsdatum nicht hinterlegt"}</p>
                      </div>
                      <div>
                        <input type="hidden" name="athleteIds" value={athlete.id} />
                        <select
                          name={`status-${athlete.id}`}
                          defaultValue={currentStatus}
                          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                        >
                          <option value="ANWESEND">Anwesend</option>
                          <option value="ABWESEND">Abwesend</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button className="bg-blue-700 text-white hover:bg-blue-600">Anwesenheit speichern</Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
