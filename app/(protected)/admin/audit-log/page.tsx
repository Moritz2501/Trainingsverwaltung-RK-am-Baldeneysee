import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 50;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function createHref(params: URLSearchParams, page: number) {
  const nextParams = new URLSearchParams(params);
  nextParams.set("page", String(page));
  return `/admin/audit-log?${nextParams.toString()}`;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; role?: string; page?: string }>;
}) {
  await requireRole([Role.ADMIN]);

  const { q, action, role, page } = await searchParams;
  const query = (q ?? "").trim();
  const selectedAction = (action ?? "").trim();
  const rawRole = (role ?? "").trim();
  const selectedRole = Object.values(Role).includes(rawRole as Role) ? (rawRole as Role) : "";
  const currentPage = parsePositiveInt(page, 1);

  const where = {
    ...(selectedAction ? { action: selectedAction } : {}),
    ...(selectedRole ? { actorRole: selectedRole as Role } : {}),
    ...(query
      ? {
          OR: [
            { message: { contains: query, mode: "insensitive" as const } },
            { targetType: { contains: query, mode: "insensitive" as const } },
            { targetId: { contains: query, mode: "insensitive" as const } },
            { actorId: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [totalCount, distinctActions] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (selectedAction) {
    params.set("action", selectedAction);
  }
  if (selectedRole) {
    params.set("role", selectedRole);
  }
  params.set("page", String(safePage));

  const actionOptions = distinctActions.map((entry) => entry.action).filter(Boolean);

  const from = totalCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit-Log</h1>
      <p className="text-sm text-muted-foreground">Zeigt die letzten protokollierten Verwaltungsaktionen.</p>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="q">Suche</Label>
              <Input id="q" name="q" defaultValue={query} placeholder="Nach Nachricht, Zieltyp, Ziel-ID oder Actor-ID" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="action">Aktion</Label>
              <select
                id="action"
                name="action"
                defaultValue={selectedAction}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Alle</option>
                {actionOptions.map((actionOption) => (
                  <option key={actionOption} value={actionOption}>
                    {actionOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="role">Rolle</Label>
              <select
                id="role"
                name="role"
                defaultValue={selectedRole}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Alle</option>
                {Object.values(Role).map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {roleOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 md:col-span-4">
              <Button type="submit" variant="outline">
                Filtern
              </Button>
              <Link href="/admin/audit-log" className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent">
                Zurücksetzen
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Letzte Einträge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Anzeige {from}–{to} von {totalCount} Einträgen
          </p>
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

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 pt-2">
              <Link
                href={createHref(params, Math.max(1, safePage - 1))}
                aria-disabled={safePage <= 1}
                className={`inline-flex h-9 items-center rounded-md border border-border px-3 text-sm ${safePage <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"}`}
              >
                Zurück
              </Link>
              <span className="text-xs text-muted-foreground">
                Seite {safePage} von {totalPages}
              </span>
              <Link
                href={createHref(params, Math.min(totalPages, safePage + 1))}
                aria-disabled={safePage >= totalPages}
                className={`inline-flex h-9 items-center rounded-md border border-border px-3 text-sm ${safePage >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"}`}
              >
                Weiter
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
