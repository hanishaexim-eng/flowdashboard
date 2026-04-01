import { test, expect } from "@playwright/test";

test("health endpoint reports ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { ok: boolean; db?: string };
  expect(body.ok).toBe(true);
});
