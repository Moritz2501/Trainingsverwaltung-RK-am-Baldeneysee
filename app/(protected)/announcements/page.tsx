import { archiveAnnouncementAction, createAnnouncementAction } from "@/app/actions";
import { requireAuth } from "@/lib/auth";
import { canManageAnnouncements } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function AnnouncementsPage() {
  const session = await requireAuth();
  const canEdit = canManageAnnouncements(session.user.role);

  const announcements = await prisma.announcement.findMany({
    where: canEdit ? undefined : { archived: false },
    orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Ankündigungen</h1>

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Neue Ankündigung</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAnnouncementAction} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="title">Titel</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="body">Text</Label>
                <Textarea id="body" name="body" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="priority">Priorität</Label>
                <select id="priority" name="priority" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="NIEDRIG">NIEDRIG</option>
                  <option value="MITTEL">MITTEL</option>
                  <option value="HOCH">HOCH</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="validFrom">Gültig von</Label>
                <Input id="validFrom" name="validFrom" type="date" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="validTo">Gültig bis</Label>
                <Input id="validTo" name="validTo" type="date" required />
              </div>
              <Button className="bg-blue-700 text-white hover:bg-blue-600 md:col-span-2">Ankündigung speichern</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {announcements.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <span>{item.title}</span>
                <Badge>{item.priority}</Badge>
                {item.archived ? <Badge variant="outline">Archiviert</Badge> : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{item.body}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Gültig: {item.validFrom.toLocaleDateString("de-DE")} – {item.validTo.toLocaleDateString("de-DE")}
              </p>
              {canEdit && !item.archived ? (
                <form action={archiveAnnouncementAction} className="mt-3">
                  <input type="hidden" name="id" value={item.id} />
                  <Button variant="secondary" className="hover:bg-blue-700/20">
                    Archivieren
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
