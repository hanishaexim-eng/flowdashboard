import { auth } from "@/auth";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { canAccessScreen } from "@/lib/access";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin | FlowBoard",
  description: "Governance dashboard for managers and admins.",
};

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const allowed = await canAccessScreen(session.user.id, "screen.admin");
  if (!allowed) redirect("/dashboard");

  const userId = session.user.id;
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { role: true },
  });
  const isAdmin = memberships.some((m) => ["OWNER", "ADMIN", "MANAGER"].includes(m.role));
  if (!isAdmin) redirect("/dashboard");

  const projects = await prisma.project.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true, name: true, tasks: { select: { status: true } } },
  });
  const ids = projects.map((p) => p.id);
  const [reopens, overrides, transitions] = await Promise.all([
    prisma.taskTransition.count({
      where: { projectId: { in: ids }, fromStatus: "DONE", toStatus: "IN_PROGRESS" },
    }),
    prisma.taskTransition.count({ where: { projectId: { in: ids }, overrideApplied: true } }),
    prisma.taskTransition.count({ where: { projectId: { in: ids } } }),
  ]);

  const flowQuality = transitions === 0 ? 100 : Math.max(0, 100 - reopens * 8 - overrides * 10);

  return (
    <DashboardPageShell
      title="Admin Dashboard"
      description="Flow governance, transition quality, and exception monitoring."
      userName={session.user.name}
      userEmail={session.user.email}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">Profile & settings</CardTitle>
              <CardDescription>
                Update your name and account preferences. Same as Settings in the sidebar.
              </CardDescription>
            </div>
            <Link
              href="/dashboard/settings"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Open settings
            </Link>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flow quality score</CardTitle>
            <CardDescription>Derived from reopens and override transitions.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{flowQuality}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reopened tasks</CardTitle>
            <CardDescription>Done to In Progress transitions.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{reopens}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Policy overrides</CardTitle>
            <CardDescription>Transitions that bypassed strict flow.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{overrides}</CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  );
}

