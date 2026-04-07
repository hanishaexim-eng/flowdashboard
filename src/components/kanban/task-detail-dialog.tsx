"use client";

import { TaskPriority, TaskStatus } from "@prisma/client";
import { format } from "date-fns";
import { Loader2, Trash2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
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
import type { AcceptanceCriterion, TaskWithAssignee } from "@/types";
import { parseAcceptanceCriteria, parseTaskLabels } from "@/types";

type MemberRow = {
  userId: string;
  user: { id: string; name: string; email: string; image: string | null };
};

type TransitionRow = {
  id: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  feedback: string;
  issueFaced: string;
  acceptanceNote: string;
  reopenReason: string | null;
  movedAt: string;
  movedBy: { id: string; name: string; email: string };
};

type CommentRow = {
  id: string;
  message: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
};

type ActivityRow = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  user: { name: string; email: string };
};

type Props = {
  projectId: string;
  task: TaskWithAssignee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (task: TaskWithAssignee) => void;
  onDeleted: (taskId: string) => void;
  /** When false, task fields are read-only and Save is hidden. */
  canEditTask?: boolean;
  /** When false, Delete is hidden. */
  canDeleteTask?: boolean;
};

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function datetimeLocalToIso(local: string): string | null {
  if (!local.trim()) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function TaskDetailDialog({
  projectId,
  task,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
  canEditTask = true,
  canDeleteTask = true,
}: Props) {
  const readOnly = !canEditTask;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueLocal, setDueLocal] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<AcceptanceCriterion[]>([]);
  const [newCriterion, setNewCriterion] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [transitions, setTransitions] = useState<TransitionRow[]>([]);
  const [feedback, setFeedback] = useState("");
  const [issueFaced, setIssueFaced] = useState("");
  const [acceptanceNote, setAcceptanceNote] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newComment, setNewComment] = useState("");
  const [activities, setActivities] = useState<ActivityRow[]>([]);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setStatus(task.status);
    setAssigneeId(task.assigneeId);
    setDueLocal(isoToDatetimeLocal(task.dueDate));
    setLabels(parseTaskLabels(task.labels));
    setAcceptanceCriteria(parseAcceptanceCriteria(task.acceptanceCriteria));
    setLabelDraft("");
    setNewCriterion("");
  }, [task]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (!res.ok) return;
      const data = (await res.json()) as { members: MemberRow[] };
      setMembers(data.members);
    })();
  }, [open, projectId]);

  useEffect(() => {
    if (!open || !task) return;
    void (async () => {
      const res = await fetch(`/api/tasks/${task.id}/transitions`);
      if (!res.ok) return;
      const data = (await res.json()) as { transitions: TransitionRow[] };
      setTransitions(data.transitions);
    })();
  }, [open, task]);

  useEffect(() => {
    if (!open || !task) return;
    void (async () => {
      const res = await fetch(`/api/tasks/${task.id}/comments`);
      if (!res.ok) return;
      const data = (await res.json()) as { comments: CommentRow[] };
      setComments(data.comments);
    })();
  }, [open, task]);

  useEffect(() => {
    if (!open || !task) return;
    void (async () => {
      const res = await fetch(`/api/tasks/${task.id}/activity`);
      if (!res.ok) return;
      const data = (await res.json()) as { activities: ActivityRow[] };
      setActivities(data.activities);
    })();
  }, [open, task]);

  const transitionRequired = !!task && task.status !== status;
  const canSubmit = useMemo(
    () =>
      title.trim().length > 0 &&
      (!transitionRequired ||
        (!!feedback.trim() &&
          !!issueFaced.trim() &&
          !!acceptanceNote.trim() &&
          !(task?.status === TaskStatus.DONE && status === TaskStatus.IN_PROGRESS && !reopenReason.trim()))),
    [title, transitionRequired, feedback, issueFaced, acceptanceNote, reopenReason, task, status],
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

  const assigneeSelectLabel = useMemo(() => {
    if (assigneeId === null) return "Unassigned";
    const m = members.find((x) => x.user.id === assigneeId);
    return m ? `${m.user.name} (${m.user.email})` : "Assignee";
  }, [assigneeId, members]);

  function addLabelFromDraft() {
    const t = labelDraft.trim().replace(/^#/, "");
    if (!t || labels.includes(t) || labels.length >= 20) return;
    setLabels((prev) => [...prev, t]);
    setLabelDraft("");
  }

  function toggleCriterion(id: string) {
    setAcceptanceCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    );
  }

  function addCriterion() {
    const t = newCriterion.trim();
    if (!t || acceptanceCriteria.length >= 50) return;
    setAcceptanceCriteria((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: t, done: false },
    ]);
    setNewCriterion("");
  }

  async function handleSave() {
    if (!task || readOnly) return;
    setMessage(null);
    setLoading(true);
    try {
      const dueIso = dueLocal.trim() ? datetimeLocalToIso(dueLocal) : null;
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description,
          priority,
          status,
          assigneeId,
          dueDate: dueIso,
          labels,
          acceptanceCriteria,
          transition:
            task.status !== status
              ? {
                  feedback,
                  issueFaced,
                  acceptanceNote,
                  reopenReason: reopenReason || undefined,
                }
              : undefined,
        }),
      });
      if (!res.ok) {
        setMessage("Could not save task changes.");
        return;
      }
      const data = (await res.json()) as { task: TaskWithAssignee };
      onSaved(data.task);
      setMessage("Task updated.");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!task || !canDeleteTask) return;
    setMessage(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) {
        setMessage("Could not delete task.");
        return;
      }
      onDeleted(task.id);
      setConfirmDeleteOpen(false);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddComment() {
    if (!task || !newComment.trim()) return;
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newComment.trim() }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { comment: CommentRow };
    setComments((prev) => [data.comment, ...prev]);
    setNewComment("");
    const actRes = await fetch(`/api/tasks/${task.id}/activity`);
    if (actRes.ok) {
      const actData = (await actRes.json()) as { activities: ActivityRow[] };
      setActivities(actData.activities);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,calc(100vh-2rem))] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] min-w-0 flex-col overflow-hidden p-3 sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Task details</DialogTitle>
          <DialogDescription>
            Markdown in comments; use @user@example.com to mention teammates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2 pr-1">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Add context, links, acceptance criteria…"
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
                disabled={readOnly}
              >
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
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as TaskStatus)}
                disabled={readOnly}
              >
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
            <Label htmlFor="task-due">Due date</Label>
            <Input
              id="task-due"
              type="datetime-local"
              value={dueLocal}
              onChange={(e) => setDueLocal(e.target.value)}
              disabled={readOnly}
            />
            {dueLocal ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-fit text-xs"
                onClick={() => setDueLocal("")}
                disabled={readOnly}
              >
                Clear due date
              </Button>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-1">
              {labels.map((l) => (
                <span
                  key={l}
                  className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs"
                >
                  {l}
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted"
                    onClick={() => setLabels((prev) => prev.filter((x) => x !== l))}
                    aria-label={`Remove ${l}`}
                    disabled={readOnly}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLabelFromDraft();
                  }
                }}
                placeholder="Add label, press Enter"
                disabled={readOnly}
              />
              <Button type="button" variant="secondary" onClick={addLabelFromDraft} disabled={readOnly}>
                Add
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Acceptance criteria</Label>
            <div className="space-y-2 rounded-md border p-2">
              {acceptanceCriteria.length === 0 ? (
                <p className="text-xs text-muted-foreground">No checklist items yet.</p>
              ) : (
                acceptanceCriteria.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-start gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={c.done}
                      onChange={() => toggleCriterion(c.id)}
                      disabled={readOnly}
                    />
                    <span className={c.done ? "text-muted-foreground line-through" : ""}>
                      {c.text}
                    </span>
                  </label>
                ))
              )}
              <div className="flex gap-2 pt-1">
                <Input
                  value={newCriterion}
                  onChange={(e) => setNewCriterion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCriterion();
                    }
                  }}
                  placeholder="New criterion, Enter to add"
                  disabled={readOnly}
                />
                <Button type="button" variant="secondary" size="sm" onClick={addCriterion} disabled={readOnly}>
                  Add
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Assignee</Label>
            <Select
              value={assigneeId ?? "none"}
              onValueChange={(v) => setAssigneeId(v === "none" ? null : v)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign teammate">{assigneeSelectLabel}</SelectValue>
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
          {task && task.status !== status ? (
            <div className="rounded-md border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Transition notes required for status changes
              </p>
              <div className="grid gap-2">
                <Input
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Feedback"
                  disabled={readOnly}
                />
                <Input
                  value={issueFaced}
                  onChange={(e) => setIssueFaced(e.target.value)}
                  placeholder="Issue faced"
                  disabled={readOnly}
                />
                <Input
                  value={acceptanceNote}
                  onChange={(e) => setAcceptanceNote(e.target.value)}
                  placeholder="Acceptance note"
                  disabled={readOnly}
                />
                {task.status === TaskStatus.DONE && status === TaskStatus.IN_PROGRESS ? (
                  <Input
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    placeholder="Reopen reason"
                    disabled={readOnly}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label>Activity</Label>
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity on this task yet.</p>
            ) : (
              <div className="max-h-36 space-y-2 overflow-auto rounded-md border p-2">
                {activities.map((a) => (
                  <div key={a.id} className="text-xs">
                    <p className="text-muted-foreground">
                      {format(new Date(a.createdAt), "MMM d, HH:mm")} · {a.user.name}
                    </p>
                    <p>{a.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Transition history</Label>
            {transitions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No transitions recorded yet.</p>
            ) : (
              <div className="max-h-44 space-y-2 overflow-auto rounded-md border p-2">
                {transitions.map((t) => (
                  <div key={t.id} className="rounded border bg-muted/30 p-2 text-xs">
                    <p className="font-medium">
                      {t.fromStatus} to {t.toStatus} by {t.movedBy.name}
                    </p>
                    <p>Feedback: {t.feedback}</p>
                    <p>Issue: {t.issueFaced}</p>
                    <p>Acceptance: {t.acceptanceNote}</p>
                    {t.reopenReason ? <p>Reopen: {t.reopenReason}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Comments</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Markdown supported. Mention with @Name user@email.com"
                rows={3}
                className="min-h-[72px] flex-1"
              />
              <Button
                type="button"
                className="shrink-0 self-start"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                Add
              </Button>
            </div>
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            ) : (
              <div className="max-h-52 space-y-3 overflow-auto rounded-md border p-2">
                {comments.map((c) => (
                  <div key={c.id} className="rounded border bg-muted/30 p-2 text-xs">
                    <p className="font-medium">{c.author.name}</p>
                    <div className="space-y-1 text-[13px] leading-relaxed [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_p]:my-0.5 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4">
                      <ReactMarkdown>{c.message}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 border-t pt-4 sm:justify-between">
          {canDeleteTask ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={!task || deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Delete
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {canEditTask ? "Cancel" : "Close"}
            </Button>
            {canEditTask ? (
              <Button type="button" onClick={handleSave} disabled={!canSubmit || loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
        {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      </DialogContent>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
