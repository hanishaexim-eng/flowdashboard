"use client";

import { TaskPriority, TaskStatus } from "@prisma/client";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TaskWithAssignee } from "@/types";

type ProjectOption = { id: string; name: string };

type MemberRow = {
  userId: string;
  user: { id: string; name: string; email: string; image: string | null };
};

export function CreateTaskFromProjectsDialog({
  projects,
}: {
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!projectId) return;
    void (async () => {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (!res.ok) return;
      const data = (await res.json()) as { members: MemberRow[] };
      setMembers(data.members);
    })();
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setPriority(TaskPriority.MEDIUM);
    setStatus(TaskStatus.TODO);
    setAssigneeId(null);
  }, [open]);

  const canSubmit = useMemo(
    () => projectId.length > 0 && title.trim().length > 0,
    [projectId, title],
  );

  const projectLabel = useMemo(
    () => projects.find((p) => p.id === projectId)?.name ?? "Pick a project",
    [projects, projectId],
  );

  const priorityLabel = useMemo(() => {
    if (priority === TaskPriority.HIGH) return "High";
    if (priority === TaskPriority.MEDIUM) return "Medium";
    return "Low";
  }, [priority]);

  const statusLabel = useMemo(() => {
    if (status === TaskStatus.TODO) return "Todo";
    if (status === TaskStatus.IN_PROGRESS) return "In progress";
    return "Done";
  }, [status]);

  const assigneeLabel = useMemo(() => {
    if (assigneeId === null) return "Unassigned";
    const m = members.find((x) => x.user.id === assigneeId);
    return m ? `${m.user.name} (${m.user.email})` : "Assignee";
  }, [assigneeId, members]);

  async function handleCreate() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description,
          priority,
          status,
          assigneeId,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const data = (await res.json()) as { task: TaskWithAssignee };
      setOpen(false);
      router.push(`/dashboard/projects/${data.task.projectId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const disabled = projects.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)} disabled={disabled}>
        <Plus className="mr-2 size-4" />
        New task
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>Create a task in any project.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={(v) => setProjectId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a project">{projectLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-task-title-global">Title</Label>
            <Input
              id="new-task-title-global"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fix onboarding copy"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-task-desc-global">Description</Label>
            <Textarea
              id="new-task-desc-global"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Optional details…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority">{priorityLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
                  <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status">{statusLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                  <SelectItem value={TaskStatus.IN_PROGRESS}>In progress</SelectItem>
                  <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Assignee</Label>
            <Select
              value={assigneeId ?? "none"}
              onValueChange={(v) => setAssigneeId(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign teammate">{assigneeLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.user.id}>
                    {m.user.name} ({m.user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={!canSubmit || loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

