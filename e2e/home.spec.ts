import { test, expect } from "@playwright/test";

test("home page responds", async ({ request }) => {
  const res = await request.get("/");
  expect(res.ok()).toBeTruthy();
  const text = await res.text();
  expect(text).toMatch(/FlowBoard/i);
});
