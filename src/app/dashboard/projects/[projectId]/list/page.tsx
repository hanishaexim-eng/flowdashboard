import { auth } from "@/auth";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { getProjectRole, userHasProjectAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { taskWithAssigneeFromPrisma } from "@/lib/task-serialize";
import { notFound, redirect } from "next/navigation";

import { ProjectListClient } from "./project-list-client";

export const metadata = {
  title: "Project list | FlowBoard",
  description: "Sortable list view and saved filters.",
};

type PageProps = { params: Promise<{ projectId: string }> };

export default async function ProjectListPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { projectId } = await params;
  const allowed = await userHasProjectAccess(session.user.id, projectId);
  if (!allowed) notFound();

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { position: "asc" }],
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  const serializedTasks = tasks.map(taskWithAssigneeFromPrisma);

  const role = await getProjectRole(session.user.id, projectId);
  const canEditProject = role ? hasPermission(role, "project.edit") : false;

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return (
    <DashboardPageShell
      title="List"
      description={project.name}
      userName={session.user.name}
      userEmail={session.user.email}
    >
      <ProjectListClient
        projectId={projectId}
        projectName={project.name}
        initialTasks={serializedTasks}
        canEditProject={canEditProject}
        members={members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
        }))}
      />
    </DashboardPageShell>
  );
}
