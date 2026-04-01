import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ tasks: [], projects: [] });
  }

  const userId = gate.userId;
  const projectWhere = {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };

  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: {
        ...projectWhere,
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      },
      select: { id: true, name: true, color: true },
      take: 10,
    }),
    prisma.task.findMany({
      where: {
        project: projectWhere,
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        projectId: true,
        project: { select: { name: true } },
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ projects, tasks });
}
