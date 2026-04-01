import { prisma } from "@/lib/prisma";
import type { MemberRole } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/permissions";

/** Returns true if the user is owner or member of the project. */
export async function userHasProjectAccess(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return !!project;
}

export async function getProjectRole(
  userId: string,
  projectId: string,
): Promise<MemberRole | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return null;
  if (project.ownerId === userId) return "OWNER";

  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId },
    select: { role: true },
  });
  return member?.role ?? null;
}

const ROLE_WEIGHT: Record<MemberRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  DEVELOPER: 3,
  MANAGER: 4,
  ADMIN: 5,
  OWNER: 6,
};

function maxRole(a: MemberRole, b: MemberRole): MemberRole {
  return ROLE_WEIGHT[a] >= ROLE_WEIGHT[b] ? a : b;
}

function mapOrgRoleToMemberRole(role: string): MemberRole {
  if (role === "OWNER") return "OWNER";
  if (role === "ADMIN") return "ADMIN";
  return "MEMBER";
}

export async function getEffectiveRole(userId: string): Promise<MemberRole> {
  const [ownedProject, projectMemberships, orgMemberships] = await Promise.all([
    prisma.project.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    }),
    prisma.projectMember.findMany({
      where: { userId },
      select: { role: true },
    }),
    prisma.organizationMember.findMany({
      where: { userId },
      select: { role: true },
    }),
  ]);

  let role: MemberRole = ownedProject ? "OWNER" : "VIEWER";
  for (const m of projectMemberships) role = maxRole(role, m.role);
  for (const o of orgMemberships) role = maxRole(role, mapOrgRoleToMemberRole(o.role));
  return role;
}

export async function canAccessScreen(
  userId: string,
  screenPermission: Permission,
): Promise<boolean> {
  const role = await getEffectiveRole(userId);
  return hasPermission(role, screenPermission);
}

export async function requireProjectPermission(
  userId: string,
  projectId: string,
  permission: Permission,
): Promise<boolean> {
  const role = await getProjectRole(userId, projectId);
  if (!role) return false;
  return hasPermission(role, permission);
}
