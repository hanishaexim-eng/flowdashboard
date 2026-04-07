import { hash } from "bcryptjs";
import {
  MemberRole,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";

import { prisma } from "../src/lib/prisma";

const P1 = "seed-project-launch";
const P2 = "seed-project-growth";
const P3 = "seed-project-mobile";
const P4 = "seed-project-support";
const P5 = "seed-project-data";
const P6 = "seed-project-healthcare";
const P7 = "seed-project-fintech";
const P8 = "seed-project-retail";
const P9 = "seed-project-manufacturing";
const P10 = "seed-project-edtech";

const ALL_PROJECT_IDS = [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10];

/** Admin uses `admin`; team members use `firstname.lastname` as password (matches email local part). */
const DEMO_ADMIN = {
  email: "admin@flowboard.demo",
  password: "admin",
  name: "Admin User",
} as const;

/** Order matches u(1)…u(15) in project memberships below. */
const DEMO_TEAM = [
  { email: "rohan.kumar@flowboard.demo", password: "rohan.kumar", name: "Rohan Kumar" },
  { email: "meera.nair@flowboard.demo", password: "meera.nair", name: "Meera Nair" },
  { email: "arjun.das@flowboard.demo", password: "arjun.das", name: "Arjun Das" },
  { email: "kavya.singh@flowboard.demo", password: "kavya.singh", name: "Kavya Singh" },
  { email: "ananya.desai@flowboard.demo", password: "ananya.desai", name: "Ananya Desai" },
  { email: "rahul.verma@flowboard.demo", password: "rahul.verma", name: "Rahul Verma" },
  { email: "priya.menon@flowboard.demo", password: "priya.menon", name: "Dr. Priya Menon" },
  { email: "sanjay.iyer@flowboard.demo", password: "sanjay.iyer", name: "Sanjay Iyer" },
  { email: "neha.kapoor@flowboard.demo", password: "neha.kapoor", name: "Neha Kapoor" },
  { email: "deepak.rao@flowboard.demo", password: "deepak.rao", name: "Deepak Rao" },
  { email: "ishita.bose@flowboard.demo", password: "ishita.bose", name: "Ishita Bose" },
  { email: "karan.malhotra@flowboard.demo", password: "karan.malhotra", name: "Karan Malhotra" },
  { email: "sneha.reddy@flowboard.demo", password: "sneha.reddy", name: "Sneha Reddy" },
  { email: "amit.joshi@flowboard.demo", password: "amit.joshi", name: "Amit Joshi" },
  { email: "divya.nair@flowboard.demo", password: "divya.nair", name: "Divya Nair" },
] as const;

const LEGACY_DEMO_EMAILS = [
  "adminuser@gmail.com",
  ...Array.from({ length: 15 }, (_, i) => `user${i + 1}@gmail.com`),
];

/** Previous role-based seed emails (delete on re-seed so DB does not keep stale users). */
const LEGACY_ROLE_BASED_EMAILS = [
  "pm@flowboard.demo",
  "engineer@flowboard.demo",
  "developer@flowboard.demo",
  "support@flowboard.demo",
  "design@flowboard.demo",
  "data@flowboard.demo",
  "health@flowboard.demo",
  "finance@flowboard.demo",
  "retail@flowboard.demo",
  "mfg@flowboard.demo",
  "edu@flowboard.demo",
  "legal@flowboard.demo",
  "marketing@flowboard.demo",
  "qa@flowboard.demo",
  "viewer@flowboard.demo",
] as const;

/** Optional: prior experimental `firstname+tag@` seeds — safe to delete if absent. */
const LEGACY_PLUS_TAG_EMAILS = [
  "rohan+q2launch@flowboard.demo",
  "meera+mobile@flowboard.demo",
  "arjun+growth@flowboard.demo",
  "kavya+support@flowboard.demo",
  "ananya+edtech@flowboard.demo",
  "rahul+data@flowboard.demo",
  "priya+healthcare@flowboard.demo",
  "sanjay+fintech@flowboard.demo",
  "neha+retail@flowboard.demo",
  "deepak+manufacturing@flowboard.demo",
  "ishita+edtech@flowboard.demo",
  "karan+healthcare@flowboard.demo",
  "sneha+retail@flowboard.demo",
  "amit+mobile@flowboard.demo",
  "divya+healthcare@flowboard.demo",
] as const;

const ALL_DEMO_EMAILS = [DEMO_ADMIN.email, ...DEMO_TEAM.map((t) => t.email)];

type TaskSeed = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels?: string[];
};

