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
  const projectFilter = projectId
    ? {
        id: projectId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      }
    : {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      };

  const transitions = await prisma.taskTransition.findMany({
    where: { project: projectFilter },
    orderBy: { movedAt: "desc" },
    include: {
      task: { select: { title: true } },
      movedBy: { select: { email: true, name: true } },
      project: { select: { name: true } },
    },
    take: 5000,
  });

  const headers = [
    "project",
    "task_title",
    "from_status",
    "to_status",
    "moved_by",
    "feedback",
    "issue_faced",
    "acceptance_note",
    "reopen_reason",
    "override",
    "moved_at",
  ];
  const lines = [headers.join(",")];
  for (const tr of transitions) {
    lines.push(
      [
        csvEscape(tr.project.name),
        csvEscape(tr.task.title),
        tr.fromStatus,
        tr.toStatus,
        csvEscape(tr.movedBy.email),
        csvEscape(tr.feedback),
        csvEscape(tr.issueFaced),
        csvEscape(tr.acceptanceNote),
        csvEscape(tr.reopenReason ?? ""),
        tr.overrideApplied ? "yes" : "no",
        tr.movedAt.toISOString(),
      ].join(","),
    );
  }

  const body = lines.join("\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flowboard-transitions-${Date.now()}.csv"`,
    },
  });
}
