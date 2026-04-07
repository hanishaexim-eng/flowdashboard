"use client";

import { LogOut, PanelLeft, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/lib/button-variants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

function initialsFromName(name: string | null | undefined) {
  if (!name?.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase() || "U";
}

type Props = {
  title: string;
  description?: string;
  userName?: string | null;
  userEmail?: string | null;
};

export function DashboardHeader({
  title,
  description,
  userName,
  userEmail,
}: Props) {
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav);

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full min-w-0 items-center gap-2 border-b border-border/80 bg-app-header px-3 backdrop-blur supports-[backdrop-filter]:bg-app-header/90 sm:gap-3 sm:px-4 lg:px-6">
      <Button
        variant="outline"
        size="icon"
        className="lg:hidden"
        onClick={toggleMobileNav}
        aria-label="Open navigation"
      >
        <PanelLeft className="size-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <GlobalSearch />
      <NotificationBell />
      <ThemeToggle />
      <UserMenu userName={userName} userEmail={userEmail} />
    </header>
  );
}

function UserMenu({
  userName,
  userEmail,
}: {
  userName?: string | null;
  userEmail?: string | null;
}) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "rounded-full",
        )}
        aria-label="Account menu"
      >
        <Avatar className="size-8">
          <AvatarFallback className="text-xs font-medium">
            {initialsFromName(userName ?? userEmail)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-1">
          <div className="text-xs font-medium">{userName ?? "Signed in"}</div>
          {userEmail ? (
            <div className="text-xs font-normal text-muted-foreground">{userEmail}</div>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push("/dashboard/settings")}
        >
          <Settings className="mr-2 size-4" />
          Profile & settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
