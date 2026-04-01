"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn’t load this dashboard view. Try again, or go back to the overview.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" onClick={() => (window.location.href = "/dashboard")}>
          Go to overview
        </Button>
      </div>
    </div>
  );
}
