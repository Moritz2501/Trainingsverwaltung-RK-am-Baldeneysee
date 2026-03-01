import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  await requireAuth();

  const now = new Date();
  const [announcementCount, groupCount, upcomingEvents, announcements] = await Promise.all([
    prisma.announcement.count({ where: { archived: false, validTo: { gte: now } } }),
    prisma.trainingGroup.count({ where: { active: true } }),
    prisma.calendarEvent.findMany({ where: { endDate: { gte: now } }, orderBy: { startDate: "asc" }, take: 5 }),
    prisma.announcement.findMany({
      where: { archived: false, validFrom: { lte: now }, validTo: { gte: now } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

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
                Gültig: {item.validFrom.toLocaleDateString("de-DE")} – {item.validTo.toLocaleDateString("de-DE")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
