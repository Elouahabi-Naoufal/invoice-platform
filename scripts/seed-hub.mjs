import { PrismaClient } from "../src/lib/hub-client/index.js";
import bcrypt from "bcryptjs";

const hubPrisma = new PrismaClient();

const email = process.env.HUB_ADMIN_EMAIL || "admin@invora.app";
const password = process.env.HUB_ADMIN_PASSWORD;
if (!password) throw new Error("HUB_ADMIN_PASSWORD env var required for seeding");

const existing = await hubPrisma.superAdmin.findUnique({ where: { email } });
if (existing) {
  console.info("Super admin already exists, skipping seed.");
} else {
  const passwordHash = await bcrypt.hash(password, 12);
  await hubPrisma.superAdmin.create({ data: { email, passwordHash } });
  console.info(`Super admin created: ${email}`);
}

await hubPrisma.$disconnect();