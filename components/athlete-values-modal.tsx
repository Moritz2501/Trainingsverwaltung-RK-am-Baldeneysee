"use client";

import { useState, useTransition } from "react";
import { createAthletePerformanceValueAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AthleteValuesModalProps = {
  athleteId: string;
  athleteName: string;
};

type Step = 1 | 2 | 3;

const DISTANCES = [
  { value: "M100", label: "100m" },
  { value: "M500", label: "500m" },
  { value: "M1000", label: "1000m" },
  { value: "M2000", label: "2000m" },
] as const;

export function AthleteValuesModal({ athleteId, athleteName }: AthleteValuesModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [distance, setDistance] = useState("");
  const [strokeRate, setStrokeRate] = useState("");
  const [totalTime, setTotalTime] = useState("");
  const [splitPer500, setSplitPer500] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canGoStep2 = distance.length > 0;
  const canGoStep3 = strokeRate !== "" && Number(strokeRate) > 0;
  const canSubmit = totalTime.trim().length > 0 && splitPer500.trim().length > 0;

  const stepLabel = step === 1 ? "Schritt 1 von 3" : step === 2 ? "Schritt 2 von 3" : "Schritt 3 von 3";

  function resetModal() {
    setStep(1);
    setDistance("");
    setStrokeRate("");
    setTotalTime("");
    setSplitPer500("");
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("athleteId", athleteId);
    formData.set("distance", distance);
    formData.set("strokeRate", strokeRate);
    formData.set("totalTime", totalTime);
    formData.set("splitPer500", splitPer500);

    startTransition(async () => {
      try {
        await createAthletePerformanceValueAction(formData);
        setOpen(false);
        resetModal();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unbekannter Fehler beim Speichern.");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Werte eintragen
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Werte eintragen">
          <div className="relative w-full max-w-xl rounded-lg border border-border bg-background p-5">
            <button
              type="button"
              aria-label="Schließen"
              onClick={() => {
                setOpen(false);
                resetModal();
              }}
              className="absolute right-3 top-3 rounded-md border border-border px-2 py-0.5 text-base leading-none hover:bg-accent"
            >
              ×
            </button>

            <div className="space-y-4 pr-8">
              <div>
                <p className="text-lg font-semibold">Werte für {athleteName}</p>
                <p className="text-sm text-muted-foreground">{stepLabel}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {step === 1 ? (
                  <div className="space-y-2">
                    <Label htmlFor={`distance-${athleteId}`}>Strecke auswählen</Label>
                    <select
                      id={`distance-${athleteId}`}
                      value={distance}
                      onChange={(event) => setDistance(event.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    >
                      <option value="">Bitte wählen</option>
                      {DISTANCES.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : step === 2 ? (
                  <div className="space-y-2">
                    <Label htmlFor={`strokeRate-${athleteId}`}>Schlagzahl (Rudern)</Label>
                    <Input
                      id={`strokeRate-${athleteId}`}
                      type="number"
                      min={1}
                      max={200}
                      step={1}
                      value={strokeRate}
                      onChange={(event) => setStrokeRate(event.target.value)}
                      placeholder="z. B. 28"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`totalTime-${athleteId}`}>Gesamtzeit</Label>
                      <Input
                        id={`totalTime-${athleteId}`}
                        type="text"
                        value={totalTime}
                        onChange={(event) => setTotalTime(event.target.value)}
                        placeholder="z. B. 7:25.30 oder 445.3"
                      />
                      <p className="text-xs text-muted-foreground">Format: ss, mm:ss oder hh:mm:ss (z. B. 445 oder 7:25.30)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`split-${athleteId}`}>Schnitt / 500m (in Sekunden)</Label>
                      <Input
                        id={`split-${athleteId}`}
                        type="number"
                        min={0}
                        step="any"
                        value={splitPer500}
                        onChange={(event) => setSplitPer500(event.target.value)}
                        placeholder="z. B. 111.2"
                      />
                    </div>
                  </div>
                )}

                {error ? <p className="rounded-md bg-destructive/10 p-2 text-sm text-red-500">{error}</p> : null}

                <div className="flex flex-wrap gap-2 pt-2">
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={() => setStep((current) => (current === 3 ? 2 : 1) as Step)}>
                      Zurück
                    </Button>
                  ) : null}

                  {step === 1 ? (
                    <Button type="button" className="bg-blue-700 text-white hover:bg-blue-600" onClick={() => setStep(2)} disabled={!canGoStep2}>
                      Weiter
                    </Button>
                  ) : step === 2 ? (
                    <Button type="button" className="bg-blue-700 text-white hover:bg-blue-600" onClick={() => setStep(3)} disabled={!canGoStep3}>
                      Weiter
                    </Button>
                  ) : (
                    <Button type="submit" className="bg-blue-700 text-white hover:bg-blue-600" disabled={!canSubmit || isPending}>
                      {isPending ? "Speichere…" : "Speichern"}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
