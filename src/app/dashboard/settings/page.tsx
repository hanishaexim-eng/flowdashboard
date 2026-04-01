import { auth } from "@/auth";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { SettingsForm } from "@/components/settings/settings-form";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings | FlowBoard",
  description: "Profile and appearance.",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <DashboardPageShell
      title="Settings"
      description="Tune your profile and workspace experience."
      userName={session.user.name}
      userEmail={session.user.email}
    >
      <SettingsForm
        initialName={session.user.name ?? ""}
        initialEmail={session.user.email ?? ""}
      />
    </DashboardPageShell>
  );
}
