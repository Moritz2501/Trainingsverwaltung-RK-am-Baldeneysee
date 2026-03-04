"use client";

import { useActionState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { firstLoginChangePasswordAction, type FirstLoginPasswordState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: FirstLoginPasswordState = {
  success: false,
  error: null,
};

export function FirstLoginPasswordModal() {
  const [state, formAction, pending] = useActionState(firstLoginChangePasswordAction, initialState);

  useEffect(() => {
    if (state.success) {
      void signOut({ callbackUrl: "/login" });
    }
  }, [state.success]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Passwort ändern erforderlich">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-5 md:p-6">
        <h2 className="text-xl font-semibold">Passwortänderung erforderlich</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Beim ersten Login musst du das temporäre Passwort ändern, bevor du die App nutzen kannst.
        </p>

        <form action={formAction} className="mt-4 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="first-currentPassword">Temporäres Passwort</Label>
            <Input id="first-currentPassword" name="currentPassword" type="password" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="first-newPassword">Neues Passwort</Label>
            <Input id="first-newPassword" name="newPassword" type="password" minLength={4} required />
            <p className="text-xs text-muted-foreground">Mindestens 4 Zeichen.</p>
          </div>

          {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}

          <Button disabled={pending} className="w-full bg-blue-700 text-white hover:bg-blue-600">
            {pending ? "Speichern..." : "Passwort ändern"}
          </Button>
        </form>
      </div>
    </div>
  );
}
