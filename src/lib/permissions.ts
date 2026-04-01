import type { MemberRole } from "@prisma/client";

export type Permission =
  | "task.create"
  | "task.edit"
  | "task.delete"
  | "task.move"
  | "task.reopen"
  | "project.edit"
  | "project.delete"
  | "member.manage"
  | "workflow.override"
  | "screen.overview"
  | "screen.projects"
  | "screen.team"
  | "screen.analytics"
  | "screen.admin"
  | "screen.workspace"
  | "screen.settings"
  | "user.manage"
  | "project.assignVisibility";

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  OWNER: [
    "task.create",
    "task.edit",
    "task.delete",
    "task.move",
    "task.reopen",
    "project.edit",
    "project.delete",
    "member.manage",
    "workflow.override",
    "screen.overview",
    "screen.projects",
    "screen.team",
    "screen.analytics",
    "screen.admin",
    "screen.workspace",
    "screen.settings",
    "user.manage",
    "project.assignVisibility",
  ],
  ADMIN: [
    "task.create",
    "task.edit",
    "task.delete",
    "task.move",
    "task.reopen",
    "project.edit",
    "member.manage",
    "workflow.override",
    "screen.overview",
    "screen.projects",
    "screen.team",
    "screen.analytics",
    "screen.admin",
    "screen.workspace",
    "screen.settings",
    "user.manage",
    "project.assignVisibility",
  ],
  MANAGER: [
    "task.create",
    "task.edit",
    "task.delete",
    "task.move",
    "task.reopen",
    "project.edit",
    "workflow.override",
    "screen.overview",
    "screen.projects",
    "screen.team",
    "screen.analytics",
    "screen.settings",
  ],
  DEVELOPER: [
    "task.create",
    "task.edit",
    "task.move",
    "screen.overview",
    "screen.projects",
    "screen.analytics",
    "screen.settings",
  ],
  MEMBER: [
    "task.create",
    "task.edit",
    "task.move",
    "screen.overview",
    "screen.projects",
    "screen.analytics",
    "screen.settings",
  ],
  VIEWER: ["screen.overview", "screen.projects", "screen.analytics", "screen.settings"],
};

export function hasPermission(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

