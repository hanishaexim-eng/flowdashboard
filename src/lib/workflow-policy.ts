import { TaskStatus } from "@prisma/client";

export type WorkflowEdge = { from: TaskStatus; to: TaskStatus };

export type WorkflowPolicy = {
  edges: WorkflowEdge[];
  allowTodoToDoneSkip: boolean;
};

const DEFAULT_EDGES: WorkflowEdge[] = [
  { from: TaskStatus.TODO, to: TaskStatus.IN_PROGRESS },
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.DONE },
  { from: TaskStatus.DONE, to: TaskStatus.IN_PROGRESS },
];

function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === "string" && (Object.values(TaskStatus) as string[]).includes(v);
}

function parseEdge(x: unknown): WorkflowEdge | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (!isTaskStatus(o.from) || !isTaskStatus(o.to)) return null;
  return { from: o.from, to: o.to };
}

export function parseWorkflowConfig(raw: string): WorkflowPolicy {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const parsed = Array.isArray(j.edges)
      ? j.edges.map(parseEdge).filter((e): e is WorkflowEdge => e !== null)
      : [];
    const edges = parsed.length ? parsed : DEFAULT_EDGES;
    const allowTodoToDoneSkip =
      typeof j.allowTodoToDoneSkip === "boolean" ? j.allowTodoToDoneSkip : false;
    return { edges, allowTodoToDoneSkip };
  } catch {
    return { edges: DEFAULT_EDGES, allowTodoToDoneSkip: false };
  }
}

export function isTransitionAllowedByConfig(
  policy: WorkflowPolicy,
  from: TaskStatus,
  to: TaskStatus,
  overrideApplied: boolean | undefined,
): boolean {
  if (from === to) return true;
  if (policy.edges.some((e) => e.from === from && e.to === to)) return true;
  return (
    from === TaskStatus.TODO &&
    to === TaskStatus.DONE &&
    policy.allowTodoToDoneSkip &&
    !!overrideApplied
  );
}
