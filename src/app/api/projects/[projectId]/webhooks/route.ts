import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/api-auth";
import { getProjectRole, userHasProjectAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ projectId: string }> };

const postSchema = z.object({
  url: z.string().url().max(2000),
  secret: z.string().max(200).optional(),
  events: z.array(z.string().max(80)).max(20).optional(),
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

  const rows = await prisma.webhookSubscription.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ webhooks: rows });
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

  const events = parsed.data.events ?? ["task.transitioned"];
  const row = await prisma.webhookSubscription.create({
    data: {
      projectId,
      url: parsed.data.url,
      secret: parsed.data.secret ?? "",
      events: JSON.stringify(events),
    },
  });

  return NextResponse.json({ webhook: row });
}
