import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: gate.userId },
        { members: { some: { userId: gate.userId } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { tasks: true, members: true } },
    },
  });

  return NextResponse.json({ projects });
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function POST(req: Request) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  try {
    const json = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, description, color } = parsed.data;

    const project = await prisma.project.create({
      data: {
        name,
        description: description ?? "",
        color: color ?? "#6366f1",
        ownerId: gate.userId,
        members: {
          create: {
            userId: gate.userId,
            role: MemberRole.OWNER,
          },
        },
      },
    });

    await prisma.activity.create({
      data: {
        projectId: project.id,
        userId: gate.userId,
        type: "project.created",
        message: `Created project ${project.name}`,
      },
    });

    return NextResponse.json({ project });
  } catch {
    return NextResponse.json({ error: "Failed to create project." }, { status: 500 });
  }
}
