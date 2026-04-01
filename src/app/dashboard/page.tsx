import { auth } from "@/auth";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { buttonVariants } from "@/lib/button-variants";
import { canAccessScreen } from "@/lib/access";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { Activity, AlertCircle, CheckCircle2, FolderKanban, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Overview | FlowBoard",
  description: "Project overview, KPIs, and recent activity.",
};

async function Stats() {
  const session = await auth();
  const userId = session!.user!.id;

  const whereProjects = {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };

  const projectRows = await prisma.project.findMany({
    where: whereProjects,
    select: { id: true },
  });
  const ids = projectRows.map((p) => p.id);

  const [totalProjects, completedTasks, distinctMembers, blockedTransitions, roleRows] = await Promise.all([
    prisma.project.count({ where: whereProjects }),
    prisma.task.count({
      where: { projectId: { in: ids }, status: "DONE" },
    }),
    prisma.projectMember.findMany({
      where: { projectId: { in: ids } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.taskTransition.count({
      where: {
        projectId: { in: ids },
        issueFaced: { not: "n/a" },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId: { in: ids }, userId },
      select: { role: true },
    }),
  ]);

  const isAdminView = roleRows.some((r) => ["OWNER", "ADMIN", "MANAGER"].includes(r.role));

  const items = [
    {
      title: "Total projects",
      value: String(totalProjects),
      icon: FolderKanban,
      hint: "Across your workspace",
    },
    {
      title: "Tasks completed",
      value: String(completedTasks),
      icon: CheckCircle2,
      hint: "All-time in your projects",
    },
    {
      title: "Active collaborators",
      value: String(distinctMembers.length),
      icon: Users,
      hint: "Unique teammates",
    },
  ];

  const adminItems = [
    {
      title: "Policy exceptions",
      value: String(blockedTransitions),
      icon: AlertCircle,
      hint: "Transitions with documented issues",
    },
    {
      title: "Governance mode",
      value: "STRICT",
      icon: ShieldCheck,
      hint: "All status moves require notes",
    },
  ];

  return (
    <div className={cn("grid gap-4", isAdminView ? "md:grid-cols-5" : "md:grid-cols-3")}>
      {items.map((item) => (
        <Card key={item.title} className="border bg-card/60 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.title}
            </CardTitle>
            <item.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{item.value}</div>
            <p className="text-xs text-muted-foreground">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
      {isAdminView
        ? adminItems.map((item) => (
            <Card key={item.title} className="border bg-card/60 shadow-sm backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.title}
                </CardTitle>
                <item.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">{item.value}</div>
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              </CardContent>
            </Card>
          ))
        : null}
    </div>
  );
}

async function ActivityFeed() {
  const session = await auth();
  const userId = session!.user!.id;

  const whereProjects = {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };

  const projectRows = await prisma.project.findMany({
    where: whereProjects,
    select: { id: true },
  });
  const ids = projectRows.map((p) => p.id);

  const rows = await prisma.activity.findMany({
    where: { projectId: { in: ids } },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { user: { select: { name: true } } },
  });

  if (rows.length === 0) {
    return (
      <Card className="border bg-card/60 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>No activity yet - start with this quick flow:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/dashboard/projects" className={cn(buttonVariants({ variant: "default" }), "h-8")}>
              1. Create project
            </Link>
            <Link
              href="/dashboard/projects"
              className={cn(buttonVariants({ variant: "secondary" }), "h-8")}
            >
              2. Add tasks
            </Link>
            <Link href="/dashboard/team" className={cn(buttonVariants({ variant: "outline" }), "h-8")}>
              3. Invite teammate
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border bg-card/60 shadow-sm backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Activity</CardTitle>
        <Activity className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((a) => (
          <div key={a.id} className="flex gap-3">
            <div className="mt-0.5 size-2 rounded-full bg-primary/70" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm leading-snug">{a.message}</p>
              <p className="text-xs text-muted-foreground">
                {a.user.name} ·{" "}
                {formatDistanceToNow(a.createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border bg-card/60">
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function DashboardHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const allowed = await canAccessScreen(session.user.id, "screen.overview");
  if (!allowed) redirect("/dashboard/projects");

  return (
    <DashboardPageShell
      title="Overview"
      description="A fast snapshot of your workspace health."
      userName={session?.user?.name}
      userEmail={session?.user?.email}
    >
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>

      <Suspense
        fallback={
          <Card className="border bg-card/60">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        }
      >
        <ActivityFeed />
      </Suspense>
    </DashboardPageShell>
  );
}
