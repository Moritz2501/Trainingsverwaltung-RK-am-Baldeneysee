"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

const logoPath = process.env.NEXT_PUBLIC_BRAND_LOGO_PATH || "/rk-baldeneysee-logo.svg";

export function BrandLogo({ size = 44, className, priority = false }: BrandLogoProps) {
  const fallbackSources = useMemo(() => {
    const sources = [logoPath, "/rk.png", "/rk-baldeneysee-logo.svg"];
    return [...new Set(sources)];
  }, []);
  const [sourceIndex, setSourceIndex] = useState(0);

  return (
    <Image
      src={fallbackSources[sourceIndex]}
      alt="RK Baldeneysee Logo"
      width={size}
      height={size}
      className={cn(className)}
      priority={priority}
      onError={() => {
        setSourceIndex((previous) => {
          if (previous >= fallbackSources.length - 1) {
            return previous;
          }
          return previous + 1;
        });
      }}
    />
  );
}
