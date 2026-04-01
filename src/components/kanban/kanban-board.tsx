"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { TaskPriority, TaskStatus, type Task } from "@prisma/client";
import { endOfWeek, isBefore, isWithinInterval, startOfDay, startOfWeek } from "date-fns";
import { FilterX, GripVertical, Lock, Plus, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TaskWithAssignee } from "@/types";
import { parseTaskLabels } from "@/types";

const COLUMNS: { id: TaskStatus; title: string; hint: string }[] = [
  { id: TaskStatus.TODO, title: "Todo", hint: "Backlog" },
  { id: TaskStatus.IN_PROGRESS, title: "In progress", hint: "Active" },
  { id: TaskStatus.DONE, title: "Done", hint: "Shipped" },
];

function statusAccentCssVar(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.TODO:
      return "var(--status-todo)";
    case TaskStatus.IN_PROGRESS:
      return "var(--status-in-progress)";
    case TaskStatus.DONE:
      return "var(--status-done)";
    default:
      return "var(--status-todo)";
  }
}

type DuePreset = "ANY" | "OVERDUE" | "THIS_WEEK" | "NO_DUE";

type BoardSavedQuery = {
  view: "board";
  query: string;
  priorityFilter: "ALL" | TaskPriority;
  assigneeFilter: "ALL" | "UNASSIGNED" | string;
  selectedLabels: string[];
  duePreset: DuePreset;
};

type SavedFilterRow = { id: string; name: string; query: string };

function colDroppableId(status: TaskStatus) {
  return `col-${status}`;
}

function priorityLabel(p: TaskPriority) {
  switch (p) {
    case TaskPriority.HIGH:
      return "High";
    case TaskPriority.MEDIUM:
      return "Medium";
    default:
      return "Low";
  }
}

function priorityVariant(p: TaskPriority): "default" | "secondary" | "destructive" | "outline" {
  switch (p) {
    case TaskPriority.HIGH:
      return "destructive";
    case TaskPriority.MEDIUM:
      return "default";
    default:
      return "secondary";
  }
}

function taskCanBeDragged(
  task: TaskWithAssignee,
  currentUserId: string,
  hasTaskMove: boolean,
  canMoveAnyTask: boolean,
): boolean {
  if (!hasTaskMove) return false;
  if (canMoveAnyTask) return true;
  if (task.assigneeId === null) return true;
  return task.assigneeId === currentUserId;
}

function dueMatchesPreset(task: TaskWithAssignee, preset: DuePreset): boolean {
  if (preset === "ANY") return true;
  const due = task.dueDate ? new Date(task.dueDate) : null;
  if (preset === "NO_DUE") return due === null;
  if (!due) return false;
  const now = new Date();
  if (preset === "OVERDUE") {
    return isBefore(due, startOfDay(now));
  }
  if (preset === "THIS_WEEK") {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return isWithinInterval(due, { start, end });
  }
  return true;
}

