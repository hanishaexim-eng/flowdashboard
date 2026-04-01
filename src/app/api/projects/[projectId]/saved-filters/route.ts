import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/api-auth";
import { getProjectRole, userHasProjectAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ projectId: string }> };

const postSchema = z.object({
  name: z.string().min(1).max(80),
  query: z.string().max(8000),
});

export async function GET(_req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { projectId } = await params;
  const allowed = await userHasProjectAccess(gate.userId, projectId);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await prisma.savedFilter.findMany({
    where: { projectId, userId: gate.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ filters: rows });
}

export async function POST(req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { projectId } = await params;
  const allowed = await userHasProjectAccess(gate.userId, projectId);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const role = await getProjectRole(gate.userId, projectId);
  if (!role || !hasPermission(role, "project.edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    JSON.parse(parsed.data.query);
  } catch {
    return NextResponse.json({ error: "query must be valid JSON" }, { status: 400 });
  }

  const row = await prisma.savedFilter.create({
    data: {
      projectId,
      userId: gate.userId,
      name: parsed.data.name,
      query: parsed.data.query,
    },
  });

  return NextResponse.json({ filter: row });
}
