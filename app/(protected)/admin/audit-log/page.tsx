import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuditLogPage() {
  await requireRole([Role.ADMIN]);

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit-Log</h1>
      <p className="text-sm text-muted-foreground">Zeigt die letzten protokollierten Verwaltungsaktionen.</p>

      <Card>
        <CardHeader>
          <CardTitle>Letzte Einträge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.length === 0 ? <p className="text-sm text-muted-foreground">Noch keine Audit-Einträge vorhanden.</p> : null}
          {logs.map((log) => (
            <div key={log.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{log.action}</p>
                <span className="text-xs text-muted-foreground">{log.createdAt.toLocaleString("de-DE")}</span>
              </div>
              <p className="text-xs text-muted-foreground">Rolle: {log.actorRole} • Actor-ID: {log.actorId}</p>
              <p className="mt-1">{log.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">Ziel: {log.targetType}{log.targetId ? ` (${log.targetId})` : ""}</p>
              {log.metadata ? <pre className="mt-2 overflow-x-auto rounded bg-accent/30 p-2 text-xs">{JSON.stringify(log.metadata, null, 2)}</pre> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
