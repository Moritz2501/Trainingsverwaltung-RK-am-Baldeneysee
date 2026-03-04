import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const isDateInput = type === "date";

  return (
    <input
      type={type}
      className={cn(
        "block h-10 w-full min-w-0 overflow-hidden rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        isDateInput ? "date-input" : null,
        className,
      )}
      {...props}
    />
  );
}

export { Input };
