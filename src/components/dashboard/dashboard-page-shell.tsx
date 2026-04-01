import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export function DashboardPageShell({
  title,
  description,
  userName,
  userEmail,
  children,
}: {
  title: string;
  description?: string;
  userName?: string | null;
  userEmail?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title={title}
        description={description}
        userName={userName}
        userEmail={userEmail}
      />
      <div className="flex-1 space-y-6 p-4 lg:p-6">{children}</div>
    </div>
  );
}
