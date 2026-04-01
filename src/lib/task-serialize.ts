import type { TaskPriority, TaskStatus } from "@prisma/client";

import type { TaskWithAssignee } from "@/types";

type PrismaTaskRow = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  projectId: string;
  assigneeId: string | null;
  dueDate: Date | null;
  labels: string;
  acceptanceCriteria: string;
  createdAt: Date;
  updatedAt: Date;
  assignee: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

export function taskWithAssigneeFromPrisma(t: PrismaTaskRow): TaskWithAssignee {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    position: t.position,
    projectId: t.projectId,
    assigneeId: t.assigneeId,
    dueDate: t.dueDate?.toISOString() ?? null,
    labels: t.labels,
    acceptanceCriteria: t.acceptanceCriteria,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    assignee: t.assignee,
  };
}
