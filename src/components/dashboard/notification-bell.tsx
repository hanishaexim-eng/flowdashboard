"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { buttonVariants } from "@/lib/button-variants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const [items, setItems] = useState<Row[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications?limit=25");
    if (!res.ok) return;
    const data = (await res.json()) as { notifications: Row[]; unreadCount: number };
    setItems(data.notifications);
    setUnread(data.unreadCount);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60000);
    return () => clearInterval(id);
  }, [load]);

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, read: true }),
    });
    void load();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "relative",
        )}
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unread > 0 ? (
            <button
              type="button"
              className="text-xs font-normal text-primary hover:underline"
              onClick={() => void markRead(items.filter((i) => !i.readAt).map((i) => i.id))}
            >
              Mark all read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">No notifications yet</p>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn("flex cursor-default flex-col items-start gap-0.5 p-2", !n.readAt && "bg-muted/50")}
              onSelect={(e) => e.preventDefault()}
            >
              {n.link ? (
                <Link
                  href={n.link}
                  className="w-full text-left"
                  onClick={() => {
                    if (!n.readAt) void markRead([n.id]);
                  }}
                >
                  <span className="text-sm font-medium">{n.title}</span>
                  {n.body ? (
                    <span className="block line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                  ) : null}
                </Link>
              ) : (
                <>
                  <span className="text-sm font-medium">{n.title}</span>
                  {n.body ? (
                    <span className="block line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                  ) : null}
                </>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
