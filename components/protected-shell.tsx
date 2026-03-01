"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { Menu, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { BackButton } from "@/components/back-button";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export function ProtectedShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="hidden lg:block">
        <AppSidebar role={role} pathname={pathname} className="fixed left-0 top-0 z-30" />
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            aria-label="Menü schließen"
            onClick={() => setOpen(false)}
          />
          <AppSidebar role={role} pathname={pathname} className="fixed left-0 top-0 z-40 lg:hidden" />
        </>
      ) : null}

      <div className="lg:pl-72">
        <div className="flex items-center justify-between border-b border-border bg-blue-950/80 px-5 py-4 lg:hidden">
          <div className="flex items-center gap-2">
            <BrandLogo size={32} className="h-8 w-8" />
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-blue-200">RK Baldeneysee</p>
              <p className="text-lg font-bold text-white">Trainerportal</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-blue-400/50 text-white hover:bg-blue-600/40"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            Menü
          </Button>
        </div>
        <main className="p-4 lg:p-8">
          <div className="mb-4 flex justify-end">
            <BackButton />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
