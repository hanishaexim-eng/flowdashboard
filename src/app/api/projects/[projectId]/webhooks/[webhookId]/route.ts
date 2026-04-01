import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/api-auth";
import { getProjectRole, userHasProjectAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ projectId: string; webhookId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { projectId, webhookId } = await params;
  const allowed = await userHasProjectAccess(gate.userId, projectId);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const role = await getProjectRole(gate.userId, projectId);
  if (!role || !hasPermission(role, "project.edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.webhookSubscription.findFirst({
    where: { id: webhookId, projectId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.webhookSubscription.delete({ where: { id: webhookId } });
  return NextResponse.json({ ok: true });
}
