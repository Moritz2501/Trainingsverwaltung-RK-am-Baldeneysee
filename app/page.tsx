import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getAuthSession();
  if (session?.user?.active) {
    redirect("/dashboard");
  }
  redirect("/login");
}
