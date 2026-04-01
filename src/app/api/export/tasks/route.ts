import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

function csvEscape(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");

  const userId = gate.userId;
  const projectWhere = projectId
    ? {
        id: projectId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      }
    : {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      };

  const tasks = await prisma.task.findMany({
    where: { project: projectWhere },
    orderBy: [{ projectId: "asc" }, { status: "asc" }, { position: "asc" }],
    include: {
      project: { select: { name: true } },
      assignee: { select: { email: true, name: true } },
    },
  });

  const headers = [
    "project",
    "task_id",
    "title",
    "status",
    "priority",
    "assignee_email",
    "due_date",
    "labels",
    "created_at",
    "updated_at",
  ];
  const lines = [headers.join(",")];
  for (const t of tasks) {
    let labels = "[]";
    try {
      labels = t.labels || "[]";
    } catch {
      labels = "[]";
    }
    lines.push(
      [
        csvEscape(t.project.name),
        csvEscape(t.id),
        csvEscape(t.title),
        t.status,
        t.priority,
        csvEscape(t.assignee?.email ?? ""),
        t.dueDate ? t.dueDate.toISOString() : "",
        csvEscape(labels),
        t.createdAt.toISOString(),
        t.updatedAt.toISOString(),
      ].join(","),
    );
  }

  const body = lines.join("\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flowboard-tasks-${Date.now()}.csv"`,
    },
  });
}
