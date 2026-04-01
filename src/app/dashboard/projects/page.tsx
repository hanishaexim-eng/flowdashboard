import { auth } from "@/auth";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { canAccessScreen } from "@/lib/access";
import { ProjectsView } from "@/components/projects/projects-view";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Projects | FlowBoard",
  description: "Create and manage projects.",
};

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const allowed = await canAccessScreen(session.user.id, "screen.projects");
  if (!allowed) redirect("/dashboard");

  const userId = session.user.id;
  const projects = await prisma.project.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { tasks: true, members: true } },
    },
  });

  return (
    <DashboardPageShell
      title="Projects"
      description="Organize workstreams and jump into boards."
      userName={session.user.name}
      userEmail={session.user.email}
    >
      <ProjectsView initialProjects={projects} />
    </DashboardPageShell>
  );
}
