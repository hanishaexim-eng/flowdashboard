import { auth } from "@/auth";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { canAccessScreen } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

import { WorkspaceClient } from "./workspace-client";

export const metadata = {
  title: "Workspace | FlowBoard",
  description: "Organizations and invitations.",
};

export default async function WorkspacePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const allowed = await canAccessScreen(session.user.id, "screen.workspace");
  if (!allowed) redirect("/dashboard");

  const rows = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { organization: { name: "asc" } },
  });

  return (
    <DashboardPageShell
      title="Workspace"
      description="Organizations you belong to and invite links."
      userName={session.user.name}
      userEmail={session.user.email}
    >
      <WorkspaceClient
        initialOrgs={rows.map((r) => ({
          id: r.organization.id,
          name: r.organization.name,
          slug: r.organization.slug,
          role: r.role,
        }))}
      />
    </DashboardPageShell>
  );
}
