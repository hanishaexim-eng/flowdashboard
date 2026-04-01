import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "Sign in",
  description: "Sign in to FlowBoard.",
};

function LoginFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
        <div className="space-y-3 rounded-xl border bg-card/60 p-6">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
