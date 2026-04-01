import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(128).optional(),
});

export async function PATCH(req: Request) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, currentPassword, newPassword } = parsed.data;

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required to set a new password." },
        { status: 400 },
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: gate.userId },
      select: { passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { compare } = await import("bcryptjs");
    const ok = await compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
  }

  const passwordHash = newPassword ? await hash(newPassword, 12) : undefined;

  const updated = await prisma.user.update({
    where: { id: gate.userId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    },
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json({ user: updated });
}
