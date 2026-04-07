# FlowBoard SaaS PM Dashboard

Kanban-first project management dashboard with projects, tasks, team collaboration, analytics, and account settings.

## Quickstart

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env` (or keep the provided `.env` for local SQLite mode).

Required variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`

### 3) Set up database and seed sample data

```bash
npm run db:migrate
npm run db:seed
```

### 4) Start app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seeded Credentials

After `npm run db:seed`, accounts use `@flowboard.demo` with name-based local parts (for example `admin@flowboard.demo` / `admin`, `rohan.kumar@flowboard.demo` / `rohan.kumar`, `divya.nair@flowboard.demo` / `divya.nair`).

The login page lists and can auto-fill every seeded account with its password.

## Suggested walkthrough

1. Log in as `admin@flowboard.demo` (or another seeded account).
2. Go to `Projects`, create or open a board.
3. Use `New task` and board quick-add to create tasks.
4. Drag tasks across columns and reorder in the same column.
5. Open `Team`, invite a user and remove a non-owner member.
6. Open `Analytics` to show completion trends and project progress.
7. Open `Settings` and update profile/password.

## Governance Mode (FlowBoard vs Jira)

FlowBoard now runs in a strict transition mode designed for execution accountability:

- Every status move requires:
  - feedback,
  - issue faced,
  - acceptance note.
- Reopen transitions (`DONE -> IN_PROGRESS`) require an explicit reopen reason.
- Direct skip (`TODO -> DONE`) is blocked unless an authorized override is used.
- Every transition is permanently logged and replayable in task history + analytics.

### Why this is different from Jira

- Jira tracks workflow states; FlowBoard enforces **decision quality per movement**.
- FlowBoard highlights **flow reversibility risk** via reopen/override metrics.
- FlowBoard includes **Flow Quality Score** and **Flow Replay** for bottleneck storytelling.

## Roles and Dashboards

Project roles:

- `OWNER`
- `ADMIN`
- `MANAGER`
- `DEVELOPER`
- `VIEWER`

Permission model highlights:

- Owners/Admins can assign project visibility and manage members.
- Reopening and workflow overrides are restricted to elevated roles.
- Viewers have read-first behavior.

### Screen access matrix (RBAC)

- `OWNER`, `ADMIN`: Overview, Projects, Team, Analytics, Admin, Workspace, Settings
- `MANAGER`: Overview, Projects, Team, Analytics, Settings
- `DEVELOPER`, `MEMBER`, `VIEWER`: Overview, Projects, Analytics, Settings

Dashboard split:

- `/dashboard` adapts cards for admin/manager governance context.
- `/dashboard/admin` provides governance KPIs (flow quality, reopens, overrides).

## Support Runbook (Pre-walkthrough)

### T-30 min checks

```bash
npm run build
npm run demo:check
```

### If data looks wrong

```bash
npm run db:reset
npm run db:seed
npm run demo:check
```

### During walkthrough fallback

- Keep one browser tab logged in as `admin@flowboard.demo`.
- Keep `npm run db:reset && npm run db:seed` ready for fast recovery.

## Governance Walkthrough Script

1. Login as `admin@flowboard.demo`.
2. Open `/dashboard/projects` and enter a board.
3. Move a task from `TODO` to `IN_PROGRESS`; fill mandatory transition fields.
4. Move a task to `DONE`; show transition records in task details.
5. Attempt unauthorized or invalid move logic (e.g. direct skip) to show guardrails.
6. Open `/dashboard/team`; change a member role and remove a non-owner member.
7. Open `/dashboard/admin`; present flow quality score, reopen count, override count.
8. Open `/dashboard/analytics`; present flow replay timeline with issue context.

## Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run db:migrate` - run Prisma migrations
- `npm run db:reset` - reset DB and apply migrations
- `npm run db:seed` - seed sample data
- `npm run demo:check` - verify seeded data health
- `npm run test:e2e` - Playwright smoke tests (requires `npm run build` first for `next start`)

## Production database

Point `DATABASE_URL` at PostgreSQL (Neon, RDS, Supabase, etc.) and run `npx prisma migrate deploy` in CI/CD before deploy. SQLite is intended for local use only.

## Observability

- `GET /api/health` — liveness and DB connectivity for load balancers and deploy hooks.

## Positioning

**FlowBoard** pairs fast Kanban and list views with mandatory transition context and a durable audit trail—aimed at teams that outgrow ad-hoc task tools but do not want Jira-level complexity. See [SUPPORT.md](./SUPPORT.md) for the support playbook and a one-line pitch.
