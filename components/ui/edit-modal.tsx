"use client";

import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EditModalProps = {
  triggerLabel: string;
  title: string;
  children: ReactNode;
  className?: string;
};

export function EditModal({ triggerLabel, title, children, className }: EditModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={title}>
          <div className={cn("relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-border bg-background p-4 md:p-6", className)}>
            <button
              type="button"
              aria-label="Schließen"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-md border border-border px-2 py-0.5 text-base leading-none hover:bg-accent"
            >
              ×
            </button>

            <div className="pt-8">
              <p className="mb-4 text-lg font-semibold">{title}</p>
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
