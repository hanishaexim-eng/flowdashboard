import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/api-auth";
import { userHasProjectAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ taskId: string }> };

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

  const rows = await prisma.activity.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ activities: rows });
}
