"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type ConfirmSubmitButtonProps = React.ComponentProps<typeof Button> & {
  confirmMessage: string;
};

export function ConfirmSubmitButton({ confirmMessage, onClick, ...props }: ConfirmSubmitButtonProps) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        const accepted = window.confirm(confirmMessage);
        if (!accepted) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
