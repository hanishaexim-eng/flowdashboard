"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { z } from "zod";

import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_LOGIN_ACCOUNTS } from "@/lib/demo-credentials";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError("Please enter a valid email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });

      if (res?.error) {
        setFormError("Invalid email or password.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
        <Card className="border bg-card/60 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to continue to your workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/signup">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="border bg-muted/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Seeded accounts</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto text-xs">
            <ul className="space-y-2">
              {DEMO_LOGIN_ACCOUNTS.map((a) => (
                <li
                  key={a.email}
                  className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/50 p-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[13px] text-foreground">{a.email}</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setEmail(a.email);
                        setPassword(a.password);
                      }}
                    >
                      Fill
                    </Button>
                  </div>
                  <span className="text-muted-foreground">
                    Password: <strong className="text-foreground">{a.password}</strong> · {a.note}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
