import { auth } from "@/auth";
import { AnalyticsProjectFilter } from "@/components/analytics/analytics-project-filter";
import {
  CompletionTrend,
  MemberThroughput,
  ProjectProgress,
  StatusDistribution,
} from "@/components/analytics/analytics-charts";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canAccessScreen, getEffectiveRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Analytics | FlowBoard",
  description: "Role-aware workload and governance insights.",
};

type PageProps = {
  searchParams: Promise<{ project?: string }>;
};

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const allowed = await canAccessScreen(session.user.id, "screen.analytics");
  if (!allowed) redirect("/dashboard");

  const userId = session.user.id;
  const effectiveRole = await getEffectiveRole(userId);
  const isLeadership = ["OWNER", "ADMIN", "MANAGER"].includes(effectiveRole);

  const whereProjects = {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };

  const projectRows = await prisma.project.findMany({
    where: whereProjects,
    select: { id: true, name: true },
  });
  const ids = projectRows.map((p) => p.id);

  const sp = await searchParams;
  const requestedProjectId = sp.project;
  const filterIds =
    requestedProjectId && ids.includes(requestedProjectId) ? [requestedProjectId] : ids;
  const currentProjectId =
    requestedProjectId && ids.includes(requestedProjectId) ? requestedProjectId : null;
  const isFiltered = ids.length > 1 && filterIds.length === 1;

  const start = startOfDay(subDays(new Date(), 13));
  const end = startOfDay(new Date());

  const projectWhereScoped = { AND: [whereProjects, { id: { in: filterIds } }] };

  const [doneTasks, projectsWithTasks, transitions, myTasks, allTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        projectId: { in: filterIds },
        status: "DONE",
        updatedAt: { gte: start },
      },
      select: { updatedAt: true },
    }),
    prisma.project.findMany({
      where: projectWhereScoped,
      select: {
        name: true,
        tasks: { select: { status: true } },
      },
    }),
    prisma.taskTransition.findMany({
      where: { projectId: { in: filterIds } },
      orderBy: { movedAt: "desc" },
      take: 40,
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        issueFaced: true,
        feedback: true,
        movedAt: true,
        task: { select: { title: true } },
        movedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.task.findMany({
      where: { projectId: { in: filterIds }, assigneeId: userId },
      select: { status: true, dueDate: true, updatedAt: true },
    }),
    prisma.task.findMany({
      where: { projectId: { in: filterIds } },
      select: { status: true, dueDate: true },
    }),
  ]);

  const dayKeys = eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
  const counts = new Map<string, number>();
  for (const k of dayKeys) counts.set(k, 0);
  for (const t of doneTasks) {
    const k = format(startOfDay(t.updatedAt), "yyyy-MM-dd");
    if (!counts.has(k)) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const trend = dayKeys.map((k) => ({
    label: format(new Date(`${k}T00:00:00`), "MMM d"),
    completed: counts.get(k) ?? 0,
  }));

  const progress = projectsWithTasks.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === "DONE").length;
    return {
      name: p.name.length > 18 ? `${p.name.slice(0, 18)}...` : p.name,
      progress: total ? Math.round((done / total) * 100) : 0,
    };
  });

  const statusData = [
    { name: "Todo", value: allTasks.filter((t) => t.status === "TODO").length },
    { name: "In Progress", value: allTasks.filter((t) => t.status === "IN_PROGRESS").length },
    { name: "Done", value: allTasks.filter((t) => t.status === "DONE").length },
  ];

  const reopenRate = transitions.length
    ? Math.round(
        (transitions.filter((t) => t.fromStatus === "DONE" && t.toStatus === "IN_PROGRESS").length /
          transitions.length) *
          100,
      )
    : 0;

  const contributorCounts = new Map<string, { name: string; count: number }>();
  for (const t of transitions) {
    const existing = contributorCounts.get(t.movedBy.id);
    contributorCounts.set(t.movedBy.id, {
      name: t.movedBy.name,
      count: (existing?.count ?? 0) + 1,
    });
  }
  const contributorData = [...contributorCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((row) => ({
      name: row.name.length > 12 ? `${row.name.slice(0, 12)}...` : row.name,
      count: row.count,
    }));

  const now = new Date();
  const workspaceOverdue = allTasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== "DONE").length;
  const myOverdue = myTasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== "DONE").length;
  const myInProgress = myTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const myDone14d = myTasks.filter((t) => t.status === "DONE" && t.updatedAt >= start).length;
  const qualityScore = Math.max(0, 100 - reopenRate);

  const currentProjectLabel = currentProjectId
    ? projectRows.find((p) => p.id === currentProjectId)?.name ?? "All projects"
    : "All projects";

  const scopeHint = isFiltered ? "For the selected project." : "Across accessible projects.";
  const chartScopeDesc = isFiltered
    ? "Filtered to the selected project."
    : "Across all projects you can access.";

  return (
    <DashboardPageShell
      title="Analytics"
      description={
        isLeadership
          ? "Leadership analytics: flow health, team throughput, and delivery risk."
          : "Your execution analytics: workload, progress, and near-term risk."
      }
      userName={session.user.name}
      userEmail={session.user.email}
    >
      <AnalyticsProjectFilter
        projects={projectRows}
        currentProjectId={currentProjectId}
        currentLabel={currentProjectLabel}
      />

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLeadership ? (
          <>
            <MetricCard
              title="Projects in scope"
              value={String(filterIds.length)}
              hint={isFiltered ? "Current filter" : "Visible to your access"}
            />
            <MetricCard
              title="Completions (14d)"
              value={String(doneTasks.length)}
              hint={scopeHint}
            />
            <MetricCard title="Flow quality score" value={String(qualityScore)} hint="100 − reopen rate" />
            <MetricCard title="Overdue tasks" value={String(workspaceOverdue)} hint={scopeHint} />
          </>
        ) : (
          <>
            <MetricCard title="My assigned tasks" value={String(myTasks.length)} hint={scopeHint} />
            <MetricCard title="My in progress" value={String(myInProgress)} hint="Current active workload" />
            <MetricCard title="My done (14d)" value={String(myDone14d)} hint={scopeHint} />
            <MetricCard title="My overdue" value={String(myOverdue)} hint="Needs immediate attention" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border bg-card/60 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Tasks completed (14d)</CardTitle>
            <CardDescription>Daily completion trend. {chartScopeDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <CompletionTrend data={trend} />
          </CardContent>
        </Card>

        <Card className="border bg-card/60 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Project progress</CardTitle>
            <CardDescription>Done tasks as a percentage of total tasks. {chartScopeDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {progress.length === 0 ? (
              <p className="text-sm text-muted-foreground">No project data yet.</p>
            ) : (
              <ProjectProgress data={progress} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border bg-card/60 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Status distribution</CardTitle>
            <CardDescription>Share of tasks by workflow status. {chartScopeDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDistribution data={statusData} />
          </CardContent>
        </Card>

        <Card className="border bg-card/60 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">
              {isLeadership ? "Top transition contributors" : "Recent flow replay"}
            </CardTitle>
            <CardDescription>
              {isLeadership
                ? `Members driving the most task transitions. ${chartScopeDesc}`
                : `Latest movement context from your projects. ${chartScopeDesc}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLeadership ? (
              contributorData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transition data yet.</p>
              ) : (
                <MemberThroughput data={contributorData} />
              )
            ) : transitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transition events yet.</p>
            ) : (
              <div className="space-y-2">
                {transitions.slice(0, 8).map((t) => (
                  <div key={t.id} className="rounded border p-2 text-xs">
                    <p className="font-medium">
                      {t.task.title}: {t.fromStatus} to {t.toStatus}
                    </p>
                    <p>{t.feedback}</p>
                    <p className="text-muted-foreground">
                      {t.movedBy.name} - {format(t.movedAt, "MMM d, HH:mm")}
                    </p>
                    <p className="text-muted-foreground">Issue: {t.issueFaced}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  );
}

function MetricCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card className="border bg-card/60 shadow-sm backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
