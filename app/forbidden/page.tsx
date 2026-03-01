import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-lg rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold">Kein Zugriff</h1>
        <p className="mt-2 text-muted-foreground">Du hast keine Berechtigung für diesen Bereich.</p>
        <Link href="/dashboard">
          <Button className="mt-6 bg-blue-700 text-white hover:bg-blue-600">Zurück zum Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
