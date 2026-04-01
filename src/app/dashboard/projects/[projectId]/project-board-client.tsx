"use client";

import type { Project } from "@prisma/client";
import { TaskStatus } from "@prisma/client";
import { Download, LayoutList, Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CreateTaskDialog } from "@/components/kanban/create-task-dialog";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskDetailDialog } from "@/components/kanban/task-detail-dialog";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { parseWorkflowConfig } from "@/lib/workflow-policy";
import type { TaskWithAssignee } from "@/types";

type WebhookRow = { id: string; url: string; events: string; active: boolean };
type AutomationRow = { id: string; name: string; trigger: string; action: string };

export function ProjectBoardClient({
  project,
  initialTasks,
  currentUserId,
  hasTaskMove,
  canMoveAnyTask,
  canEditProject,
  canEditTask,
  canDeleteTask,
  canCreateTask,
}: {
  project: Project;
  initialTasks: TaskWithAssignee[];
  currentUserId: string;
  hasTaskMove: boolean;
  canMoveAnyTask: boolean;
  canEditProject: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canCreateTask: boolean;
}) {
  const router = useRouter();
  const [projectState, setProjectState] = useState(project);
  const [tasks, setTasks] = useState<TaskWithAssignee[]>(initialTasks);
  const [selected, setSelected] = useState<TaskWithAssignee | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [color, setColor] = useState(project.color);
  const [workflowStrict, setWorkflowStrict] = useState(project.workflowStrict);
  const [edgeTodoIp, setEdgeTodoIp] = useState(true);
  const [edgeIpDone, setEdgeIpDone] = useState(true);
  const [edgeDoneIp, setEdgeDoneIp] = useState(true);
  const [allowTodoToDoneSkip, setAllowTodoToDoneSkip] = useState(false);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [automations, setAutomations] = useState<AutomationRow[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const [autoName, setAutoName] = useState("Notify owner on Done");
  const [autoTrigger, setAutoTrigger] = useState("to_DONE");
  const [autoAction, setAutoAction] = useState<"notify_owner" | "slack_incoming">("notify_owner");

  const isOwner = projectState.ownerId === currentUserId;

  useEffect(() => {
    if (!editOpen) return;
    const p = parseWorkflowConfig(projectState.workflowConfig ?? "{}");
    setWorkflowStrict(projectState.workflowStrict);
    setAllowTodoToDoneSkip(p.allowTodoToDoneSkip);
    setEdgeTodoIp(p.edges.some((e) => e.from === TaskStatus.TODO && e.to === TaskStatus.IN_PROGRESS));
    setEdgeIpDone(
      p.edges.some((e) => e.from === TaskStatus.IN_PROGRESS && e.to === TaskStatus.DONE),
    );
    setEdgeDoneIp(
      p.edges.some((e) => e.from === TaskStatus.DONE && e.to === TaskStatus.IN_PROGRESS),
    );
    void (async () => {
      const [w, a] = await Promise.all([
        fetch(`/api/projects/${projectState.id}/webhooks`),
        fetch(`/api/projects/${projectState.id}/automations`),
      ]);
      if (w.ok) {
        const d = (await w.json()) as { webhooks: WebhookRow[] };
        setWebhooks(d.webhooks);
      }
      if (a.ok) {
        const d = (await a.json()) as { automations: AutomationRow[] };
        setAutomations(d.automations);
      }
    })();
  }, [editOpen, projectState.workflowConfig, projectState.workflowStrict, projectState.id]);

  async function handleUpdateProject() {
    setSavingProject(true);
    try {
      const edges: { from: TaskStatus; to: TaskStatus }[] = [];
      if (edgeTodoIp) edges.push({ from: TaskStatus.TODO, to: TaskStatus.IN_PROGRESS });
      if (edgeIpDone) edges.push({ from: TaskStatus.IN_PROGRESS, to: TaskStatus.DONE });
      if (edgeDoneIp) edges.push({ from: TaskStatus.DONE, to: TaskStatus.IN_PROGRESS });
      const workflowConfig = JSON.stringify({ edges, allowTodoToDoneSkip });
      const res = await fetch(`/api/projects/${projectState.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          color,
          workflowStrict,
          workflowConfig,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { project: Project };
      setProjectState(data.project);
      setEditOpen(false);
      router.refresh();
    } finally {
      setSavingProject(false);
    }
  }

  async function addWebhook() {
    if (!newWebhookUrl.trim()) return;
    const res = await fetch(`/api/projects/${projectState.id}/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: newWebhookUrl.trim(),
        secret: newWebhookSecret || undefined,
        events: ["task.transitioned"],
      }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { webhook: WebhookRow };
    setWebhooks((prev) => [data.webhook, ...prev]);
    setNewWebhookUrl("");
    setNewWebhookSecret("");
  }

  async function removeWebhook(id: string) {
    const confirmed = window.confirm("Delete this webhook subscription?");
    if (!confirmed) return;
    const res = await fetch(`/api/projects/${projectState.id}/webhooks/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  async function addAutomation() {
    const res = await fetch(`/api/projects/${projectState.id}/automations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: autoName.trim() || "Rule",
        trigger: autoTrigger,
        action: autoAction,
      }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { automation: AutomationRow };
    setAutomations((prev) => [data.automation, ...prev]);
  }

  async function removeAutomation(id: string) {
    const confirmed = window.confirm("Delete this automation rule?");
    if (!confirmed) return;
    const res = await fetch(`/api/projects/${projectState.id}/automations/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setAutomations((prev) => prev.filter((x) => x.id !== id));
  }

  async function handleDeleteProject() {
    const confirmed = window.confirm(
      `Delete project \"${projectState.name}\"? This cannot be undone.`,
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectState.id}`, { method: "DELETE" });
      if (!res.ok) return;
      router.push("/dashboard/projects");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: projectState.color }}
              aria-hidden
            />
            <h2 className="truncate text-xl font-semibold tracking-tight">{projectState.name}</h2>
          </div>
          {projectState.description ? (
            <p className="text-sm text-muted-foreground">{projectState.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreateTask ? (
            <CreateTaskDialog
              projectId={project.id}
              onCreated={(t) => {
                setTasks((prev) => [t, ...prev]);
                setSelected(t);
                setOpen(true);
              }}
            />
          ) : null}
          <Link
            href={`/dashboard/projects/${projectState.id}/list`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <LayoutList className="mr-2 size-4" />
            List
          </Link>
          <a
            href={`/api/export/tasks?projectId=${projectState.id}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Download className="mr-2 size-4" />
            CSV tasks
          </a>
          <a
            href={`/api/export/transitions?projectId=${projectState.id}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Download className="mr-2 size-4" />
            CSV transitions
          </a>
          {canEditProject ? (
            <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 size-4" />
              Edit project
            </Button>
          ) : null}
          {isOwner ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteProject()}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
              Delete
            </Button>
          ) : null}
          <Link
            href={`/dashboard/team?projectId=${projectState.id}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Team
          </Link>
          <Link href="/dashboard/projects" className={cn(buttonVariants())}>
            All projects
          </Link>
        </div>
      </div>

      <KanbanBoard
        projectId={project.id}
        initialTasks={tasks}
        currentUserId={currentUserId}
        hasTaskMove={hasTaskMove}
        canMoveAnyTask={canMoveAnyTask}
        canEditProject={canEditProject}
        canCreateTask={canCreateTask}
        onTaskUpdated={(t) => setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
        onOpenTask={(t) => {
          setSelected(t);
          setOpen(true);
        }}
      />

      <TaskDetailDialog
        projectId={project.id}
        task={selected}
        open={open}
        onOpenChange={setOpen}
        canEditTask={canEditTask}
        canDeleteTask={canDeleteTask}
        onSaved={(t) => setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
        onDeleted={(id) => setTasks((prev) => prev.filter((x) => x.id !== id))}
      />

      <Dialog
        open={editOpen && canEditProject}
        onOpenChange={(o) => {
          if (canEditProject) setEditOpen(o);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Project settings</DialogTitle>
            <DialogDescription>Basics, workflow policy, webhooks, and automations.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basics">
            <TabsList className="w-full">
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>
            <TabsContent value="basics" className="grid gap-3 pt-3">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Name</Label>
                <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-desc">Description</Label>
                <Textarea
                  id="project-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-color">Color</Label>
                <Input id="project-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
            </TabsContent>
            <TabsContent value="workflow" className="grid gap-3 pt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={workflowStrict}
                  onChange={(e) => setWorkflowStrict(e.target.checked)}
                />
                Strict workflow (enforce transition notes)
              </label>
              <p className="text-xs text-muted-foreground">Allowed status moves:</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={edgeTodoIp} onChange={(e) => setEdgeTodoIp(e.target.checked)} />
                Todo → In progress
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={edgeIpDone} onChange={(e) => setEdgeIpDone(e.target.checked)} />
                In progress → Done
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={edgeDoneIp} onChange={(e) => setEdgeDoneIp(e.target.checked)} />
                Done → In progress (reopen)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowTodoToDoneSkip}
                  onChange={(e) => setAllowTodoToDoneSkip(e.target.checked)}
                />
                Allow Todo → Done with manager override (skip column)
              </label>
            </TabsContent>
            <TabsContent value="integrations" className="grid gap-4 pt-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Webhooks (signed with optional secret)</p>
                {webhooks.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs"
                  >
                    <span className="truncate">{w.url}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void removeWebhook(w.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Input
                  placeholder="https://example.com/hook"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                />
                <Input
                  placeholder="Secret (optional)"
                  value={newWebhookSecret}
                  onChange={(e) => setNewWebhookSecret(e.target.value)}
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => void addWebhook()}>
                  Add webhook
                </Button>
              </div>
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Automations (Slack uses SLACK_WEBHOOK_URL or per-rule URL in payload JSON)
                </p>
                {automations.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs"
                  >
                    <span>
                      {r.name} · {r.trigger} → {r.action}
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void removeAutomation(r.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Input value={autoName} onChange={(e) => setAutoName(e.target.value)} />
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={autoTrigger}
                  onChange={(e) => setAutoTrigger(e.target.value)}
                >
                  <option value="to_TODO">When → Todo</option>
                  <option value="to_IN_PROGRESS">When → In progress</option>
                  <option value="to_DONE">When → Done</option>
                  <option value="any_transition">Any transition</option>
                </select>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={autoAction}
                  onChange={(e) => setAutoAction(e.target.value as "notify_owner" | "slack_incoming")}
                >
                  <option value="notify_owner">Notify project owner (in-app)</option>
                  <option value="slack_incoming">Post to Slack webhook</option>
                </select>
                <Button type="button" variant="secondary" size="sm" onClick={() => void addAutomation()}>
                  Add rule
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleUpdateProject()}
              disabled={!name.trim() || savingProject}
            >
              {savingProject ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
