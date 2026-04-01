import { TaskPriority, TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/api-auth";
import { getProjectRole, userHasProjectAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { createNotification } from "@/lib/notify";
import { runPostTransitionHooks } from "@/lib/post-transition";
import { prisma } from "@/lib/prisma";
import { isTransitionAllowedByConfig, parseWorkflowConfig } from "@/lib/workflow-policy";

type Params = { params: Promise<{ taskId: string }> };

const criterionSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
});

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
  dueDate: z.union([z.string().datetime(), z.null()]).optional(),
  labels: z.array(z.string().max(40)).max(20).optional(),
  acceptanceCriteria: z.array(criterionSchema).max(50).optional(),
  transition: z
    .object({
      feedback: z.string().min(3),
      issueFaced: z.string().min(3),
      acceptanceNote: z.string().min(3),
      reopenReason: z.string().min(3).optional(),
      overrideApplied: z.boolean().optional(),
      metadata: z.string().optional(),
    })
    .optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { taskId } = await params;
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      title: true,
      status: true,
      position: true,
      assigneeId: true,
      project: { select: { workflowConfig: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await userHasProjectAccess(gate.userId, existing.projectId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const role = await getProjectRole(gate.userId, existing.projectId);
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const statusChanging =
    parsed.data.status !== undefined && parsed.data.status !== existing.status;
  const positionChanging =
    parsed.data.position !== undefined && parsed.data.position !== existing.position;
  const isMoveAttempt = statusChanging || positionChanging;

  if (isMoveAttempt) {
    if (!hasPermission(role, "task.move")) {
      return NextResponse.json(
        { error: "Forbidden to move tasks", code: "FORBIDDEN_MOVE" },
        { status: 403 },
      );
    }
    // OWNER/ADMIN/MANAGER may move any task; others only their own. Unassigned tasks: anyone with task.move.
    const canMoveAnyTask = role === "OWNER" || role === "ADMIN" || role === "MANAGER";
    const canMoveThisTask =
      canMoveAnyTask ||
      existing.assigneeId === null ||
      existing.assigneeId === gate.userId;
    if (!canMoveThisTask) {
      return NextResponse.json(
        {
          error: "You can only move tasks assigned to you.",
          code: "MOVE_NOT_ALLOWED_ASSIGNEE",
        },
        { status: 403 },
      );
    }
  }

  if (statusChanging) {
    if (!parsed.data.transition) {
      return NextResponse.json(
        { error: "Transition details are required for status changes." },
        { status: 400 },
      );
    }
    const from = existing.status;
    const to = parsed.data.status!;
    const policy = parseWorkflowConfig(existing.project?.workflowConfig ?? "{}");
    const allowedTransition = isTransitionAllowedByConfig(
      policy,
      from,
      to,
      parsed.data.transition?.overrideApplied,
    );

    if (!allowedTransition) {
      return NextResponse.json({ error: "Transition not allowed by policy." }, { status: 400 });
    }
    const isReopen = from === TaskStatus.DONE && to === TaskStatus.IN_PROGRESS;
    const usedOverrideSkip =
      from === TaskStatus.TODO &&
      to === TaskStatus.DONE &&
      !!parsed.data.transition?.overrideApplied &&
      !policy.edges.some(
        (e) => e.from === TaskStatus.TODO && e.to === TaskStatus.DONE,
      );
    if (usedOverrideSkip && !hasPermission(role, "workflow.override")) {
      return NextResponse.json({ error: "Only manager/admin can skip phases." }, { status: 403 });
    }
    if (isReopen && !hasPermission(role, "task.reopen")) {
      return NextResponse.json({ error: "Only manager/admin can reopen done tasks." }, { status: 403 });
    }
    if (isReopen && !parsed.data.transition.reopenReason) {
      return NextResponse.json({ error: "Reopen reason is required." }, { status: 400 });
    }
  }

  const hasContentEdit =
    parsed.data.title !== undefined ||
    parsed.data.description !== undefined ||
    parsed.data.priority !== undefined ||
    parsed.data.assigneeId !== undefined ||
    parsed.data.dueDate !== undefined ||
    parsed.data.labels !== undefined ||
    parsed.data.acceptanceCriteria !== undefined;

  if (hasContentEdit && !hasPermission(role, "task.edit")) {
    return NextResponse.json({ error: "Forbidden to edit tasks" }, { status: 403 });
  }

  const { transition, dueDate, labels, acceptanceCriteria, ...rest } = parsed.data;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...rest,
      ...(dueDate !== undefined
        ? { dueDate: dueDate === null ? null : new Date(dueDate) }
        : {}),
      ...(labels !== undefined ? { labels: JSON.stringify(labels) } : {}),
      ...(acceptanceCriteria !== undefined
        ? { acceptanceCriteria: JSON.stringify(acceptanceCriteria) }
        : {}),
    },
    include: {
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  if (parsed.data.assigneeId !== undefined && parsed.data.assigneeId !== existing.assigneeId) {
    const nextAssigneeId = parsed.data.assigneeId;
    if (nextAssigneeId) {
      await createNotification({
        userId: nextAssigneeId,
        type: "task.assigned",
        title: "You were assigned a task",
        body: task.title,
        link: `/dashboard/projects/${task.projectId}`,
      });
    }
    await prisma.activity.create({
      data: {
        projectId: task.projectId,
        taskId: task.id,
        userId: gate.userId,
        type: "task.assignee_changed",
        message: `Assignee updated on “${task.title}”`,
      },
    });
  }

  const statusChanged =
    parsed.data.status !== undefined && parsed.data.status !== existing.status;

  if (statusChanged) {
    await prisma.taskTransition.create({
      data: {
        taskId: existing.id,
        projectId: existing.projectId,
        fromStatus: existing.status,
        toStatus: parsed.data.status!,
        movedById: gate.userId,
        feedback: transition?.feedback ?? "status update",
        issueFaced: transition?.issueFaced ?? "n/a",
        acceptanceNote: transition?.acceptanceNote ?? "n/a",
        reopenReason: transition?.reopenReason ?? null,
        overrideApplied: transition?.overrideApplied ?? false,
        metadata: transition?.metadata ?? "{}",
      },
    });
    await prisma.activity.create({
      data: {
        projectId: task.projectId,
        taskId: task.id,
        userId: gate.userId,
        type: "task.transitioned",
        message: `Moved “${task.title}” from ${existing.status} to ${parsed.data.status!}`,
      },
    });
    void runPostTransitionHooks({
      projectId: existing.projectId,
      taskId: task.id,
      taskTitle: task.title,
      fromStatus: existing.status,
      toStatus: parsed.data.status!,
    });
  } else if (
    parsed.data.title ||
    parsed.data.description ||
    parsed.data.priority ||
    parsed.data.dueDate !== undefined ||
    parsed.data.labels !== undefined ||
    parsed.data.acceptanceCriteria !== undefined
  ) {
    await prisma.activity.create({
      data: {
        projectId: task.projectId,
        taskId: task.id,
        userId: gate.userId,
        type: "task.updated",
        message: `Updated “${task.title}”`,
      },
    });
  }

  return NextResponse.json({ task });
}

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { taskId } = await params;
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true, title: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await userHasProjectAccess(gate.userId, existing.projectId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = await getProjectRole(gate.userId, existing.projectId);
  if (!role || !hasPermission(role, "task.delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id: taskId } });

  await prisma.activity.create({
    data: {
      projectId: existing.projectId,
      userId: gate.userId,
      type: "task.deleted",
      message: `Deleted task “${existing.title}”`,
    },
  });

  return NextResponse.json({ ok: true });
}
