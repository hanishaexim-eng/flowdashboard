# FlowBoard support playbook

Use this for walkthroughs, internal pilots, and first production cutovers.

## Before a walkthrough

1. Run `npm run build` and fix any errors.
2. Run `npm run demo:check` if available in your branch.
3. Confirm `.env` has `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL`.

## If data looks wrong

```bash
npm run db:reset
npm run db:seed
```

Note: `db:reset` is destructive. Do not run against production databases.

## During a walkthrough

- Keep one browser profile logged in as your primary seeded account.
- If the app misbehaves, restart `npm run dev` and retry before resetting the DB.
- Use role-specific accounts to validate access segregation:
  - `admin@flowboard.demo` / `admin` for full access
  - `rohan.kumar@flowboard.demo` / `rohan.kumar` for manager-level project operations
  - `divya.nair@flowboard.demo` / `divya.nair` for viewer-level restricted navigation

## Access troubleshooting

- If a screen is missing from the sidebar, verify the user role grants the `screen.*` permission for that route.
- If a user can see a route but API calls fail with `403`, verify project-level role assignment in Team management.
- If Team operations are blocked for managers, this is expected in the new RBAC policy (assignment is owner/admin scoped).

## Escalation

- **Database / migrations**: verify `npx prisma migrate deploy` against the target `DATABASE_URL`.
- **Auth**: ensure `AUTH_SECRET` is stable per environment and `AUTH_URL` matches the public origin.
- **Integrations**: webhooks require reachable HTTPS URLs in production; Slack rules use `SLACK_WEBHOOK_URL` or per-rule JSON `url` in automation payload.

## Positioning (one line)

**FlowBoard is Jira-style execution with Linear-style speed, but every status change requires accountable context and a permanent audit trail—built for teams that need flow governance without workflow spaghetti.**
