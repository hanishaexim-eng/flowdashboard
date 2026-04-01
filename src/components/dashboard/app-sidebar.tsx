"use client";

import {
  BarChart3,
  Building2,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, permission: "screen.overview" },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, permission: "screen.projects" },
  { href: "/dashboard/workspace", label: "Workspace", icon: Building2, permission: "screen.workspace" },
  { href: "/dashboard/team", label: "Team", icon: Users, permission: "screen.team" },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, permission: "screen.analytics" },
  { href: "/dashboard/admin", label: "Admin", icon: Shield, permission: "screen.admin" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, permission: "screen.settings" },
] satisfies Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: Permission;
}>;

export function NavLinks({
  onNavigate,
  allowedScreens,
}: {
  onNavigate?: () => void;
  allowedScreens: Permission[];
}) {
  const pathname = usePathname();
  const filteredNav = nav.filter((item) => allowedScreens.includes(item.permission));

  return (
    <nav className="flex flex-col gap-1 px-2">
      {filteredNav.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 opacity-80" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebarDesktop({ allowedScreens }: { allowedScreens: Permission[] }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link
          href="/dashboard"
          className="font-semibold tracking-tight text-sidebar-foreground"
        >
          FlowBoard
        </Link>
      </div>
      <ScrollArea className="h-[calc(100vh-3.5rem)] py-3">
        <NavLinks allowedScreens={allowedScreens} />
      </ScrollArea>
    </aside>
  );
}

export function AppSidebarMobile({ allowedScreens }: { allowedScreens: Permission[] }) {
  const mobileOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <span className="font-semibold tracking-tight text-sidebar-foreground">FlowBoard</span>
        </div>
        <div className="py-3">
          <NavLinks
            onNavigate={() => setMobileNavOpen(false)}
            allowedScreens={allowedScreens}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
