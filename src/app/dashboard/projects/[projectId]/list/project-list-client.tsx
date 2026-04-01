"use client";

import { TaskStatus } from "@prisma/client";
import { format } from "date-fns";
import { ArrowDownAZ, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import type { TaskWithAssignee } from "@/types";
import { parseTaskLabels } from "@/types";

function statusDisplay(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.TODO:
      return "Todo";
    case TaskStatus.IN_PROGRESS:
      return "In progress";
    case TaskStatus.DONE:
      return "Done";
    default:
      return String(status);
  }
}

function statusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.TODO:
      return "border-status-todo/35 bg-status-todo/10 text-status-todo";
    case TaskStatus.IN_PROGRESS:
      return "border-status-in-progress/35 bg-status-in-progress/10 text-status-in-progress";
    case TaskStatus.DONE:
      return "border-status-done/35 bg-status-done/10 text-status-done";
    default:
      return "border-muted-foreground/25 bg-muted/50 text-muted-foreground";
  }
}

type Member = { userId: string; name: string; email: string };

type SavedFilterRow = { id: string; name: string; query: string };

type SortKey = "title" | "status" | "priority" | "updated" | "due";

export function ProjectListClient({
  projectId,
  projectName,
  initialTasks,
  canEditProject,
  members,
}: {
  projectId: string;
  projectName: string;
  initialTasks: TaskWithAssignee[];
  canEditProject: boolean;
  members: Member[];
}) {
  const [tasks] = useState(initialTasks);
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [assigneeId, setAssigneeId] = useState<string | "all">("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [savedName, setSavedName] = useState("");
  const [savedFilters, setSavedFilters] = useState<SavedFilterRow[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/projects/${projectId}/saved-filters`);
      if (!res.ok) return;
      const data = (await res.json()) as { filters: SavedFilterRow[] };
      setSavedFilters(data.filters);
    })();
  }, [projectId]);

  const statusLabel = useMemo(() => {
    if (status === "all") return "All";
    if (status === TaskStatus.TODO) return "Todo";
    if (status === TaskStatus.IN_PROGRESS) return "In progress";
    if (status === TaskStatus.DONE) return "Done";
    return status;
  }, [status]);

  const assigneeLabel = useMemo(() => {
    if (assigneeId === "all") return "All";
    const m = members.find((x) => x.userId === assigneeId);
    if (m) return m.name;
    const fromTask = tasks.find((t) => t.assigneeId === assigneeId)?.assignee?.name;
    return fromTask ?? "Assignee";
  }, [assigneeId, members, tasks]);

  const sortLabel = useMemo(() => {
    const map: Record<SortKey, string> = {
      updated: "Updated",
      title: "Title",
      status: "Status",
      priority: "Priority",
      due: "Due date",
    };
    return map[sort] ?? sort;
  }, [sort]);

  const filtered = useMemo(() => {
    let rows = [...tasks];
    if (status !== "all") rows = rows.filter((t) => t.status === status);
    if (assigneeId !== "all") rows = rows.filter((t) => t.assigneeId === assigneeId);
    rows.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sort === "title") return a.title.localeCompare(b.title) * dir;
      if (sort === "status") return String(a.status).localeCompare(String(b.status)) * dir;
      if (sort === "priority") return String(a.priority).localeCompare(String(b.priority)) * dir;
      if (sort === "due") {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return (ad - bd) * dir;
      }
      const au = new Date(a.updatedAt ?? 0).getTime();
      const bu = new Date(b.updatedAt ?? 0).getTime();
      return (au - bu) * dir;
    });
    return rows;
  }, [tasks, status, assigneeId, sort, sortDir]);

  async function saveCurrentFilter() {
    const name = savedName.trim();
    if (!name) return;
    const query = JSON.stringify({ view: "list" as const, status, assigneeId, sort, sortDir });
    const res = await fetch(`/api/projects/${projectId}/saved-filters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, query }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { filter: SavedFilterRow };
    setSavedFilters((prev) => [data.filter, ...prev]);
    setSavedName("");
  }

  function applySavedFilter(row: SavedFilterRow) {
    try {
      const q = JSON.parse(row.query) as {
        view?: "list" | "board";
        status?: TaskStatus | "all";
        assigneeId?: string | "all";
        sort?: SortKey;
        sortDir?: "asc" | "desc";
      };
      if (q.view === "board") {
        toast.message("Open the board to use this filter.");
        return;
      }
      if (q.status !== undefined) setStatus(q.status);
      if (q.assigneeId !== undefined) setAssigneeId(q.assigneeId);
      if (q.sort !== undefined) setSort(q.sort);
      if (q.sortDir !== undefined) setSortDir(q.sortDir);
    } catch {
      /* noop */
    }
  }

  async function deleteSavedFilter(id: string) {
    const res = await fetch(`/api/projects/${projectId}/saved-filters/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setSavedFilters((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{projectName}</h2>
          <p className="text-sm text-muted-foreground">List view with filters and sorting.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/projects/${projectId}`} className={cn(buttonVariants({ variant: "outline" }))}>
            Board
          </Link>
          <Link href="/dashboard/projects" className={cn(buttonVariants())}>
            All projects
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
        <div className="grid gap-1">
          <Label className="text-xs">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as TaskStatus | "all")}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status">{statusLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
              <SelectItem value={TaskStatus.IN_PROGRESS}>In progress</SelectItem>
              <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Assignee</Label>
          <Select
            value={assigneeId}
            onValueChange={(v) => setAssigneeId(v ?? "all")}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Assignee">{assigneeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Sort</Label>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort">{sortLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="due">Due date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          aria-label="Toggle sort direction"
        >
          <ArrowDownAZ className="size-4" />
        </Button>
        {canEditProject ? (
          <div className="flex flex-1 flex-wrap items-end gap-2 min-w-[200px]">
            <div className="grid flex-1 gap-1 min-w-0">
              <Label className="text-xs">Save filter</Label>
              <Input
                value={savedName}
                onChange={(e) => setSavedName(e.target.value)}
                placeholder="Name this view"
              />
            </div>
            <Button type="button" variant="secondary" onClick={saveCurrentFilter}>
              Save
            </Button>
          </div>
        ) : null}
      </div>

      {savedFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Saved:</span>
          {savedFilters.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
              <button type="button" className="hover:underline" onClick={() => applySavedFilter(f)}>
                {f.name}
              </button>
              {canEditProject ? (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => void deleteSavedFilter(f.id)}
                  aria-label={`Delete ${f.name}`}
                >
                  <Trash2 className="size-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Priority</th>
              <th className="p-3 font-medium">Assignee</th>
              <th className="p-3 font-medium">Due</th>
              <th className="p-3 font-medium">Labels</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="p-3 font-medium">
                  <Link
                    href={`/dashboard/projects/${projectId}`}
                    className="hover:underline"
                  >
                    {t.title}
                  </Link>
                </td>
                <td className="p-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                      statusBadgeClass(t.status),
                    )}
                  >
                    {statusDisplay(t.status)}
                  </span>
                </td>
                <td className="p-3">{t.priority}</td>
                <td className="p-3">{t.assignee?.name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">
                  {t.dueDate ? format(new Date(t.dueDate), "MMM d, yyyy") : "—"}
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {parseTaskLabels(t.labels).join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No tasks match.</p>
        ) : null}
      </div>
    </div>
  );
}
