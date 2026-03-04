import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaMismatchError } from "@/lib/prisma-errors";
import { requireAuth } from "@/lib/auth";
import { computeCompensationSummary, formatEuro } from "@/lib/compensation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await requireAuth();

  const now = new Date();
  const [announcementCount, groupCount, upcomingEvents, announcements, assignedGroups] = await Promise.all([
    prisma.announcement.count({ where: { archived: false, validFrom: { lte: now } } }),
    prisma.trainingGroup.count({ where: { active: true } }),
    prisma.calendarEvent.findMany({
      where: { endDate: { gte: now } },
      orderBy: { startDate: "asc" },
      take: 5,
      select: { id: true, title: true, type: true, startDate: true, endDate: true, location: true },
    }),
    prisma.announcement.findMany({
      where: { archived: false, validFrom: { lte: now } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.trainingGroup.findMany({
      where: {
        assignments: {
          some: { userId: session.user.id },
        },
      },
      select: { id: true, name: true, description: true, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  let compensationSchemaMismatch = false;
  let ownCompensationData: {
    compensation: { hourlyRate: unknown; totalPaid: unknown; lastPayoutAt: Date | null } | null;
    participatingEvents: Array<{ endDate: Date; durationHours: unknown }>;
  } | null = null;

  try {
    ownCompensationData = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        compensation: {
          select: { hourlyRate: true, totalPaid: true, lastPayoutAt: true },
        },
        participatingEvents: {
          select: { endDate: true, durationHours: true },
        },
      },
    });
  } catch (error) {
    if (!isPrismaSchemaMismatchError(error)) {
      throw error;
    }
    compensationSchemaMismatch = true;
  }

  const compensationSummary = computeCompensationSummary(
    ownCompensationData?.participatingEvents ?? [],
    ownCompensationData?.compensation ?? null,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm font-medium text-muted-foreground">Herzlich Willkommen, {session.user.name ?? session.user.username}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Aktive Ankündigungen</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{announcementCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Aktive Trainingsgruppen</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{groupCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kommende Termine</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{upcomingEvents.length}</CardContent>
        </Card>
      </div>

      {session.user.role === Role.TRAINER || session.user.role === Role.GRUPPEN_VERWALTUNG ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Mein Verdienst (Anzeige)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-md border border-border bg-accent/20 p-3">
                <p className="text-xs text-muted-foreground">Stundensatz</p>
                <p className="text-xl font-semibold">{formatEuro(compensationSummary.hourlyRate)}</p>
              </div>
              <div className="rounded-md border border-border bg-accent/20 p-3">
                <p className="text-xs text-muted-foreground">Gesamt verdient</p>
                <p className="text-xl font-semibold">{formatEuro(compensationSummary.totalEarned)}</p>
              </div>
              <div className="rounded-md border border-border bg-accent/20 p-3">
                <p className="text-xs text-muted-foreground">Seit letzter Auszahlung</p>
                <p className="text-xl font-semibold">{formatEuro(compensationSummary.earnedSincePayout)}</p>
              </div>
              <Link href="/compensation" className="lg:col-span-3">
                <Button variant="outline" size="sm" className="w-full hover:bg-blue-700/20">
                  Zur Abrechnung
                </Button>
              </Link>
              {compensationSchemaMismatch ? (
                <p className="text-xs text-amber-700 dark:text-amber-300 lg:col-span-3">
                  Abrechnung wird nach Datenbank-Migration vollständig angezeigt.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meine zugewiesenen Trainingsgruppen</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {assignedGroups.length === 0 ? <p className="text-sm text-muted-foreground">Keine Gruppen zugewiesen.</p> : null}
              {assignedGroups.map((group) => (
                <div key={group.id} className="rounded-lg border border-border bg-accent/20 p-3">
                  <p className="font-semibold">{group.name}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{group.description}</p>
                  <Link href={`/groups/${group.id}`}>
                    <Button variant="outline" size="sm" className="mt-3 w-full hover:bg-blue-700/20">
                      Gruppe öffnen
                    </Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Nächste Termine</CardTitle>
          <Link href="/calendar">
            <Button variant="outline" size="sm">
              Zum Kalender
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingEvents.length === 0 ? <p className="text-sm text-muted-foreground">Keine kommenden Termine vorhanden.</p> : null}
          {upcomingEvents.map((event) => (
            <div key={event.id} className="rounded-lg border border-border bg-accent/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{event.title}</h3>
                <Badge variant="outline">{event.type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {event.startDate.toLocaleDateString("de-DE")} – {event.endDate.toLocaleDateString("de-DE")}
              </p>
              <p className="text-sm text-muted-foreground">Ort: {event.location}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Ankündigungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {announcements.length === 0 ? <p className="text-muted-foreground">Keine aktiven Ankündigungen.</p> : null}
          {announcements.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-accent/20 p-4">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="font-semibold">{item.title}</h2>
                <Badge>{item.priority}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Gültig ab: {item.validFrom.toLocaleDateString("de-DE")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
