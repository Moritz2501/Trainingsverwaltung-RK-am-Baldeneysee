import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

const logoPath = process.env.NEXT_PUBLIC_BRAND_LOGO_PATH || "/rk-baldeneysee-logo.svg";

export function BrandLogo({ size = 44, className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src={logoPath}
      alt="RK Baldeneysee Logo"
      width={size}
      height={size}
      className={cn(className)}
      priority={priority}
    />
  );
}
