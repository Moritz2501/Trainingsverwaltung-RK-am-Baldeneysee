import { requireAuth } from "@/lib/auth";
import { ProtectedShell } from "@/components/protected-shell";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

  return <ProtectedShell role={session.user.role}>{children}</ProtectedShell>;
}
