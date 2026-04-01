import type { TaskPriority, TaskStatus } from "@prisma/client";

export type { TaskPriority, TaskStatus };

export type AcceptanceCriterion = { id: string; text: string; done: boolean };

export type TaskWithAssignee = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  projectId: string;
  assigneeId: string | null;
  dueDate: string | null;
  labels: string;
  acceptanceCriteria: string;
  createdAt?: string;
  updatedAt?: string;
  assignee: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

export function parseTaskLabels(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function parseAcceptanceCriteria(raw: string | undefined): AcceptanceCriterion[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (x): x is AcceptanceCriterion =>
          !!x &&
          typeof x === "object" &&
          "id" in x &&
          "text" in x &&
          "done" in x &&
          typeof (x as AcceptanceCriterion).id === "string" &&
          typeof (x as AcceptanceCriterion).text === "string" &&
          typeof (x as AcceptanceCriterion).done === "boolean",
      )
      .map((x) => ({ id: x.id, text: x.text, done: x.done }));
  } catch {
    return [];
  }
}
