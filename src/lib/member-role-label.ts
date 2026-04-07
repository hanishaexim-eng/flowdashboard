import type { MemberRole } from "@prisma/client";

const LABELS: Record<MemberRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  DEVELOPER: "Developer",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

export function projectMemberRoleLabel(role: MemberRole): string {
  return LABELS[role] ?? role;
}
