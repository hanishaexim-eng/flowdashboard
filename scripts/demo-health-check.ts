import "dotenv/config";

import { prisma } from "../src/lib/prisma";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in environment.");
  }

  const [users, projects, tasks] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.task.count(),
  ]);

  if (users === 0 || projects === 0) {
    throw new Error("Database looks empty. Run migrations and seed before demo.");
  }

  console.log("Demo health check passed.");
  console.log(`Users: ${users}`);
  console.log(`Projects: ${projects}`);
  console.log(`Tasks: ${tasks}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Demo health check failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });

