import { createHmac } from "crypto";

import type { TaskStatus } from "@prisma/client";

import { createNotification } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export async function runPostTransitionHooks(opts: {
  projectId: string;
  taskId: string;
  taskTitle: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
}) {
  const [hooks, rules, project] = await Promise.all([
    prisma.webhookSubscription.findMany({
      where: { projectId: opts.projectId, active: true },
    }),
    prisma.automationRule.findMany({
      where: { projectId: opts.projectId, enabled: true },
    }),
    prisma.project.findUnique({
      where: { id: opts.projectId },
      select: { ownerId: true, name: true },
    }),
  ]);

  const payload = {
    event: "task.transitioned",
    taskId: opts.taskId,
    projectId: opts.projectId,
    fromStatus: opts.fromStatus,
    toStatus: opts.toStatus,
    taskTitle: opts.taskTitle,
    at: new Date().toISOString(),
  };
  const body = JSON.stringify(payload);

  for (const h of hooks) {
    let events: string[] = [];
    try {
      events = JSON.parse(h.events) as string[];
    } catch {
      events = ["task.transitioned"];
    }
    if (!events.includes("task.transitioned") && !events.includes("*")) continue;
    const sig = h.secret
      ? createHmac("sha256", h.secret).update(body).digest("hex")
      : "";
    try {
      await fetch(h.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sig ? { "X-FlowBoard-Signature": sig } : {}),
        },
        body,
      });
    } catch {
      /* delivery failure is non-fatal */
    }
  }

  const triggerKey = `to_${opts.toStatus}`;

  for (const r of rules) {
    if (r.trigger !== triggerKey && r.trigger !== "any_transition") continue;
    if (r.action === "notify_owner" && project) {
      await createNotification({
        userId: project.ownerId,
        type: "automation.transition",
        title: "Task moved",
        body: opts.taskTitle,
        link: `/dashboard/projects/${opts.projectId}`,
      });
    }
    if (r.action === "slack_incoming") {
      let url = process.env.SLACK_WEBHOOK_URL ?? "";
      try {
        const p = JSON.parse(r.payload) as { url?: string };
        if (p.url) url = p.url;
      } catch {
        /* noop */
      }
      if (!url) continue;
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `*${project?.name ?? "Project"}*: ${opts.taskTitle} → ${opts.toStatus}`,
          }),
        });
      } catch {
        /* noop */
      }
    }
  }
}
