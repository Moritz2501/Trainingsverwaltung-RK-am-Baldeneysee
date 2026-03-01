import Link from "next/link";
import { Role } from "@prisma/client";
import { CalendarDays, Megaphone, Home, Users, UserRound, Layers } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

type SidebarProps = {
  role: Role;
  pathname: string;
  className?: string;
};

const baseItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/groups", label: "Trainingsgruppen", icon: Layers },
  { href: "/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/announcements", label: "Ankündigungen", icon: Megaphone },
  { href: "/profile", label: "Profil", icon: UserRound },
];

export function AppSidebar({ role, pathname, className }: SidebarProps) {
  const items = role === Role.ADMIN ? [...baseItems, { href: "/admin/users", label: "Benutzer", icon: Users }] : baseItems;

  return (
    <aside
      className={cn(
        "h-screen w-72 border-r border-blue-700/60 bg-blue-950/95 p-5 text-white shadow-2xl",
        className,
      )}
    >
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-blue-200">Trainerportal</p>
        <h1 className="text-2xl font-bold">RK Baldeneysee</h1>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 transition hover:bg-blue-700/70",
                isActive ? "bg-blue-700 text-white" : "text-blue-100",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-blue-800 pt-4">
        <ThemeToggle />
        <div className="mt-3">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
