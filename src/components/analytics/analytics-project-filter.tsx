"use client";

import { useRouter } from "next/navigation";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Project = { id: string; name: string };

export function AnalyticsProjectFilter({
  projects,
  currentProjectId,
  currentLabel,
}: {
  projects: Project[];
  currentProjectId: string | null;
  currentLabel: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor="analytics-project">Project scope</Label>
        <Select
          value={currentProjectId ?? "all"}
          onValueChange={(v) => {
            if (!v || v === "all") {
              router.push("/dashboard/analytics");
            } else {
              router.push(`/dashboard/analytics?project=${encodeURIComponent(v)}`);
            }
          }}
        >
          <SelectTrigger id="analytics-project" className="w-full sm:w-[280px]">
            <SelectValue placeholder="All projects">{currentLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