async function seedTasksForProject(
  projectId: string,
  tasks: TaskSeed[],
  assigneeIds: (string | null)[],
) {
  const pos = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  let idx = 0;
  for (const t of tasks) {
    const assigneeId = assigneeIds[idx % assigneeIds.length];
    idx++;
    const position = pos[t.status]++;
    await prisma.task.create({
      data: {
        id: `${projectId}-t${idx}`,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        position,
        projectId,
        assigneeId,
        labels: t.labels?.length ? JSON.stringify(t.labels) : "[]",
      },
    });
  }
}

async function main() {
  await prisma.taskTransition.deleteMany({ where: { projectId: { in: ALL_PROJECT_IDS } } });
  await prisma.taskComment.deleteMany({ where: { projectId: { in: ALL_PROJECT_IDS } } });
  await prisma.activity.deleteMany({ where: { projectId: { in: ALL_PROJECT_IDS } } });
  await prisma.task.deleteMany({ where: { projectId: { in: ALL_PROJECT_IDS } } });
  await prisma.projectMember.deleteMany({ where: { projectId: { in: ALL_PROJECT_IDS } } });
  await prisma.project.deleteMany({ where: { id: { in: ALL_PROJECT_IDS } } });
  await prisma.workspaceInvite.deleteMany({});
  await prisma.organizationMember.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [...ALL_DEMO_EMAILS, ...LEGACY_DEMO_EMAILS, ...LEGACY_ROLE_BASED_EMAILS, ...LEGACY_PLUS_TAG_EMAILS],
      },
    },
  });

  const adminHash = await hash(DEMO_ADMIN.password, 12);
  const admin = await prisma.user.create({
    data: {
      email: DEMO_ADMIN.email,
      name: DEMO_ADMIN.name,
      passwordHash: adminHash,
    },
  });

  const users: { id: string }[] = [];
  for (const member of DEMO_TEAM) {
    const row = await prisma.user.create({
      data: {
        email: member.email,
        name: member.name,
        passwordHash: await hash(member.password, 12),
      },
    });
    users.push(row);
  }

  const u = (n: number) => users[n - 1].id;

  const demoOrg = await prisma.organization.create({
    data: {
      name: "FlowBoard",
      slug: "flowboard-demo",
    },
  });

  await prisma.organizationMember.createMany({
    data: [
      { organizationId: demoOrg.id, userId: admin.id, role: "OWNER" },
      ...users.map((usr) => ({
        organizationId: demoOrg.id,
        userId: usr.id,
        role: "MEMBER",
      })),
    ],
  });

  const p1 = await prisma.project.create({
    data: {
      id: P1,
      name: "Q2 Product Launch (SaaS)",
      description: "Launch billing, onboarding, and reporting for enterprise pilot.",
      color: "#6366f1",
      ownerId: admin.id,
      organizationId: demoOrg.id,
    },
  });
  const p2 = await prisma.project.create({
    data: {
      id: P2,
      name: "Growth Funnel Optimization",
      description: "Improve conversion from signup to activated account.",
      color: "#22c55e",
      ownerId: admin.id,
      organizationId: demoOrg.id,
    },
  });
  const p3 = await prisma.project.create({
    data: {
      id: P3,
      name: "Mobile App Stability Sprint",
      description: "Resolve beta defects and release v1.1 patch.",
      color: "#f97316",
      ownerId: admin.id,
      organizationId: demoOrg.id,
    },
  });
  const p4 = await prisma.project.create({
    data: {
      id: P4,
      name: "Customer Support Automation",
      description: "Reduce first-response time with automation playbooks.",
      color: "#0ea5e9",
      ownerId: admin.id,
      organizationId: demoOrg.id,
    },
  });
  const p5 = await prisma.project.create({
    data: {
      id: P5,
      name: "Data Pipeline Reliability",
      description: "Stabilize ingestion jobs and SLA monitoring for BI dashboards.",
      color: "#8b5cf6",
      ownerId: admin.id,
      organizationId: demoOrg.id,
    },
  });
  const p6 = await prisma.project.create({
    data: {
      id: P6,
      name: "Healthcare · EHR & HIPAA",
      description: "Patient portal, PHI handling, and audit readiness for clinic network.",
      color: "#14b8a6",
      ownerId: admin.id,
      organizationId: demoOrg.id,
    },
  });
  const p7 = await prisma.project.create({
    data: {
      id: P7,
      name: "Fintech · Payments & KYC",
      description: "Card flows, PCI scope, and identity verification for neobank launch.",
      color: "#eab308",
      ownerId: admin.id,
      organizationId: demoOrg.id,
    },
  });
  const p8 = await prisma.project.create({
    data: {
      id: P8,
      name: "Retail · Omnichannel OMS",
      description: "Inventory sync across stores, DC, and marketplace channels.",
      color: "#ec4899",
      ownerId: admin.id,
      organizationId: demoOrg.id,
    },
  });
  const p9 = await prisma.project.create({
    data: {
      id: P9,
      name: "Manufacturing · Quality & IoT",
      description: "Line downtime alerts, CAPA, and sensor telemetry dashboards.",
      color: "#64748b",
      ownerId: admin.id,
      organizationId: demoOrg.id,
    },
  });
  const p10 = await prisma.project.create({
    data: {
      id: P10,
      name: "EdTech · LMS Rollout",
      description: "District rollout, SSO for students, and content compliance.",
      color: "#a855f7",
      ownerId: admin.id,
      organizationId: demoOrg.id,
    },
  });

  await prisma.projectMember.createMany({
    data: [
      { projectId: p1.id, userId: admin.id, role: MemberRole.OWNER },
      { projectId: p1.id, userId: u(1), role: MemberRole.MANAGER },
      { projectId: p1.id, userId: u(2), role: MemberRole.DEVELOPER },
      { projectId: p1.id, userId: u(5), role: MemberRole.DEVELOPER },
      { projectId: p1.id, userId: u(13), role: MemberRole.MEMBER },
      { projectId: p2.id, userId: admin.id, role: MemberRole.OWNER },
      { projectId: p2.id, userId: u(3), role: MemberRole.ADMIN },
      { projectId: p2.id, userId: u(1), role: MemberRole.DEVELOPER },
      { projectId: p2.id, userId: u(13), role: MemberRole.MEMBER },
      { projectId: p3.id, userId: admin.id, role: MemberRole.OWNER },
      { projectId: p3.id, userId: u(2), role: MemberRole.DEVELOPER },
      { projectId: p3.id, userId: u(4), role: MemberRole.VIEWER },
      { projectId: p3.id, userId: u(14), role: MemberRole.DEVELOPER },
      { projectId: p4.id, userId: admin.id, role: MemberRole.OWNER },
      { projectId: p4.id, userId: u(4), role: MemberRole.MANAGER },
      { projectId: p4.id, userId: u(1), role: MemberRole.MEMBER },
      { projectId: p5.id, userId: admin.id, role: MemberRole.OWNER },
      { projectId: p5.id, userId: u(3), role: MemberRole.DEVELOPER },
      { projectId: p5.id, userId: u(6), role: MemberRole.DEVELOPER },
      { projectId: p6.id, userId: admin.id, role: MemberRole.OWNER },
      { projectId: p6.id, userId: u(7), role: MemberRole.MANAGER },
      { projectId: p6.id, userId: u(12), role: MemberRole.DEVELOPER },
      { projectId: p6.id, userId: u(15), role: MemberRole.VIEWER },
      { projectId: p7.id, userId: admin.id, role: MemberRole.OWNER },
      { projectId: p7.id, userId: u(8), role: MemberRole.ADMIN },
      { projectId: p7.id, userId: u(12), role: MemberRole.DEVELOPER },
      { projectId: p7.id, userId: u(1), role: MemberRole.MEMBER },
      { projectId: p8.id, userId: admin.id, role: MemberRole.OWNER },
      { projectId: p8.id, userId: u(9), role: MemberRole.MANAGER },
      { projectId: p8.id, userId: u(13), role: MemberRole.DEVELOPER },
      { projectId: p8.id, userId: u(4), role: MemberRole.MEMBER },
      { projectId: p9.id, userId: admin.id, role: MemberRole.OWNER },
      { projectId: p9.id, userId: u(10), role: MemberRole.MANAGER },
      { projectId: p9.id, userId: u(6), role: MemberRole.DEVELOPER },
      { projectId: p9.id, userId: u(14), role: MemberRole.DEVELOPER },
      { projectId: p10.id, userId: admin.id, role: MemberRole.OWNER },
      { projectId: p10.id, userId: u(11), role: MemberRole.ADMIN },
      { projectId: p10.id, userId: u(5), role: MemberRole.DEVELOPER },
      { projectId: p10.id, userId: u(15), role: MemberRole.VIEWER },
    ],
  });

  const pool = [admin.id, u(1), u(2), u(3), u(4), u(5), u(6)];

  await seedTasksForProject(P1, [
    {
      title: "Design system tokens",
      description: "Finalize color, radius, and typography tokens for v2 UI kit.",
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      labels: ["design", "ux"],
    },
    {
      title: "Kanban drag interactions",
      description: "Optimistic updates and collision handling for board moves.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      labels: ["frontend", "dnd"],
    },
    {
      title: "Analytics charts for governance",
      description: "Flow quality and reopen rate visualizations.",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      labels: ["analytics"],
    },
    {
      title: "Enterprise SSO discovery",
      description: "Document IdP requirements for pilot customers.",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      labels: ["enterprise", "auth"],
    },
    {
      title: "Billing webhook retries",
      description: "Exponential backoff for Stripe webhook failures.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      labels: ["billing", "reliability"],
    },
    {
      title: "Onboarding checklist templates",
      description: "Admin-configurable steps for new workspace members.",
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      labels: ["onboarding"],
    },
    {
      title: "API rate limit headers",
      description: "Return X-RateLimit-* on public API for partners.",
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      labels: ["api"],
    },
    {
      title: "Seed data for staging environments",
      description: "Realistic multi-industry tasks and users.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.LOW,
      labels: ["seed"],
    },
    {
      title: "Export audit trail CSV",
      description: "Compliance export for transition history.",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      labels: ["compliance", "export"],
    },
    {
      title: "Mobile responsive nav",
      description: "Sidebar collapse and touch targets on small screens.",
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      labels: ["mobile", "ux"],
    },
    {
      title: "Feature flags for pilot",
      description: "LaunchDarkly wiring for billing module.",
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      labels: ["infra"],
    },
    {
      title: "Pen test remediation",
      description: "Address findings from external security assessment.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      labels: ["security"],
    },
  ], pool);

  await seedTasksForProject(P2, [
    { title: "Optimize pricing page CTA funnel", description: "A/B hero copy and sticky CTA.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["growth", "web"] },
    { title: "Build referral attribution dashboard", description: "UTM + referral codes in warehouse.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["data"] },
    { title: "Lifecycle email activation journey", description: "Day 0–14 sequences for new signups.", status: TaskStatus.DONE, priority: TaskPriority.HIGH, labels: ["email"] },
    { title: "SEO landing for competitor keywords", description: "Three pages targeting evaluation intent.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["seo"] },
    { title: "In-app upgrade prompts", description: "Contextual upsell for premium tier.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["product"] },
    { title: "Churn cohort analysis", description: "Monthly report for CS leadership.", status: TaskStatus.TODO, priority: TaskPriority.LOW, labels: ["analytics"] },
    { title: "Partner co-marketing landing", description: "Joint page with integration partner.", status: TaskStatus.DONE, priority: TaskPriority.LOW, labels: ["marketing"] },
    { title: "Free trial length experiment", description: "14 vs 21 day trial conversion.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["experiment"] },
    { title: "Signup friction audit", description: "Reduce fields in step 1 of registration.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["ux"] },
    { title: "Paid ads creative refresh", description: "New carousel assets for LinkedIn.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["ads"] },
    { title: "Win/loss interview synthesis", description: "Q1 themes for product roadmap.", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, labels: ["sales"] },
    { title: "Annual plan discount messaging", description: "Align with finance on approved bands.", status: TaskStatus.TODO, priority: TaskPriority.LOW, labels: ["pricing"] },
  ], [admin.id, u(1), u(3), u(13)]);

  await seedTasksForProject(P3, [
    { title: "Fix Android crash on login callback", description: "Null pointer in WebViewClient.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["android", "bug"] },
    { title: "Regression suite for push notifications", description: "iOS + Android background delivery.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["qa", "mobile"] },
    { title: "Offline mode for task list", description: "Read-only cache with sync conflict rules.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["mobile"] },
    { title: "App Store screenshot update", description: "Reflect new governance features.", status: TaskStatus.DONE, priority: TaskPriority.LOW, labels: ["release"] },
    { title: "Biometric login option", description: "Face ID / fingerprint on supported devices.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["security"] },
    { title: "Deep link from email to task", description: "Universal links for assignee notifications.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["links"] },
    { title: "Battery usage profiling", description: "Reduce wakeups from polling.", status: TaskStatus.TODO, priority: TaskPriority.LOW, labels: ["perf"] },
    { title: "Beta feedback triage", description: "Label and route TestFlight reports.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["support"] },
    { title: "Tablet layout for board", description: "Two-column split on iPad.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["ux"] },
    { title: "v1.1 release checklist", description: "Go/no-go with support and CS.", status: TaskStatus.DONE, priority: TaskPriority.HIGH, labels: ["release"] },
  ], [u(2), u(14), admin.id]);

  await seedTasksForProject(P4, [
    { title: "Auto-route L1 tickets by intent", description: "Classifier model v2 with confidence.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["ml", "support"] },
    { title: "Escalation SOP for billing failures", description: "Runbook for finance-impacting cases.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["process"] },
    { title: "CSAT survey after resolved ticket", description: "In-app micro-survey.", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, labels: ["feedback"] },
    { title: "Macro library for common replies", description: "25 templates for tier-1.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["content"] },
    { title: "SLA breach dashboard", description: "Real-time queue age by priority.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["ops"] },
    { title: "Zendesk ↔ FlowBoard sync", description: "Webhook bridge for status updates.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["integration"] },
    { title: "On-call rotation schedule", description: "PagerDuty integration.", status: TaskStatus.DONE, priority: TaskPriority.LOW, labels: ["ops"] },
    { title: "Knowledge base article audit", description: "Top 50 articles refreshed for Q2.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.LOW, labels: ["docs"] },
    { title: "VIP customer tagging", description: "Auto-tag from contract tier.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["crm"] },
    { title: "Chatbot handoff improvements", description: "Reduce false positives before human queue.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["ai"] },
  ], [u(4), u(1), admin.id]);

  await seedTasksForProject(P5, [
    { title: "Retry policy for failed ingestion jobs", description: "DLQ + dead letter alerts.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["data", "reliability"] },
    { title: "SLA breach alerting in Grafana", description: "Pager when lag > 15 min.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["observability"] },
    { title: "Backfill historical events", description: "One-time reprocess for Q4 gap.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["pipeline"] },
    { title: "Schema evolution for events v3", description: "Avro compatibility checks in CI.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["schema"] },
    { title: "Cost optimization for Snowflake", description: "Warehouse auto-suspend tuning.", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, labels: ["cost"] },
    { title: "PII masking in logs", description: "Redact email fields in Spark jobs.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["privacy"] },
    { title: "Data quality checks on facts table", description: "Great Expectations suite.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["quality"] },
    { title: "Real-time stream for analytics", description: "Kafka → ClickHouse path.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["streaming"] },
    { title: "On-call runbook for pipeline failures", description: "Step-by-step recovery.", status: TaskStatus.DONE, priority: TaskPriority.LOW, labels: ["docs"] },
    { title: "Partition pruning audit", description: "Query perf on large tables.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.LOW, labels: ["perf"] },
    { title: "GDPR deletion workflow", description: "Cascading deletes across marts.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["compliance"] },
  ], [u(3), u(6), admin.id]);

  await seedTasksForProject(P6, [
    { title: "PHI access audit remediation", description: "Close findings from HIPAA assessment.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["hipaa", "compliance"] },
    { title: "Patient portal SSO for 3 clinics", description: "SAML with IdP metadata exchange.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["sso"] },
    { title: "Consent capture for telehealth", description: "Recording and storage policy.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["legal"] },
    { title: "HL7 FHIR read API for labs", description: "R4 endpoints for observation results.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["interop"] },
    { title: "Break-glass access workflow", description: "Emergency access logging and review.", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, labels: ["security"] },
    { title: "E-prescribing integration", description: "Third-party vendor certification.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["integration"] },
    { title: "Clinical notes retention policy", description: "7-year archive per state rules.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["policy"] },
    { title: "Mobile app accessibility for WCAG", description: "Screen reader labels on key flows.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["a11y"] },
    { title: "Vaccination module pilot", description: "Scheduling + inventory for flu season.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.LOW, labels: ["product"] },
    { title: "BAA renewal with cloud vendor", description: "Legal review before Q3.", status: TaskStatus.DONE, priority: TaskPriority.HIGH, labels: ["vendor"] },
    { title: "Audit log export for regulators", description: "CSV bundle of transition history.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["audit"] },
    { title: "Nurse shift handoff checklist", description: "Workflow template in FlowBoard.", status: TaskStatus.TODO, priority: TaskPriority.LOW, labels: ["workflow"] },
  ], [u(7), u(12), admin.id, u(15)]);

  await seedTasksForProject(P7, [
    { title: "PCI SAQ scope reduction", description: "Tokenize card data before app tier.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["pci", "security"] },
    { title: "KYC document verification flow", description: "ID + selfie match vendor integration.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["kyc"] },
    { title: "3DS2 for EU card payments", description: "SCA compliance for cross-border.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["payments"] },
    { title: "Fraud rules engine tuning", description: "Reduce false positives on low-risk users.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["fraud"] },
    { title: "Ledger reconciliation job", description: "Nightly match with processor files.", status: TaskStatus.DONE, priority: TaskPriority.HIGH, labels: ["finance"] },
    { title: "Regulatory reporting for transactions", description: "Monthly CSV to local authority.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["reporting"] },
    { title: "Sandbox API keys for partners", description: "Self-service rotation.", status: TaskStatus.TODO, priority: TaskPriority.LOW, labels: ["devx"] },
    { title: "Chargeback dispute workflow", description: "Evidence upload and deadlines.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["ops"] },
    { title: "Interest calculation engine", description: "Savings product accrual.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["core"] },
    { title: "AML watchlist screening batch", description: "Daily OFAC updates.", status: TaskStatus.DONE, priority: TaskPriority.HIGH, labels: ["compliance"] },
    { title: "Mobile banking passcode policy", description: "6-digit + lockout rules.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["mobile"] },
    { title: "Partner bank API certification", description: "Cert environment sign-off.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["integration"] },
  ], [u(8), u(12), admin.id, u(1)]);

  await seedTasksForProject(P8, [
    { title: "OMS inventory sync latency", description: "Sub-5 min store ↔ DC sync.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["oms", "inventory"] },
    { title: "Buy online pickup in store", description: "BOPIS slotting and pickup codes.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["fulfillment"] },
    { title: "Marketplace SKU mapping", description: "Amazon + Shopify attribute mapping.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["channels"] },
    { title: "Return fraud detection", description: "Velocity rules on high-risk SKUs.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["fraud"] },
    { title: "Store associate mobile app", description: "Task list for floor replenishment.", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, labels: ["store"] },
    { title: "Seasonal allocation planner", description: "Winter assortment push.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["planning"] },
    { title: "Gift card balance API", description: "Partner redemption endpoints.", status: TaskStatus.TODO, priority: TaskPriority.LOW, labels: ["api"] },
    { title: "DC conveyor downtime alert", description: "IoT sensor thresholds.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["ops"] },
    { title: "Customer loyalty tier migration", description: "Points balance cutover.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["crm"] },
    { title: "Pricing engine for regional promos", description: "ZIP-based rules.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["pricing"] },
    { title: "Last-mile carrier SLA dashboard", description: "On-time delivery by carrier.", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, labels: ["logistics"] },
    { title: "Store WiFi captive portal", description: "Marketing opt-in for walk-ins.", status: TaskStatus.TODO, priority: TaskPriority.LOW, labels: ["marketing"] },
  ], [u(9), u(13), u(4), admin.id]);

  await seedTasksForProject(P9, [
    { title: "CAPA for line 3 defect rate", description: "Root cause and corrective actions.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["quality", "capa"] },
    { title: "IoT vibration sensor calibration", description: "Baseline drift detection.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["iot"] },
    { title: "MES batch traceability", description: "Lot genealogy for recalls.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["traceability"] },
    { title: "Operator training for new HMI", description: "Floor certification before go-live.", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, labels: ["training"] },
    { title: "Predictive maintenance model v2", description: "Failure prediction horizon 48h.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["ml"] },
    { title: "Supplier quality scorecard", description: "Monthly vendor ratings.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["procurement"] },
    { title: "Energy consumption per unit KPI", description: "Dashboard for plant leadership.", status: TaskStatus.TODO, priority: TaskPriority.LOW, labels: ["sustainability"] },
    { title: "Andon integration for line stops", description: "Push to FlowBoard as incident tasks.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["integration"] },
    { title: "ISO 9001 audit prep", description: "Document control checklist.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["audit"] },
    { title: "Spare parts inventory min/max", description: "Auto-reorder rules.", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, labels: ["inventory"] },
    { title: "Shift handover digital log", description: "Replace paper for three shifts.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.LOW, labels: ["workflow"] },
  ], [u(10), u(6), u(14), admin.id]);

  await seedTasksForProject(P10, [
    { title: "District SSO with Google Classroom", description: "OAuth scopes for roster sync.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["sso", "edtech"] },
    { title: "FERPA compliance review for analytics", description: "Student data minimization.", status: TaskStatus.TODO, priority: TaskPriority.HIGH, labels: ["compliance"] },
    { title: "Teacher assignment rubric templates", description: "Shareable across schools.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, labels: ["product"] },
    { title: "Parent portal language packs", description: "ES + FR for pilot district.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["i18n"] },
    { title: "Content moderation workflow", description: "Flag user-generated discussion posts.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["trust"] },
    { title: "LMS SCORM package import", description: "1.2 player compatibility.", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, labels: ["lms"] },
    { title: "Attendance reporting for admins", description: "Daily CSV export.", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, labels: ["reporting"] },
    { title: "Accessibility audit for WCAG 2.1 AA", description: "Remediation backlog.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["a11y"] },
    { title: "Summer school course cloning", description: "Bulk copy with date shift.", status: TaskStatus.TODO, priority: TaskPriority.LOW, labels: ["ops"] },
    { title: "Integration with SIS for grades", description: "Read-only GPA sync.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, labels: ["integration"] },
    { title: "Student data deletion on request", description: "GDPR/FERPA workflow.", status: TaskStatus.DONE, priority: TaskPriority.HIGH, labels: ["privacy"] },
    { title: "Professional development credits tracking", description: "CEU accumulation for teachers.", status: TaskStatus.TODO, priority: TaskPriority.LOW, labels: ["feature"] },
  ], [u(11), u(5), admin.id, u(15)]);

  await prisma.activity.createMany({
    data: ALL_PROJECT_IDS.map((pid) => ({
      projectId: pid,
      userId: admin.id,
      type: "project.created",
      message: `Seeded project ${pid}`,
    })),
  });

  await prisma.taskTransition.createMany({
    data: [
      {
        taskId: `${P1}-t2`,
        projectId: p1.id,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        movedById: u(1),
        feedback: "Prioritized for governance release",
        issueFaced: "Dependency on chart library",
        acceptanceNote: "Scope agreed with design",
        metadata: "{}",
      },
      {
        taskId: `${P2}-t3`,
        projectId: p2.id,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.DONE,
        movedById: admin.id,
        feedback: "Lifecycle emails live in production",
        issueFaced: "Minor copy tweaks",
        acceptanceNote: "QA sign-off complete",
        metadata: "{}",
      },
      {
        taskId: `${P6}-t1`,
        projectId: p6.id,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        movedById: u(7),
        feedback: "Clinic onboarding kickoff",
        issueFaced: "IdP cert rotation",
        acceptanceNote: "Pilot timeline locked",
        metadata: "{}",
      },
    ],
  });

  await prisma.taskComment.createMany({
    data: [
      {
        taskId: `${P1}-t2`,
        projectId: p1.id,
        authorId: u(1),
        message: "Started API integration — waiting on **contract** confirmation from backend.",
      },
      {
        taskId: `${P1}-t2`,
        projectId: p1.id,
        authorId: admin.id,
        message: "Contract shared in Slack. Continue with optimistic updates.",
      },
      {
        taskId: `${P1}-t5`,
        projectId: p1.id,
        authorId: u(2),
        message: "Retry policy drafted; need Stripe dashboard screenshots for runbook.",
      },
      {
        taskId: `${P4}-t1`,
        projectId: p4.id,
        authorId: u(4),
        message: "Intent classifier needs 30+ more labeled tickets for 95% confidence.",
      },
      {
        taskId: `${P6}-t1`,
        projectId: p6.id,
        authorId: u(7),
        message: "Meeting with compliance Thursday — attach findings to this task.",
      },
      {
        taskId: `${P7}-t1`,
        projectId: p7.id,
        authorId: u(8),
        message: "Tokenization vendor shortlist: A, B, C — decision by EOW.",
      },
      {
        taskId: `${P8}-t1`,
        projectId: p8.id,
        authorId: u(9),
        message: "Peak sync lag observed 2–4pm UTC — investigating queue depth.",
      },
    ],
  });

  console.log(
    "Seed done. 16 accounts @ flowboard.demo (admin + name-based team emails). Passwords match the login page list.",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
