import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/brand-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session?.user?.active) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-950 to-black p-6">
      <Card className="w-full max-w-md border-blue-700/60 bg-blue-950/80 text-white">
        <CardHeader>
          <div className="mb-2 flex justify-center">
            <BrandLogo size={56} className="h-14 w-14" priority />
          </div>
          <CardTitle>Trainerportal – Ruderklub am Baldeneysee</CardTitle>
          <CardDescription className="text-blue-100">Bitte mit Benutzername und Passwort anmelden.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
