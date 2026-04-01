"use client";

import { FolderKanban, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ProjectHit = { id: string; name: string; color: string };
type TaskHit = { id: string; title: string; projectId: string; project: { name: string } };

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectHit[]>([]);
  const [tasks, setTasks] = useState<TaskHit[]>([]);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setProjects([]);
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) return;
      const data = (await res.json()) as { projects: ProjectHit[]; tasks: TaskHit[] };
      setProjects(data.projects);
      setTasks(data.tasks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void run(q), 200);
    return () => clearTimeout(t);
  }, [q, run]);

  const hasHits = projects.length > 0 || tasks.length > 0;

  return (
    <div className="relative hidden max-w-md flex-1 md:block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search tasks and projects…"
        className="h-9 pl-9"
        aria-label="Global search"
      />
      {open && q.trim().length >= 2 ? (
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-md border bg-popover p-2 text-sm shadow-md",
          )}
        >
          {loading ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">Searching…</p>
          ) : !hasHits ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">No results</p>
          ) : (
            <div className="space-y-2">
              {projects.length > 0 ? (
                <div>
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Projects
                  </p>
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/projects/${p.id}`}
                      className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: p.color }}
                        aria-hidden
                      />
                      <FolderKanban className="size-3.5 opacity-70" />
                      <span className="truncate">{p.name}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
              {tasks.length > 0 ? (
                <div>
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Tasks
                  </p>
                  {tasks.map((t) => (
                    <Link
                      key={t.id}
                      href={`/dashboard/projects/${t.projectId}`}
                      className="block rounded px-2 py-1.5 hover:bg-muted"
                    >
                      <span className="line-clamp-1 font-medium">{t.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {t.project.name}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
