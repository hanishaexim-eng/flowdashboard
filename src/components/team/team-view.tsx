"use client";

import { MemberRole, type Project } from "@prisma/client";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { projectMemberRoleLabel } from "@/lib/member-role-label";

type MemberRow = {
  id: string;
  role: MemberRole;
  user: { id: string; name: string; email: string };
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase() || "U";
}

export function TeamView({
  projects,
  initialProjectId,
  initialMembers,
  canManageMembers,
}: {
  projects: Pick<Project, "id" | "name" | "color">[];
  initialProjectId: string | null;
  initialMembers: MemberRow[];
  canManageMembers: boolean;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  const [members, setMembers] = useState<MemberRow[]>(initialMembers);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const canInvite = useMemo(
    () => canManageMembers && email.includes("@") && !!projectId,
    [canManageMembers, email, projectId],
  );

  const activeProjectLabel = useMemo(
    () => (projectId ? projects.find((p) => p.id === projectId)?.name ?? "Project" : ""),
    [projectId, projects],
  );

  async function refreshMembers(nextProjectId: string) {
    const res = await fetch(`/api/projects/${nextProjectId}/members`);
    if (!res.ok) return;
    const data = (await res.json()) as { members: MemberRow[] };
    setMembers(data.members);
  }

  async function handleProjectChange(nextId: string) {
    setProjectId(nextId);
    router.push(`/dashboard/team?projectId=${encodeURIComponent(nextId)}`);
    await refreshMembers(nextId);
  }

  async function handleInvite() {
    if (!projectId || !canInvite) return;
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setMessage(err.error ?? "Could not add member.");
        return;
      }
      const data = (await res.json()) as { member: MemberRow };
      setMembers((prev) => [...prev, data.member]);
      setEmail("");
      setMessage("Member added.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!projectId) return;
    const target = members.find((m) => m.user.id === userId);
    const confirmed = window.confirm(
      `Remove ${target?.user.name ?? "this member"} from the project?`,
    );
    if (!confirmed) return;
    setMessage(null);
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      setMessage(err.error ?? "Could not remove member.");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    setMessage("Member removed.");
    router.refresh();
  }

  async function handleRoleChange(userId: string, role: MemberRole) {
    if (!projectId) return;
    setUpdatingId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setMessage(err.error ?? "Could not update role.");
        return;
      }
      const data = (await res.json()) as { member: MemberRow };
      setMembers((prev) =>
        prev.map((m) => (m.user.id === userId ? { ...m, role: data.member.role } : m)),
      );
      setMessage("Role updated.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (projects.length === 0) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle>No projects yet</CardTitle>
          <CardDescription>Create a project first, then invite teammates by email.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid w-full min-w-0 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Project</CardTitle>
          <CardDescription>Switch context to manage members.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Active project</Label>
            <Select
              value={projectId ?? undefined}
              onValueChange={(v) => {
                if (!v) return;
                void handleProjectChange(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project">
                  {projectId ? activeProjectLabel : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invite-email">Invite by email</Label>
            <Input
              id="invite-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              disabled={!canManageMembers}
            />
            <p className="text-xs text-muted-foreground">
              The teammate must already have an account.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleInvite}
            disabled={!canInvite || loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 size-4" />
            )}
            Add member
          </Button>
          {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>Everyone with access to this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members loaded.</p>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-3 rounded-lg border bg-card/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="text-xs">{initials(m.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
                  {m.role === MemberRole.OWNER ? (
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/8 font-normal text-primary"
                    >
                      {projectMemberRoleLabel(m.role)}
                    </Badge>
                  ) : (
                    <Select
                      value={m.role}
                      onValueChange={(v) => void handleRoleChange(m.user.id, v as MemberRole)}
                      disabled={updatingId === m.user.id || !canManageMembers}
                    >
                      <SelectTrigger className="h-8 w-full min-w-0 sm:w-[152px]">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={MemberRole.ADMIN}>{projectMemberRoleLabel(MemberRole.ADMIN)}</SelectItem>
                        <SelectItem value={MemberRole.MANAGER}>{projectMemberRoleLabel(MemberRole.MANAGER)}</SelectItem>
                        <SelectItem value={MemberRole.DEVELOPER}>{projectMemberRoleLabel(MemberRole.DEVELOPER)}</SelectItem>
                        <SelectItem value={MemberRole.MEMBER}>{projectMemberRoleLabel(MemberRole.MEMBER)}</SelectItem>
                        <SelectItem value={MemberRole.VIEWER}>{projectMemberRoleLabel(MemberRole.VIEWER)}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {m.role !== MemberRole.OWNER ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleRemoveMember(m.user.id)}
                      aria-label={`Remove ${m.user.name}`}
                      disabled={!canManageMembers}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
