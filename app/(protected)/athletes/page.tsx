import Link from "next/link";
import { createAthleteAction, deleteAthleteAction, updateAthleteAction } from "@/app/actions";
import { requireAuth } from "@/lib/auth";
import { canManageAthletes, canMoveAthletes } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AthletesDatabasePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAuth();
  if (!canManageAthletes(session.user.role)) {
    return null;
  }

  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const canMoveBetweenGroups = canMoveAthletes(session.user.role);

  const groups = await prisma.trainingGroup.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const athletes = await prisma.athlete.findMany({
    include: { group: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const filteredAthletes = query ? athletes.filter((athlete) => athlete.name.toLowerCase().includes(query)) : athletes;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Sportlerdatenbank</h1>

      <Card>
        <CardHeader>
          <CardTitle>Sportler anlegen</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAthleteAction} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="birthDate">Geburtsdatum</Label>
              <Input id="birthDate" name="birthDate" type="date" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="groupId">Trainingsgruppe zuweisen</Label>
              <select id="groupId" name="groupId" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" required>
                <option value="">Gruppe wählen</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="active" defaultChecked /> Aktiv
            </label>
            <Button className="bg-blue-700 text-white hover:bg-blue-600 md:col-span-2">Sportler speichern</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alle Sportler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" className="flex flex-col gap-2 md:flex-row md:items-end">
            <div className="w-full space-y-1 md:max-w-md">
              <Label htmlFor="q">Sportler suchen</Label>
              <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Name eingeben..." />
            </div>
            <button type="submit" className="h-10 rounded-md border border-border px-4 text-sm hover:bg-accent/40">
              Suchen
            </button>
          </form>

          {filteredAthletes.length === 0 ? <p className="text-sm text-muted-foreground">Keine Sportler gefunden.</p> : null}

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-accent/30 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Geburtsdatum</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Trainingsgruppe</th>
                  <th className="px-3 py-2 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredAthletes.map((athlete) => (
                  <tr key={athlete.id} className="border-t border-border">
                    <td className="px-3 py-2" colSpan={5}>
                      <form action={updateAthleteAction} className="grid gap-2 md:grid-cols-5">
                        <input type="hidden" name="id" value={athlete.id} />
                        <input type="hidden" name="groupId" value={athlete.groupId} />
                        <Input name="name" defaultValue={athlete.name} required />
                        <Input
                          type="date"
                          name="birthDate"
                          defaultValue={athlete.birthDate ? athlete.birthDate.toISOString().slice(0, 10) : ""}
                          required
                        />
                        <div className="flex items-center">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="active" defaultChecked={athlete.active} /> Aktiv
                          </label>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          {athlete.group.name}
                          {canMoveBetweenGroups ? <span className="ml-2 text-xs text-blue-300">(Verschiebung über Gruppenansicht)</span> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button size="sm" className="bg-blue-700 text-white hover:bg-blue-600">
                            Speichern
                          </Button>
                        </div>
                      </form>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <form action={deleteAthleteAction}>
                          <input type="hidden" name="id" value={athlete.id} />
                          <input type="hidden" name="groupId" value={athlete.groupId} />
                          <Button type="submit" variant="destructive" size="sm">
                            Löschen
                          </Button>
                        </form>
                        <Link href={`/groups/${athlete.groupId}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                          Zur Gruppe
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
