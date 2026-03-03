import { Role } from "@prisma/client";
import { createUserAction } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function NewUserPage() {
  await requireRole([Role.ADMIN]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">Neuen Benutzer anlegen</h1>
        <BackButton fallbackHref="/admin/users" label="Zurück zur Benutzerverwaltung" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Accountdaten</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="username">Benutzername</Label>
              <Input id="username" name="username" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="displayName">Anzeigename</Label>
              <Input id="displayName" name="displayName" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">Rolle</Label>
              <select id="role" name="role" defaultValue="TRAINER" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                <option value="ADMIN">ADMIN</option>
                <option value="LEITUNG">LEITUNG</option>
                <option value="TRAINER">TRAINER</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Temporäres Passwort</Label>
              <Input id="password" name="password" type="text" required minLength={4} />
              <p className="text-xs text-muted-foreground">Mindestens 4 Zeichen.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked /> Account aktiv
            </label>
            <Button className="bg-blue-700 text-white hover:bg-blue-600">Benutzer erstellen</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
