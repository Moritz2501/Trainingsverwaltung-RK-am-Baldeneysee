import { redirect } from "next/navigation";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session?.user?.active) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-blue-950 to-black" />
      <Card className="w-full max-w-md border-blue-700/60 bg-blue-950/80 text-white">
        <CardHeader>
          <div className="mb-2 flex justify-center">
            <Image src="/rk.png" alt="RK Baldeneysee Logo" width={56} height={56} className="h-14 w-14" priority />
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