function DraggableTask({
  task,
  onOpen,
  canDrag,
}: {
  task: TaskWithAssignee;
  onOpen: () => void;
  canDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", status: task.status },
    disabled: !canDrag,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const hint =
    !canDrag && task.assignee
      ? `Assigned to ${task.assignee.name} — you can’t move this task`
      : !canDrag
        ? "You can’t move this task"
        : undefined;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
      <Card
        title={hint}
        className={cn(
          "group border bg-card/90 p-3 shadow-sm backdrop-blur transition-all duration-200",
          canDrag
            ? "cursor-grab hover:-translate-y-px hover:border-primary/35 hover:shadow-md active:cursor-grabbing"
            : "cursor-default opacity-90",
        )}
        style={{
          borderColor: canDrag ? undefined : "color-mix(in srgb, var(--muted-foreground) 25%, transparent)",
        }}
      >
        <div className="flex items-start gap-2">
          {canDrag ? (
            <button
              type="button"
              className="mt-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Drag handle"
              onClick={(e) => e.stopPropagation()}
              {...listeners}
              {...attributes}
            >
              <GripVertical className="size-4" />
            </button>
          ) : (
            <span className="mt-0.5 text-muted-foreground" title={hint}>
              <Lock className="size-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="line-clamp-2 text-sm font-medium leading-snug">{task.title}</p>
              <Badge variant={priorityVariant(task.priority)} className="text-[10px]">
                {priorityLabel(task.priority)}
              </Badge>
            </div>
            {task.assignee ? (
              <p className="text-xs text-muted-foreground">{task.assignee.name}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Unassigned</p>
            )}
            <button
              type="button"
              onClick={onOpen}
              className="text-xs font-medium text-primary hover:underline"
            >
              Open details
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DroppableColumn({
  status,
  title,
  hint,
  count,
  accentColor,
  children,
}: {
  status: TaskStatus;
  title: string;
  hint: string;
  count: number;
  accentColor: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: colDroppableId(status),
    data: { type: "column", status },
  });

  return (
    <div
      className="flex min-h-[420px] min-w-[260px] flex-1 flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-muted/40 to-muted/15 shadow-sm"
      style={{
        borderColor: `color-mix(in srgb, ${accentColor} 22%, transparent)`,
      }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-2 shrink-0 rounded-full"
              style={{ backgroundColor: accentColor }}
              aria-hidden
            />
            <p className="text-sm font-semibold tracking-tight">{title}</p>
            <span className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground ring-1 ring-border/60">
              {count}
            </span>
          </div>
          <p className="mt-0.5 pl-4 text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[360px] flex-1 rounded-b-2xl p-2 transition-colors",
          isOver && "bg-primary/[0.06] ring-1 ring-primary/25",
        )}
      >
        <ScrollArea className="h-[360px] pr-2">{children}</ScrollArea>
      </div>
    </div>
  );
}

type Props = {
  projectId: string;
  initialTasks: TaskWithAssignee[];
  currentUserId: string;
  hasTaskMove: boolean;
  canMoveAnyTask: boolean;
  canEditProject: boolean;
  canCreateTask: boolean;
  onTaskUpdated?: (task: TaskWithAssignee) => void;
  onOpenTask: (task: TaskWithAssignee) => void;
};

const DEFAULT_FILTERS = {
  query: "",
  priorityFilter: "ALL" as const,
  assigneeFilter: "ALL" as const,
  selectedLabels: [] as string[],
  duePreset: "ANY" as DuePreset,
};

export function KanbanBoard({
  projectId,
  initialTasks,
  currentUserId,
  hasTaskMove,
  canMoveAnyTask,
  canEditProject,
  canCreateTask,
  onTaskUpdated,
  onOpenTask,
}: Props) {
  const [tasks, setTasks] = useState<TaskWithAssignee[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | TaskPriority>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<"ALL" | "UNASSIGNED" | string>("ALL");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [duePreset, setDuePreset] = useState<DuePreset>("ANY");
  const [quickAddOpen, setQuickAddOpen] = useState<TaskStatus | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [issueFaced, setIssueFaced] = useState("");
  const [acceptanceNote, setAcceptanceNote] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [pendingTransition, setPendingTransition] = useState<{
    taskId: string;
    from: TaskStatus;
    to: TaskStatus;
    position: number;
  } | null>(null);
  const [savedName, setSavedName] = useState("");
  const [savedFilters, setSavedFilters] = useState<SavedFilterRow[]>([]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/projects/${projectId}/saved-filters`);
      if (!res.ok) return;
      const data = (await res.json()) as { filters: SavedFilterRow[] };
      setSavedFilters(data.filters);
    })();
  }, [projectId]);

  const labelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      for (const l of parseTaskLabels(t.labels)) {
        if (l.trim()) set.add(l.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const hasActiveFilters = useMemo(() => {
    return (
      query.trim() !== "" ||
      priorityFilter !== "ALL" ||
      assigneeFilter !== "ALL" ||
      selectedLabels.length > 0 ||
      duePreset !== "ANY"
    );
  }, [query, priorityFilter, assigneeFilter, selectedLabels, duePreset]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !(t.description ?? "").toLowerCase().includes(q)) {
          return false;
        }
      }
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (assigneeFilter === "UNASSIGNED" && t.assigneeId !== null) return false;
      if (assigneeFilter !== "ALL" && assigneeFilter !== "UNASSIGNED" && t.assigneeId !== assigneeFilter) {
        return false;
      }
      if (selectedLabels.length > 0) {
        const taskLabels = new Set(parseTaskLabels(t.labels));
        const any = selectedLabels.some((l) => taskLabels.has(l));
        if (!any) return false;
      }
      if (!dueMatchesPreset(t, duePreset)) return false;
      return true;
    });
  }, [tasks, query, priorityFilter, assigneeFilter, selectedLabels, duePreset]);

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, TaskWithAssignee[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.DONE]: [],
    };
    for (const t of filteredTasks) {
      map[t.status].push(t);
    }
    for (const k of Object.keys(map) as TaskStatus[]) {
      map[k].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [filteredTasks]);

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeId) ?? null,
    [activeId, tasks],
  );

  const patchTask = useCallback(
    async (
      taskId: string,
      body: Partial<Pick<Task, "status" | "position" | "title" | "priority" | "assigneeId">> & {
        transition?: {
          feedback: string;
          issueFaced: string;
          acceptanceNote: string;
          reopenReason?: string;
          overrideApplied?: boolean;
        };
      },
    ) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let payload: { error?: string; code?: string; task?: TaskWithAssignee } = {};
      try {
        payload = (await res.json()) as typeof payload;
      } catch {
        /* noop */
      }
      if (!res.ok) {
        if (res.status === 403 && payload.code === "MOVE_NOT_ALLOWED_ASSIGNEE") {
          toast.error("You can only move tasks assigned to you.");
        } else if (res.status === 403 && payload.code === "FORBIDDEN_MOVE") {
          toast.error("You don’t have permission to move tasks.");
        } else {
          toast.error(payload.error ?? "Could not update task.");
        }
        throw new Error("patch_failed");
      }
      const task = payload.task;
      if (!task) throw new Error("patch_failed");
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      onTaskUpdated?.(task);
      return task;
    },
    [onTaskUpdated],
  );

  const createTask = useCallback(
    async (status: TaskStatus, title: string) => {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status }),
      });
      if (!res.ok) {
        toast.error("Could not create task.");
        throw new Error("create_failed");
      }
      const data = (await res.json()) as { task: TaskWithAssignee };
      setTasks((prev) => [data.task, ...prev]);
      return data.task;
    },
    [projectId],
  );

  function clearAllFilters() {
    setQuery(DEFAULT_FILTERS.query);
    setPriorityFilter(DEFAULT_FILTERS.priorityFilter);
    setAssigneeFilter(DEFAULT_FILTERS.assigneeFilter);
    setSelectedLabels(DEFAULT_FILTERS.selectedLabels);
    setDuePreset(DEFAULT_FILTERS.duePreset);
  }

  async function saveCurrentBoardFilter() {
    const name = savedName.trim();
    if (!name) return;
    const q: BoardSavedQuery = {
      view: "board",
      query,
      priorityFilter,
      assigneeFilter,
      selectedLabels,
      duePreset,
    };
    const res = await fetch(`/api/projects/${projectId}/saved-filters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, query: JSON.stringify(q) }),
    });
    if (!res.ok) {
      toast.error("Could not save filter.");
      return;
    }
    const data = (await res.json()) as { filter: SavedFilterRow };
    setSavedFilters((prev) => [data.filter, ...prev]);
    setSavedName("");
    toast.success("Filter saved.");
  }

  function applySavedBoardFilter(row: SavedFilterRow) {
    try {
      const q = JSON.parse(row.query) as Record<string, unknown>;
      if (q.view === "list") {
        toast.message("This filter is for list view — open List to apply it.");
        return;
      }
      const isBoardShape =
        q.view === "board" ||
        typeof q.priorityFilter === "string" ||
        typeof q.duePreset === "string" ||
        Array.isArray(q.selectedLabels);
      if (!isBoardShape && q.sort !== undefined) {
        toast.message("This filter is for list view — open List to apply it.");
        return;
      }
      setQuery(typeof q.query === "string" ? q.query : "");
      const pf = q.priorityFilter;
      setPriorityFilter(
        pf === "HIGH" || pf === "MEDIUM" || pf === "LOW" ? pf : "ALL",
      );
      const af = q.assigneeFilter;
      setAssigneeFilter(
        af === "ALL" || af === "UNASSIGNED" || typeof af === "string" ? af : "ALL",
      );
      setSelectedLabels(Array.isArray(q.selectedLabels) ? q.selectedLabels.filter((x) => typeof x === "string") : []);
      const dp = q.duePreset;
      setDuePreset(
        dp === "OVERDUE" || dp === "THIS_WEEK" || dp === "NO_DUE" || dp === "ANY"
          ? dp
          : "ANY",
      );
      toast.success(`Applied “${row.name}”.`);
    } catch {
      toast.error("Invalid saved filter.");
    }
  }

  async function deleteSavedFilter(id: string) {
    const res = await fetch(`/api/projects/${projectId}/saved-filters/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setSavedFilters((prev) => prev.filter((x) => x.id !== id));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (!taskCanBeDragged(task, currentUserId, hasTaskMove, canMoveAnyTask)) {
      toast.error("You can only move tasks assigned to you.");
      return;
    }

    let nextStatus: TaskStatus | null = null;

    const overId = String(over.id);
    if (overId.startsWith("col-")) {
      nextStatus = overId.replace("col-", "") as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      nextStatus = overTask?.status ?? null;
    }

    if (!nextStatus) return;

    const overTask = overId.startsWith("col-") ? null : tasks.find((t) => t.id === overId);

    if (nextStatus === task.status) {
      if (!overTask || overTask.id === task.id) return;
      const siblings = tasks
        .filter((t) => t.projectId === projectId && t.status === nextStatus)
        .sort((a, b) => a.position - b.position);
      const fromIdx = siblings.findIndex((t) => t.id === task.id);
      const toIdx = siblings.findIndex((t) => t.id === overTask.id);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
      const next = [...siblings];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      const updatedPosition = toIdx;
      const reordered = next.map((t, idx) => ({ ...t, position: idx }));
      setTasks((prev) =>
        prev.map((t) => {
          const inCol = reordered.find((x) => x.id === t.id);
          return inCol ?? t;
        }),
      );
      try {
        await patchTask(taskId, { position: updatedPosition });
      } catch {
        setTasks(initialTasks);
      }
      return;
    }

    const siblings = tasks
      .filter((t) => t.projectId === projectId && t.status === nextStatus && t.id !== task.id)
      .sort((a, b) => a.position - b.position);
    const position = siblings.length;

    setPendingTransition({ taskId, from: task.status, to: nextStatus, position });
    setTransitionOpen(true);
  };

  const assigneeFilterLabel = useMemo(() => {
    if (assigneeFilter === "ALL") return "All assignees";
    if (assigneeFilter === "UNASSIGNED") return "Unassigned";
    const map = new Map(
      tasks.filter((t) => t.assignee).map((t) => [t.assignee!.id, t.assignee!.name]),
    );
    return map.get(assigneeFilter) ?? "Assignee";
  }, [assigneeFilter, tasks]);

  const priorityFilterLabel = useMemo(() => {
    if (priorityFilter === "ALL") return "All priorities";
    if (priorityFilter === TaskPriority.HIGH) return "High";
    if (priorityFilter === TaskPriority.MEDIUM) return "Medium";
    return "Low";
  }, [priorityFilter]);

  const duePresetLabel = useMemo(() => {
    switch (duePreset) {
      case "ANY":
        return "Any due";
      case "OVERDUE":
        return "Overdue";
      case "THIS_WEEK":
        return "Due this week";
      case "NO_DUE":
        return "No due date";
      default:
        return "Due";
    }
  }, [duePreset]);

  const myTasksActive = assigneeFilter === currentUserId;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              className="min-w-[200px] flex-1"
            />
            <Button
              type="button"
              variant={myTasksActive ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setAssigneeFilter((prev) => (prev === currentUserId ? "ALL" : currentUserId))
              }
            >
              My tasks
            </Button>
            {hasActiveFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearAllFilters}>
                <FilterX className="mr-1 size-4" />
                Clear filters
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid min-w-[140px] gap-1">
              <Label className="text-[11px] text-muted-foreground">Priority</Label>
              <Select
                value={priorityFilter}
                onValueChange={(v) => setPriorityFilter(v as "ALL" | TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priority">{priorityFilterLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All priorities</SelectItem>
                  <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
                  <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-[160px] gap-1">
              <Label className="text-[11px] text-muted-foreground">Assignee</Label>
              <Select
                value={assigneeFilter}
                onValueChange={(v) => setAssigneeFilter(v as "ALL" | "UNASSIGNED" | string)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assignee">{assigneeFilterLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All assignees</SelectItem>
                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                  {Array.from(
                    new Map(
                      tasks
                        .filter((t) => t.assignee)
                        .map((t) => [t.assignee!.id, t.assignee!.name]),
                    ).entries(),
                  ).map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-[140px] gap-1">
              <Label className="text-[11px] text-muted-foreground">Due</Label>
              <Select value={duePreset} onValueChange={(v) => setDuePreset(v as DuePreset)}>
                <SelectTrigger>
                  <SelectValue placeholder="Due">{duePresetLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Any due</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="THIS_WEEK">Due this week</SelectItem>
                  <SelectItem value="NO_DUE">No due date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-[140px] gap-1">
              <Label className="text-[11px] text-muted-foreground">Labels</Label>
              <Popover>
                <PopoverTrigger>
                  <Button type="button" variant="outline" className="w-full justify-start font-normal">
                    {selectedLabels.length ? `${selectedLabels.length} selected` : "All labels"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <p className="mb-2 text-xs text-muted-foreground">Match any selected label</p>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {labelOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No labels on tasks yet.</p>
                    ) : (
                      labelOptions.map((label) => (
                        <label key={label} className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="size-4 rounded border border-input accent-primary"
                            checked={selectedLabels.includes(label)}
                            onChange={(e) => {
                              const c = e.target.checked;
                              setSelectedLabels((prev) =>
                                c ? [...prev, label] : prev.filter((x) => x !== label),
                              );
                            }}
                          />
                          <span className="truncate">{label}</span>
                        </label>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            {canEditProject ? (
              <>
                <Input
                  value={savedName}
                  onChange={(e) => setSavedName(e.target.value)}
                  placeholder="Save filter as…"
                  className="max-w-xs"
                />
                <Button type="button" size="sm" variant="secondary" onClick={saveCurrentBoardFilter}>
                  <Save className="mr-1 size-4" />
                  Save
                </Button>
              </>
            ) : null}
            {savedFilters.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-muted-foreground">Saved:</span>
                {savedFilters.map((row) => {
                  try {
                    const q = JSON.parse(row.query) as { view?: string };
                    if (q.view === "list") {
                      return (
                        <Button
                          key={row.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          title="List view filter"
                          onClick={() =>
                            toast.message("Open List view to apply this filter.")
                          }
                        >
                          {row.name} (list)
                        </Button>
                      );
                    }
                  } catch {
                    /* fall through */
                  }
                  return (
                    <span key={row.id} className="inline-flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => applySavedBoardFilter(row)}
                      >
                        {row.name}
                      </Button>
                      {canEditProject ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-1 text-muted-foreground"
                          aria-label={`Delete ${row.name}`}
                          onClick={() => void deleteSavedFilter(row.id)}
                        >
                          ×
                        </Button>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = grouped[col.id];
          const count = colTasks.length;
          return (
            <DroppableColumn
              key={col.id}
              status={col.id}
              title={col.title}
              hint={col.hint}
              count={count}
              accentColor={statusAccentCssVar(col.id)}
            >
              {canCreateTask ? (
                <div className="mb-2">
                  {quickAddOpen === col.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder={`New ${col.title.toLowerCase()} task`}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          if (!quickTitle.trim()) return;
                          try {
                            await createTask(col.id, quickTitle.trim());
                            setQuickTitle("");
                            setQuickAddOpen(null);
                          } catch {
                            /* toast in createTask */
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => setQuickAddOpen(col.id)}>
                      <Plus className="mr-2 size-3" />
                      Quick add
                    </Button>
                  )}
                </div>
              ) : null}
              {count === 0 ? (
                <div className="rounded-lg border border-dashed border-border/80 bg-background/40 px-3 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {hasActiveFilters ? "No tasks match your filters." : "No tasks yet."}
                  </p>
                  {hasActiveFilters ? (
                    <Button type="button" variant="link" size="sm" className="mt-1" onClick={clearAllFilters}>
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col gap-2 pb-4">
                  {colTasks.map((task) => (
                    <DraggableTask
                      key={task.id}
                      task={task}
                      canDrag={taskCanBeDragged(task, currentUserId, hasTaskMove, canMoveAnyTask)}
                      onOpen={() => onOpenTask(task)}
                    />
                  ))}
                </div>
              )}
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <Card
            className="w-[280px] border bg-card/95 p-3 shadow-xl ring-2 ring-primary/20"
            style={{
              borderColor: `color-mix(in srgb, ${statusAccentCssVar(activeTask.status)} 40%, transparent)`,
            }}
          >
            <p className="text-sm font-medium">{activeTask.title}</p>
            <p className="text-xs text-muted-foreground">Moving…</p>
          </Card>
        ) : null}
      </DragOverlay>

      <Dialog open={transitionOpen} onOpenChange={setTransitionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record transition</DialogTitle>
            <DialogDescription>
              Every status move must include feedback, issue faced, and acceptance note.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label htmlFor="transition-feedback">Feedback</Label>
              <Input
                id="transition-feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What changed in this move?"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="transition-issue">Issue faced</Label>
              <Input
                id="transition-issue"
                value={issueFaced}
                onChange={(e) => setIssueFaced(e.target.value)}
                placeholder="Any blocker or challenge?"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="transition-acceptance">Acceptance note</Label>
              <Input
                id="transition-acceptance"
                value={acceptanceNote}
                onChange={(e) => setAcceptanceNote(e.target.value)}
                placeholder="Why is this phase accepted?"
              />
            </div>
            {pendingTransition?.from === TaskStatus.DONE &&
            pendingTransition?.to === TaskStatus.IN_PROGRESS ? (
              <div className="grid gap-1">
                <Label htmlFor="transition-reopen">Reopen reason</Label>
                <Input
                  id="transition-reopen"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Why is this task reopening?"
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTransitionOpen(false);
                setPendingTransition(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!pendingTransition) return;
                try {
                  await patchTask(pendingTransition.taskId, {
                    status: pendingTransition.to,
                    position: pendingTransition.position,
                    transition: {
                      feedback,
                      issueFaced,
                      acceptanceNote,
                      reopenReason: reopenReason || undefined,
                    },
                  });
                  setFeedback("");
                  setIssueFaced("");
                  setAcceptanceNote("");
                  setReopenReason("");
                  setPendingTransition(null);
                  setTransitionOpen(false);
                } catch {
                  setTasks(initialTasks);
                }
              }}
              disabled={!feedback.trim() || !issueFaced.trim() || !acceptanceNote.trim()}
            >
              Confirm move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
