import { auth } from "@/auth";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { getProjectRole, userHasProjectAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { taskWithAssigneeFromPrisma } from "@/lib/task-serialize";
import { notFound, redirect } from "next/navigation";

import { ProjectBoardClient } from "./project-board-client";

export const metadata = {
  title: "Project board | FlowBoard",
  description: "Kanban board, tasks, and collaboration.",
};

type PageProps = { params: Promise<{ projectId: string }> };

export default async function ProjectBoardPage({ params }: PageProps) {
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

  const role = await getProjectRole(session.user.id, projectId);
  const hasTaskMove = role ? hasPermission(role, "task.move") : false;
  const canMoveAnyTask =
    role === "OWNER" || role === "ADMIN" || role === "MANAGER";
  const canEditProject = role ? hasPermission(role, "project.edit") : false;
  const canEditTask = role ? hasPermission(role, "task.edit") : false;
  const canDeleteTask = role ? hasPermission(role, "task.delete") : false;
  const canCreateTask = role ? hasPermission(role, "task.create") : false;

  return (
    <DashboardPageShell
      title="Board"
      description="Drag tasks across columns. Open details to edit and assign."
      userName={session.user.name}
      userEmail={session.user.email}
    >
      <ProjectBoardClient
        project={project}
        initialTasks={tasks.map(taskWithAssigneeFromPrisma)}
        currentUserId={session.user.id}
        hasTaskMove={hasTaskMove}
        canMoveAnyTask={canMoveAnyTask}
        canEditProject={canEditProject}
        canEditTask={canEditTask}
        canDeleteTask={canDeleteTask}
        canCreateTask={canCreateTask}
      />
    </DashboardPageShell>
  );
}
