"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full justify-start bg-blue-900/50 text-white hover:bg-blue-700/60"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Abmelden
    </Button>
  );
}
