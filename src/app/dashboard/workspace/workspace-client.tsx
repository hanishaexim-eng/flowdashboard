"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrgRow = { id: string; name: string; slug: string; role: string };

export function WorkspaceClient({ initialOrgs }: { initialOrgs: OrgRow[] }) {
  const [orgs] = useState(initialOrgs);
  const [email, setEmail] = useState("");
  const [orgId, setOrgId] = useState(initialOrgs[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendInvite() {
    if (!orgId || !email.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/organizations/${orgId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as { inviteUrl?: string; error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Could not create invite.");
        return;
      }
      setMessage(`Invite link: ${data.inviteUrl}`);
      setEmail("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6 max-w-lg">
      <div className="rounded-lg border p-4">
        <h2 className="text-sm font-medium">Your organizations</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {orgs.length === 0 ? (
            <li className="text-muted-foreground">No workspace membership yet.</li>
          ) : (
            orgs.map((o) => (
              <li key={o.id} className="flex justify-between gap-2">
                <span>{o.name}</span>
                <span className="text-muted-foreground">{o.role}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      {orgs.some((o) => o.role === "OWNER" || o.role === "ADMIN") ? (
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-medium">Invite by email</h2>
          <p className="text-xs text-muted-foreground">
            Owners and admins can generate a 7-day link. The recipient must sign in with the same email.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="invite-org">Organization</Label>
            <select
              id="invite-org"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              {orgs
                .filter((o) => o.role === "OWNER" || o.role === "ADMIN")
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
            />
          </div>
          <Button type="button" onClick={sendInvite} disabled={loading || !email.trim()}>
            {loading ? "Creating…" : "Create invite link"}
          </Button>
          {message ? <p className="text-xs break-all text-muted-foreground">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
