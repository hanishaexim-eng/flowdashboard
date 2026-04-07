import { MarketingNav } from "@/components/marketing/marketing-nav";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Kanban, LineChart, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "FlowBoard — Manage your startup projects faster",
  description:
    "A production-style SaaS workspace: projects, Kanban, analytics, and team collaboration.",
};

const features = [
  {
    title: "Projects that feel premium",
    description: "Create workspaces, keep context tight, and move fast with crisp cards and flows.",
    icon: Sparkles,
  },
  {
    title: "Kanban that actually ships",
    description: "Drag tasks across Todo → In Progress → Done with a polished board experience.",
    icon: Kanban,
  },
  {
    title: "Team-ready collaboration",
    description: "Invite members, assign owners, and keep activity visible in one feed.",
    icon: Users,
  },
  {
    title: "Analytics without the bloat",
    description: "Trend lines and progress bars that tell a story — perfect for reviews and pitches.",
    icon: LineChart,
  },
  {
    title: "Auth + guardrails",
    description: "Credential auth with protected routes — the baseline every SaaS client expects.",
    icon: ShieldCheck,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      <main>
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(80% 60% at 50% -10%, color-mix(in oklch, var(--primary) 22%, transparent), transparent)",
            }}
          />
          <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                <span className="inline-flex size-1.5 rounded-full bg-primary" />
                App Router · Prisma · NextAuth
              </p>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Manage your startup projects faster
              </h1>
              <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
                FlowBoard is a polished product-management workspace — dashboards, Kanban, analytics,
                and team workflows — engineered like a real SaaS, not a tutorial.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full justify-center sm:w-auto",
                  )}
                >
                  Get started <ArrowRight className="ml-2 size-4" />
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "w-full justify-center sm:w-auto",
                  )}
                >
                  Sign in
                </Link>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Seeded account: <span className="font-mono">admin@flowboard.demo</span> /{" "}
                <span className="font-mono">admin</span>
              </p>
            </div>

            <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3">
              <Card className="border bg-card/60 shadow-sm backdrop-blur md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Live workspace preview</CardTitle>
                  <CardDescription>
                    Sidebar navigation, dark mode, skeleton loaders, and guarded routes — ready to impress.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border bg-gradient-to-b from-muted/40 to-background p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {["Todo", "In progress", "Done"].map((c) => (
                        <div key={c} className="rounded-lg border bg-card/70 p-3">
                          <p className="text-xs font-medium text-muted-foreground">{c}</p>
                          <div className="mt-3 space-y-2">
                            <div className="h-10 rounded-md bg-muted/60" />
                            <div className="h-10 rounded-md bg-muted/40" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border bg-card/60 shadow-sm backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-base">Why teams pick FlowBoard</CardTitle>
                  <CardDescription>Clean architecture, scalable folders, and UI craft.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>✓ Zustand + server APIs</p>
                  <p>✓ Prisma + SQLite (swap to Postgres)</p>
                  <p>✓ NextAuth credentials</p>
                  <p>✓ Recharts analytics</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/20 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight">Everything you need to sell the vision</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Feature-rich, but still understandable — the sweet spot for stakeholder walkthroughs.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Card key={f.title} className="border bg-card/60 shadow-sm backdrop-blur">
                  <CardHeader className="space-y-3">
                    <div className="inline-flex size-10 items-center justify-center rounded-xl border bg-background shadow-sm">
                      <f.icon className="size-5" />
                    </div>
                    <CardTitle className="text-base">{f.title}</CardTitle>
                    <CardDescription>{f.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Ready to explore?</h3>
              <p className="text-sm text-muted-foreground">
                Jump into the dashboard and stress-test the experience.
              </p>
            </div>
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
              Get started
            </Link>
          </div>
        </section>

        <footer className="border-t py-10 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FlowBoard — built with Next.js + Prisma + Tailwind.
        </footer>
      </main>
    </div>
  );
}
