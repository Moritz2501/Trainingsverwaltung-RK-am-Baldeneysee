import Link from "next/link";
import { Role } from "@prisma/client";
import { deleteUserAction, resetUserPasswordAction, updateUserAction } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminUsersPage() {
  const session = await requireRole([Role.ADMIN, Role.LEITUNG]);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Benutzerverwaltung</h1>
        <Link href="/admin/users/new">
          <Button className="bg-blue-700 text-white hover:bg-blue-600">Neuen Benutzer anlegen</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <CardTitle>{user.displayName}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <form action={updateUserAction} className="space-y-3">
                <input type="hidden" name="id" value={user.id} />
                <div className="space-y-1">
                  <Label htmlFor={`username-${user.id}`}>Benutzername</Label>
                  <Input id={`username-${user.id}`} name="username" defaultValue={user.username} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`display-${user.id}`}>Anzeigename</Label>
                  <Input id={`display-${user.id}`} name="displayName" defaultValue={user.displayName} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`role-${user.id}`}>Rolle</Label>
                  <select id={`role-${user.id}`} name="role" defaultValue={user.role} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                    <option value="ADMIN">ADMIN</option>
                    <option value="LEITUNG">LEITUNG</option>
                    <option value="TRAINER">TRAINER</option>
                    <option value="GRUPPEN_VERWALTUNG">GRUPPEN-VERWALTUNG</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={user.active} /> Account aktiv
                </label>
                <Button className="bg-blue-700 text-white hover:bg-blue-600">Benutzer speichern</Button>
              </form>

              <form action={resetUserPasswordAction} className="space-y-3">
                <input type="hidden" name="id" value={user.id} />
                <p className="text-sm text-muted-foreground">Temporäres Passwort setzen (Benutzer muss danach ändern).</p>
                <div className="space-y-1">
                  <Label htmlFor={`reset-${user.id}`}>Neues temporäres Passwort</Label>
                  <Input id={`reset-${user.id}`} name="newPassword" type="text" placeholder="Temp1234!" required minLength={4} />
                  <p className="text-xs text-muted-foreground">Mindestens 4 Zeichen.</p>
                </div>
                <Button variant="secondary" className="hover:bg-blue-700/20">Passwort zurücksetzen</Button>
              </form>

              {user.id !== session.user.id ? (
                <form action={deleteUserAction} className="lg:col-span-2">
                  <input type="hidden" name="id" value={user.id} />
                  <Button variant="destructive" type="submit">
                    Benutzer löschen
                  </Button>
                </form>
              ) : (
                <p className="text-xs text-muted-foreground lg:col-span-2">Aktueller Benutzer kann sich nicht selbst löschen.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
