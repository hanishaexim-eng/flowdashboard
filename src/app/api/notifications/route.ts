import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  const take = Math.min(Number(url.searchParams.get("limit") ?? "30"), 100);

  const where = { userId: gate.userId, ...(unreadOnly ? { readAt: null } : {}) };

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.notification.count({ where: { userId: gate.userId, readAt: null } }),
  ]);

  return NextResponse.json({ notifications: items, unreadCount });
}

const patchSchema = z.object({
  ids: z.array(z.string()).min(1),
  read: z.boolean(),
});

export async function PATCH(req: Request) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: {
      id: { in: parsed.data.ids },
      userId: gate.userId,
    },
    data: {
      readAt: parsed.data.read ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true });
}
