import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/api-auth";
import { getProjectRole, userHasProjectAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ projectId: string }> };

const postSchema = z.object({
  name: z.string().min(1).max(120),
  trigger: z.string().min(1).max(80),
  action: z.enum(["notify_owner", "slack_incoming"]),
  payload: z.string().max(4000).optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { projectId } = await params;
  const allowed = await userHasProjectAccess(gate.userId, projectId);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const role = await getProjectRole(gate.userId, projectId);
  if (!role || !hasPermission(role, "project.edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.automationRule.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ automations: rows });
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

  const row = await prisma.automationRule.create({
    data: {
      projectId,
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      action: parsed.data.action,
      payload: parsed.data.payload ?? "{}",
    },
  });

  return NextResponse.json({ automation: row });
}
