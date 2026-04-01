"use client";

import { Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Props = {
  initialName: string;
  initialEmail: string;
};

export function SettingsForm({ initialName, initialEmail }: Props) {
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  async function handleSaveProfile() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ...(newPassword
            ? { currentPassword, newPassword }
            : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Could not save settings.");
        return;
      }
      setMessage("Saved.");
      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border bg-card/60 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Update your display name and password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={initialEmail} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label htmlFor="current">Current password</Label>
            <Input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newp">New password</Label>
            <Input
              id="newp"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to keep your current password.
            </p>
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSaveProfile} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border bg-card/60 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Toggle light/dark mode for the workspace.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">Persists on this device.</p>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>
    </div>
  );
}
