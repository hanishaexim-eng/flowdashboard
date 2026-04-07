"use client";

import type { Project } from "@prisma/client";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { CreateTaskFromProjectsDialog } from "@/components/projects/create-task-from-projects-dialog";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProjectRow = Project & {
  _count: { tasks: number; members: number };
};

export function ProjectsView({ initialProjects }: { initialProjects: ProjectRow[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  async function handleCreate() {
    if (!canCreate) return;
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { project: Project };
      setProjects((prev) => [
        {
          ...data.project,
          _count: { tasks: 0, members: 1 },
        },
        ...prev,
      ]);
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/dashboard/projects/${data.project.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Your workspace</h2>
          <p className="text-xs text-muted-foreground">
            Create a project, then open the board to manage tasks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CreateTaskFromProjectsDialog
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <Button type="button" onClick={() => setOpen(true)}>
              <Plus className="mr-2 size-4" />
              New project
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
                <DialogDescription>
                  Projects group tasks, members, and activity in one place.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="p-name">Name</Label>
                  <Input
                    id="p-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Launch v1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="p-desc">Description</Label>
                  <Textarea
                    id="p-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Optional context for your team"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleCreate} disabled={!canCreate || loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardHeader>
            <CardTitle>No projects yet</CardTitle>
            <CardDescription>
              Create your first project to unlock the Kanban board and team tools.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="group border bg-card/60 shadow-sm backdrop-blur transition hover:border-primary/30"
            >
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-block size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color }}
                      aria-hidden
                    />
                    <CardTitle className="truncate text-base">{p.name}</CardTitle>
                  </div>
                </div>
                {p.description ? (
                  <CardDescription className="line-clamp-2">{p.description}</CardDescription>
                ) : (
                  <CardDescription className="text-muted-foreground/70">
                    No description
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {p._count.tasks} tasks · {p._count.members} members
              </CardContent>
              <CardFooter className="justify-between gap-2">
                <Link
                  href={`/dashboard/projects/${p.id}`}
                  className={cn(buttonVariants({ variant: "secondary" }), "w-full justify-center")}
                >
                  Open board
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
