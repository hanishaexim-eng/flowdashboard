import { auth } from "@/auth";
import { AppSidebarDesktop, AppSidebarMobile } from "@/components/dashboard/app-sidebar";
import { getEffectiveRole } from "@/lib/access";
import { hasPermission, type Permission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = await getEffectiveRole(session.user.id);
  const screenPermissions: Permission[] = [
    "screen.overview",
    "screen.projects",
    "screen.workspace",
    "screen.team",
    "screen.analytics",
    "screen.admin",
    "screen.settings",
  ];
  const allowedScreens = screenPermissions.filter((permission) =>
    hasPermission(role, permission),
  );

  return (
    <div className="flex min-h-screen w-full min-w-0 bg-background">
      <AppSidebarDesktop allowedScreens={allowedScreens} />
      <AppSidebarMobile allowedScreens={allowedScreens} />
      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
