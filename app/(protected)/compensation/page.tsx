import { Role } from "@prisma/client";
import { markTrainerPayoutAction, updateTrainerCompensationAction } from "@/app/actions";
import { requireAuth } from "@/lib/auth";
import { computeCompensationSummary, formatEuro } from "@/lib/compensation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function canManageCompensation(role: Role) {
  return role === Role.ADMIN || role === Role.LEITUNG;
}

export default async function CompensationPage() {
  const session = await requireAuth();
  const canManage = canManageCompensation(session.user.role);

  const ownUser = await prisma.user.findUnique({
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

  const ownSummary = computeCompensationSummary(ownUser?.participatingEvents ?? [], ownUser?.compensation ?? null);

  const trainerRows = canManage
    ? await prisma.user.findMany({
        where: { role: { in: [Role.TRAINER, Role.GRUPPEN_VERWALTUNG] }, active: true },
        orderBy: { displayName: "asc" },
        select: {
          id: true,
          displayName: true,
          role: true,
          compensation: {
            select: { hourlyRate: true, totalPaid: true, lastPayoutAt: true },
          },
          participatingEvents: {
            select: { endDate: true, durationHours: true },
          },
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Trainer-Abrechnung (nur Anzeige)</h1>

      <Card>
        <CardHeader>
          <CardTitle>Meine Übersicht</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Stundensatz</p>
            <p className="text-xl font-semibold">{formatEuro(ownSummary.hourlyRate)}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Gesamtstunden</p>
            <p className="text-xl font-semibold">{ownSummary.totalHours.toLocaleString("de-DE")}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Gesamt verdient</p>
            <p className="text-xl font-semibold">{formatEuro(ownSummary.totalEarned)}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Seit letzter Auszahlung</p>
            <p className="text-xl font-semibold">{formatEuro(ownSummary.earnedSincePayout)}</p>
          </div>
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Stundensatz & Auszahlung verwalten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trainerRows.map((trainer) => {
              const summary = computeCompensationSummary(trainer.participatingEvents, trainer.compensation);

              return (
                <div key={trainer.id} className="rounded-lg border border-border p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{trainer.displayName}</p>
                    <p className="text-xs text-muted-foreground">{trainer.role}</p>
                  </div>

                  <div className="mb-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <p className="text-muted-foreground">Gesamt verdient: <span className="text-foreground">{formatEuro(summary.totalEarned)}</span></p>
                    <p className="text-muted-foreground">Seit Auszahlung: <span className="text-foreground">{formatEuro(summary.earnedSincePayout)}</span></p>
                    <p className="text-muted-foreground">Gesamtstunden: <span className="text-foreground">{summary.totalHours.toLocaleString("de-DE")}</span></p>
                    <p className="text-muted-foreground">Zuletzt gezahlt: <span className="text-foreground">{summary.lastPayoutAt ? summary.lastPayoutAt.toLocaleDateString("de-DE") : "Noch nie"}</span></p>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <form action={updateTrainerCompensationAction} className="space-y-2 rounded-md border border-border p-3">
                      <input type="hidden" name="userId" value={trainer.id} />
                      <div className="space-y-1">
                        <Label htmlFor={`hourlyRate-${trainer.id}`}>Stundensatz in EUR</Label>
                        <Input
                          id={`hourlyRate-${trainer.id}`}
                          name="hourlyRate"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={summary.hourlyRate.toFixed(2)}
                          required
                        />
                      </div>
                      <Button className="bg-blue-700 text-white hover:bg-blue-600" size="sm">Stundensatz speichern</Button>
                    </form>

                    <form action={markTrainerPayoutAction} className="rounded-md border border-border p-3">
                      <input type="hidden" name="userId" value={trainer.id} />
                      <p className="mb-2 text-sm text-muted-foreground">
                        Markiert den Betrag seit letzter Auszahlung als ausgezahlt und setzt die Anzeige zurück.
                      </p>
                      <Button variant="secondary" size="sm" className="hover:bg-blue-700/20">
                        Als ausgezahlt markieren
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
