import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const rows = await prisma.organizationMember.findMany({
    where: { userId: gate.userId },
    include: { organization: true },
    orderBy: { organization: { name: "asc" } },
  });

  return NextResponse.json({
    organizations: rows.map((r) => ({
      role: r.role,
      organization: r.organization,
    })),
  });
}
