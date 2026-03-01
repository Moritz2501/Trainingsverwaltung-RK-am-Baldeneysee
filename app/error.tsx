"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  void error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-lg rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold">Es ist ein Fehler aufgetreten</h1>
        <p className="mt-2 text-sm text-muted-foreground">Bitte versuche es erneut oder gehe zurück zum Dashboard.</p>
        <div className="mt-4 flex gap-3">
          <Button onClick={reset} className="bg-blue-700 text-white hover:bg-blue-600">
            Erneut versuchen
          </Button>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
