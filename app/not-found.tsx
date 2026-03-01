import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-lg rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="text-2xl font-semibold">Seite nicht gefunden</h1>
        <p className="mt-2 text-sm text-muted-foreground">Die gewünschte Seite existiert nicht oder wurde verschoben.</p>
        <Link href="/dashboard">
          <Button className="mt-4 bg-blue-700 text-white hover:bg-blue-600">Zum Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
