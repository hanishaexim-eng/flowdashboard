import { auth } from "@/auth";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { canAccessScreen, getEffectiveRole } from "@/lib/access";
import { TeamView } from "@/components/team/team-view";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Team | FlowBoard",
  description: "Invite collaborators and manage project access.",
};

type PageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function TeamPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const allowed = await canAccessScreen(session.user.id, "screen.team");
  if (!allowed) redirect("/dashboard");
  const effectiveRole = await getEffectiveRole(session.user.id);
  const canManageMembers =
    hasPermission(effectiveRole, "member.manage") ||
    hasPermission(effectiveRole, "project.assignVisibility");

  const userId = session.user.id;
  const sp = await searchParams;

  const projects = await prisma.project.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, color: true },
  });

  const requestedId = sp.projectId;
  const projectId =
    requestedId && projects.some((p) => p.id === requestedId)
      ? requestedId
      : projects[0]?.id ?? null;

  const members = projectId
    ? await prisma.projectMember.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      })
    : [];

  const memberRows = members.map((m) => ({
    id: m.id,
    role: m.role,
    user: m.user,
  }));

  return (
    <DashboardPageShell
      title="Team"
      description="Invite teammates and keep access aligned with your roadmap."
      userName={session.user.name}
      userEmail={session.user.email}
    >
      <TeamView
        projects={projects}
        initialProjectId={projectId}
        initialMembers={memberRows}
        canManageMembers={canManageMembers}
      />
    </DashboardPageShell>
  );
}
