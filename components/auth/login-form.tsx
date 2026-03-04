"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function mapLoginError(error: string | undefined) {
  if (!error) {
    return "Login fehlgeschlagen.";
  }

  if (error.includes("INVALID_PASSWORD") || error.includes("INVALID_USERNAME")) {
    return "Benutzername oder Passwort falsch.";
  }

  if (error.includes("ACCOUNT_INACTIVE")) {
    return "Benutzerkonto ist deaktiviert.";
  }

  if (error.includes("RATE_LIMITED")) {
    return "Zu viele Login-Versuche. Bitte warte kurz.";
  }

  if (error.includes("CredentialsSignin") || error.includes("LOGIN_FAILED")) {
    return "Login fehlgeschlagen.";
  }

  return "Login fehlgeschlagen.";
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(mapLoginError(result.error));
      return;
    }

    if (!result?.ok) {
      setError("Login fehlgeschlagen.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="username">Benutzername</Label>
        <Input id="username" name="username" autoComplete="username" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Passwort</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <Button type="submit" className="w-full bg-blue-700 text-white hover:bg-blue-600" disabled={loading}>
        {loading ? "Anmeldung läuft..." : "Anmelden"}
      </Button>
    </form>
  );
}
