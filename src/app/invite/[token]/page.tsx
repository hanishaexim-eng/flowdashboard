"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export default function InvitePage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const { data: session, status } = useSession();
  const router = useRouter();
  const [info, setInfo] = useState<{
    email: string;
    organizationName: string;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const res = await fetch(`/api/invites/${token}`);
      if (!res.ok) {
        setErr("This invite is invalid or expired.");
        return;
      }
      const data = (await res.json()) as { email: string; organizationName: string };
      setInfo(data);
    })();
  }, [token]);

  async function accept() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/invites/${token}`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setErr(data.error ?? "Could not accept invite.");
        return;
      }
      router.push("/dashboard/workspace");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!info && !err) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading invite…</p>
      </div>
    );
  }

  if (err || !info) {
    return (
      <div className="mx-auto max-w-md p-6">
        <p className="text-sm text-destructive">{err}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-lg font-semibold">Join {info.organizationName}</h1>
      <p className="text-sm text-muted-foreground">
        This invite is for <strong>{info.email}</strong>. Sign in with that account, then accept.
      </p>
      {status === "loading" ? (
        <p className="text-sm text-muted-foreground">Checking session…</p>
      ) : !session ? (
        <Button type="button" onClick={() => router.push(`/login?callbackUrl=/invite/${token}`)}>
          Sign in to accept
        </Button>
      ) : session.user?.email?.toLowerCase() !== info.email.toLowerCase() ? (
        <p className="text-sm text-destructive">
          You are signed in as {session.user.email}. Switch accounts to match the invite email.
        </p>
      ) : (
        <Button type="button" onClick={accept} disabled={busy}>
          {busy ? "Joining…" : "Accept invite"}
        </Button>
      )}
    </div>
  );
}
