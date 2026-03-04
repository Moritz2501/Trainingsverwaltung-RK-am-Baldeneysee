import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { createAttendanceListAction, deleteAttendanceListAction, finalizeAttendanceListAction, updateAttendanceListAction } from "@/app/actions";
import { requireAuth } from "@/lib/auth";
import { canManageFinalizedAttendance } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EditModal } from "@/components/ui/edit-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toIsoDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatBirthDate(date: Date | null) {
  if (!date) {
    return "Geburtsdatum nicht hinterlegt";
  }
  return new Intl.DateTimeFormat("de-DE", { timeZone: "UTC" }).format(date);
}

export default async function AttendanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ date?: string; listId?: string }>;
}) {
  const session = await requireAuth();
  const { groupId } = await params;
  const { date, listId } = await searchParams;
  const selectedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toIsoDateOnly(new Date());

  const group = await prisma.trainingGroup.findUnique({
    where: { id: groupId },
    include: {
      assignments: true,
      athletes: {
        where: { active: true },
        orderBy: { name: "asc" },
      },
      attendanceLists: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: { items: true },
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

  const selectedList = listId
    ? group.attendanceLists.find((entry) => entry.id === listId) ?? null
    : group.attendanceLists.find((entry) => toIsoDateOnly(entry.date) === selectedDate && !entry.isFinalized) ?? null;
  const openLists = group.attendanceLists.filter((entry) => !entry.isFinalized);
  const finalizedLists = group.attendanceLists.filter((entry) => entry.isFinalized);

  const statusByAthleteId = new Map(selectedList?.items.map((item) => [item.athleteId, item.status]) ?? []);
  const canEditFinalized = canManageFinalizedAttendance(session.user.role);

  const presentCount = group.athletes.filter((athlete) => (statusByAthleteId.get(athlete.id) ?? "ABWESEND") === "ANWESEND").length;
  const totalCount = group.athletes.length;
  const absentCount = totalCount - presentCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">Anwesenheit: {group.name}</h1>
        <BackButton fallbackHref="/attendance" label="Zurück zu Anwesenheit" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Neue Anwesenheitsliste starten</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAttendanceListAction} className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4 [&>*]:min-w-0">
            <input type="hidden" name="groupId" value={group.id} />
            <div className="space-y-1">
              <Label htmlFor="date">Trainingstag</Label>
              <Input id="date" name="date" type="date" className="w-full" defaultValue={selectedDate} required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="title">Titel</Label>
              <Input id="title" name="title" placeholder="z. B. Wassertraining Dienstag" required />
            </div>
            <div className="md:col-span-3">
              <Button className="bg-blue-700 text-white hover:bg-blue-600">Liste erstellen</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verlauf / Archiv</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {group.attendanceLists.length === 0 ? <p className="text-sm text-muted-foreground">Noch keine Anwesenheitslisten vorhanden.</p> : null}
          {openLists.length > 0 ? (
            <details className="rounded-md border border-border p-2" open>
              <summary className="cursor-pointer select-none text-sm font-medium">Offene Listen ({openLists.length})</summary>
              <div className="mt-2 space-y-2">
                {openLists.map((entry) => {
                  const isCurrent = selectedList?.id === entry.id;
                  return (
                    <Link
                      key={entry.id}
                      href={`/attendance/${group.id}?listId=${entry.id}`}
                      className={`block rounded-md border p-3 text-sm ${isCurrent ? "border-blue-500 bg-blue-500/10" : "border-border"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 break-words font-medium">{entry.title}</p>
                        <span className="text-xs text-yellow-400">Offen</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{entry.date.toLocaleDateString("de-DE")}</p>
                    </Link>
                  );
                })}
              </div>
            </details>
          ) : null}

          {finalizedLists.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Finalisierte Listen ({finalizedLists.length})</p>
              {finalizedLists.map((entry) => {
                const isCurrent = selectedList?.id === entry.id;
                return (
                  <Link
                    key={entry.id}
                    href={`/attendance/${group.id}?listId=${entry.id}`}
                    className={`block rounded-md border p-3 text-sm ${isCurrent ? "border-blue-500 bg-blue-500/10" : "border-border"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-medium">{entry.title}</p>
                      <span className="text-xs text-green-400">Finalisiert</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.date.toLocaleDateString("de-DE")}</p>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedList ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedList.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 lg:grid-cols-3">
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
                <p className="text-xl font-semibold">{totalCount}</p>
              </div>
            </div>

            {group.athletes.length === 0 ? <p className="text-sm text-muted-foreground">Keine aktiven Sportler in dieser Gruppe.</p> : null}

            {group.athletes.length > 0 ? (
              !selectedList.isFinalized || canEditFinalized ? (
                <EditModal triggerLabel="Bearbeiten" title="Anwesenheitsliste bearbeiten">
                  <form action={updateAttendanceListAction} className="space-y-3">
                    <input type="hidden" name="listId" value={selectedList.id} />
                    <div className="space-y-2">
                      {group.athletes.map((athlete) => {
                        const currentStatus = statusByAthleteId.get(athlete.id) ?? "ABWESEND";
                        return (
                          <div key={athlete.id} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_auto] md:items-center [&>*]:min-w-0">
                            <div>
                              <p className="font-medium">{athlete.name}</p>
                              <p className="text-xs text-muted-foreground">{formatBirthDate(athlete.birthDate)}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <input type="hidden" name="athleteIds" value={athlete.id} />
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={`status-${athlete.id}`}
                                  value="ANWESEND"
                                  defaultChecked={currentStatus === "ANWESEND"}
                                  disabled={selectedList.isFinalized && !canEditFinalized}
                                />
                                Anwesend
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={`status-${athlete.id}`}
                                  value="ABWESEND"
                                  defaultChecked={currentStatus === "ABWESEND"}
                                  disabled={selectedList.isFinalized && !canEditFinalized}
                                />
                                Abwesend
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button className="bg-blue-700 text-white hover:bg-blue-600">Liste speichern</Button>
                    </div>
                  </form>
                </EditModal>
              ) : (
                <p className="text-sm text-muted-foreground">Diese Liste ist finalisiert und kann nicht mehr bearbeitet werden.</p>
              )
            ) : null}

            {!selectedList.isFinalized ? (
              <div className="flex flex-wrap gap-2">
                <form action={finalizeAttendanceListAction}>
                  <input type="hidden" name="listId" value={selectedList.id} />
                  <Button variant="secondary" className="hover:bg-blue-700/20">
                    Liste finalisieren
                  </Button>
                </form>
                {canEditFinalized ? (
                  <form action={deleteAttendanceListAction}>
                    <input type="hidden" name="listId" value={selectedList.id} />
                    <ConfirmSubmitButton variant="destructive" confirmMessage="Diese Anwesenheitsliste wirklich komplett löschen?">
                      Anwesenheit löschen
                    </ConfirmSubmitButton>
                  </form>
                ) : null}
              </div>
            ) : canEditFinalized ? (
              <form action={deleteAttendanceListAction}>
                <input type="hidden" name="listId" value={selectedList.id} />
                <ConfirmSubmitButton variant="destructive" confirmMessage="Diese Anwesenheitsliste wirklich komplett löschen?">
                  Anwesenheit löschen
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Noch keine offene Liste für den gewählten Tag. Erstelle oben eine neue Liste.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
