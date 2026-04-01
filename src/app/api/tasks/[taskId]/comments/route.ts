import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/api-auth";
import { userHasProjectAccess } from "@/lib/access";
import { createNotification, parseEmailMentions } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ taskId: string }> };

const commentSchema = z.object({
  message: z.string().min(1).max(2000),
});

export async function GET(_req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { taskId } = await params;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed = await userHasProjectAccess(gate.userId, task.projectId);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json({ comments });
}

export async function POST(req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { taskId } = await params;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true, title: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed = await userHasProjectAccess(gate.userId, task.projectId);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = commentSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const message = parsed.data.message.trim();
  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      projectId: task.projectId,
      authorId: gate.userId,
      message,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.activity.create({
    data: {
      projectId: task.projectId,
      taskId,
      userId: gate.userId,
      type: "task.comment",
      message: `Comment on “${task.title}”`,
    },
  });

  const emails = parseEmailMentions(message);
  if (emails.length > 0) {
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true },
    });
    const author = await prisma.user.findUnique({
      where: { id: gate.userId },
      select: { name: true },
    });
    for (const u of users) {
      if (u.id === gate.userId) continue;
      await createNotification({
        userId: u.id,
        type: "mention",
        title: `${author?.name ?? "Someone"} mentioned you`,
        body: task.title,
        link: `/dashboard/projects/${task.projectId}`,
      });
    }
  }

  return NextResponse.json({ comment });
}

