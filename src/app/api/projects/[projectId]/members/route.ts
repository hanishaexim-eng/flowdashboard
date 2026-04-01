import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/api-auth";
import { getProjectRole, userHasProjectAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { projectId } = await params;
  const allowed = await userHasProjectAccess(gate.userId, projectId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ members });
}

const addSchema = z.object({
  email: z.string().email(),
});

const removeSchema = z.object({
  userId: z.string().min(1),
});

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(MemberRole),
});

export async function POST(req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { projectId } = await params;
  const allowed = await userHasProjectAccess(gate.userId, projectId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const role = await getProjectRole(gate.userId, projectId);
  if (
    !role ||
    (!hasPermission(role, "member.manage") &&
      !hasPermission(role, "project.assignVisibility"))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = addSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user) {
    return NextResponse.json(
      { error: "No user with that email. They must sign up first." },
      { status: 404 },
    );
  }

  try {
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        role: MemberRole.DEVELOPER,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    await prisma.activity.create({
      data: {
        projectId,
        userId: gate.userId,
        type: "member.added",
        message: `Added ${user.name} to the project`,
      },
    });

    return NextResponse.json({ member });
  } catch {
    return NextResponse.json(
      { error: "Member may already be on this project." },
      { status: 409 },
    );
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { projectId } = await params;
  const allowed = await userHasProjectAccess(gate.userId, projectId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const actorRole = await getProjectRole(gate.userId, projectId);
  if (
    !actorRole ||
    (!hasPermission(actorRole, "member.manage") &&
      !hasPermission(actorRole, "project.assignVisibility"))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = roleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.projectMember.findFirst({
    where: { projectId, userId: parsed.data.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (existing.role === MemberRole.OWNER) {
    return NextResponse.json({ error: "Owner role cannot be changed." }, { status: 400 });
  }

  const member = await prisma.projectMember.update({
    where: { id: existing.id },
    data: { role: parsed.data.role },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  await prisma.activity.create({
    data: {
      projectId,
      userId: gate.userId,
      type: "member.role.updated",
      message: `Updated ${member.user.name}'s role to ${member.role}`,
    },
  });

  return NextResponse.json({ member });
}

export async function DELETE(req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { projectId } = await params;
  const allowed = await userHasProjectAccess(gate.userId, projectId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const actorRole = await getProjectRole(gate.userId, projectId);
  if (
    !actorRole ||
    (!hasPermission(actorRole, "member.manage") &&
      !hasPermission(actorRole, "project.assignVisibility"))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = removeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId: parsed.data.userId },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.role === MemberRole.OWNER) {
    return NextResponse.json({ error: "Owner cannot be removed." }, { status: 400 });
  }

  await prisma.projectMember.delete({ where: { id: member.id } });

  await prisma.activity.create({
    data: {
      projectId,
      userId: gate.userId,
      type: "member.removed",
      message: `Removed ${member.user.name} from the project`,
    },
  });

  return NextResponse.json({ ok: true });
}
