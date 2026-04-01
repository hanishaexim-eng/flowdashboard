import { TaskPriority, TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/api-auth";
import { getProjectRole, userHasProjectAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { projectId } = await params;
  const allowed = await userHasProjectAccess(gate.userId, projectId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { position: "asc" }],
    include: {
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  return NextResponse.json({ tasks });
}

const criterionSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.union([z.string().datetime(), z.null()]).optional(),
  labels: z.array(z.string().max(40)).max(20).optional(),
  acceptanceCriteria: z.array(criterionSchema).max(50).optional(),
});

export async function POST(req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { projectId } = await params;
  const allowed = await userHasProjectAccess(gate.userId, projectId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const role = await getProjectRole(gate.userId, projectId);
  if (!role || !hasPermission(role, "task.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const status = parsed.data.status ?? TaskStatus.TODO;
  const maxPos = await prisma.task.aggregate({
    where: { projectId, status },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? -1) + 1;

  const due = parsed.data.dueDate;
  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      status,
      priority: parsed.data.priority ?? TaskPriority.MEDIUM,
      position,
      projectId,
      assigneeId: parsed.data.assigneeId ?? null,
      ...(due !== undefined
        ? { dueDate: due === null ? null : new Date(due) }
        : {}),
      ...(parsed.data.labels !== undefined
        ? { labels: JSON.stringify(parsed.data.labels) }
        : {}),
      ...(parsed.data.acceptanceCriteria !== undefined
        ? { acceptanceCriteria: JSON.stringify(parsed.data.acceptanceCriteria) }
        : {}),
    },
    include: {
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  await prisma.activity.create({
    data: {
      projectId,
      taskId: task.id,
      userId: gate.userId,
      type: "task.created",
      message: `Created task “${task.title}”`,
    },
  });

  return NextResponse.json({ task });
}
