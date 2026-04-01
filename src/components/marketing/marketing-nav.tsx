"use client";

import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          FlowBoard
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            Sign in
          </Link>
          <Link href="/signup" className={cn(buttonVariants())}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
