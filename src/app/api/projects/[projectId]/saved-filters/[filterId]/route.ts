import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/api-auth";
import { getProjectRole, userHasProjectAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ projectId: string; filterId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { projectId, filterId } = await params;
  const allowed = await userHasProjectAccess(gate.userId, projectId);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const role = await getProjectRole(gate.userId, projectId);
  if (!role || !hasPermission(role, "project.edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.savedFilter.findFirst({
    where: { id: filterId, projectId, userId: gate.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savedFilter.delete({ where: { id: filterId } });
  return NextResponse.json({ ok: true });
}
