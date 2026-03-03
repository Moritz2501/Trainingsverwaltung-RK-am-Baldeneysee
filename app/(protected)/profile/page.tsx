import { changeOwnPasswordAction } from "@/app/actions";
import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function ProfilePage() {
  const session = await requireAuth();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Profil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Accountdaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Benutzername:</span> {session.user.username}
          </p>
          <p>
            <span className="text-muted-foreground">Name:</span> {session.user.name}
          </p>
          <p>
            <span className="text-muted-foreground">Rolle:</span> {session.user.role}
          </p>
          <p className="text-xs text-muted-foreground">Der Benutzername kann nur durch ADMIN geändert werden.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Passwort ändern</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={changeOwnPasswordAction} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <Input id="newPassword" name="newPassword" type="password" required minLength={4} />
              <p className="text-xs text-muted-foreground">Mindestens 4 Zeichen.</p>
            </div>
            <Button className="bg-blue-700 text-white hover:bg-blue-600">Passwort speichern</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
