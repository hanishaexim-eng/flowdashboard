import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ orgId: string }> };

const postSchema = z.object({
  email: z.string().email(),
  role: z.enum(["MEMBER", "ADMIN"]).optional(),
});

export async function POST(req: Request, { params }: Params) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { orgId } = await params;
  const admin = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: gate.userId,
      role: { in: ["OWNER", "ADMIN"] },
    },
  });
  if (!admin) {
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

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invite = await prisma.workspaceInvite.create({
    data: {
      organizationId: orgId,
      email: parsed.data.email.toLowerCase(),
      token,
      role: parsed.data.role ?? "MEMBER",
      expiresAt,
    },
  });

  const base =
    process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${base.replace(/\/$/, "")}/invite/${invite.token}`;

  return NextResponse.json({ invite: { id: invite.id, inviteUrl, expiresAt: invite.expiresAt } });
}
