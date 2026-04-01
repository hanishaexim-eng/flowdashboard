import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { organization: { select: { name: true, id: true } } },
  });
  if (!invite || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    organizationName: invite.organization.name,
    organizationId: invite.organization.id,
  });
}

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
  });
  if (!invite || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  if (session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Signed-in email must match the invite." },
      { status: 403 },
    );
  }

  const existing = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invite.organizationId,
        userId: session.user.id,
      },
    },
  });
  if (!existing) {
    await prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId: session.user.id,
        role: invite.role,
      },
    });
  }

  await prisma.workspaceInvite.delete({ where: { id: invite.id } });

  return NextResponse.json({ ok: true });
}
