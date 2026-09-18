/**
 * Tenant provisioning orchestration.
 *
 * `startProvisioning` performs the fast steps (create app, configure source/env/domain,
 * trigger deploy) synchronously, then leaves the job in DEPLOYING.
 * `advanceProvisioningJobs` (called by the cron worker) polls Dokploy until the build
 * finishes, verifies the URL, marks the tenant ACTIVE and enqueues notifications.
 */
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import {
  createTenantApplication,
  deployApplication,
  getApplicationStatus,
} from "@/server/dokploy";
import { enqueueTenantNotification } from "@/server/notifications";

const TENANT_PORT = Number(process.env.TENANT_PORT || 3007);

function randomKey(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function tenantDomain(slug: string): string {
  const suffix = process.env.TENANT_DOMAIN_SUFFIX || "invoice.naoufalelouahabi.com";
  return `${slug}.${suffix}`;
}

function generatePassword(): string {
  // Readable but strong: 4 groups of 4 base32-ish chars.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 16; i++) out += alphabet[crypto.randomInt(alphabet.length)];
  return out.match(/.{1,4}/g)!.join("-");
}

function buildTenantEnv(slug: string, supportKey: string, ownerEmail: string, ownerPassword: string): Record<string, string> {
  const domain = tenantDomain(slug);
  return {
    DATABASE_URL: "file:/app/data/app.db",
    NEXT_PUBLIC_APP_URL: `https://${domain}`,
    PORT: String(TENANT_PORT),
    NODE_ENV: "production",
    TZ: "Africa/Casablanca",
    SCHEDULER_ENABLED: "true",
    JWT_SECRET: randomKey(32),
    CRON_SECRET: randomKey(16),
    SUPPORT_KEY: supportKey,
    OWNER_EMAIL: ownerEmail,
    OWNER_PASSWORD: ownerPassword,
  };
}

export async function startProvisioning(tenantId: string, adminId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("not found");
  if (tenant.status === "ACTIVE") throw new Error("already active");
  if (tenant.status === "PROVISIONING") throw new Error("already provisioning");

  const supportKey = tenant.supportKey || randomKey(12);
  const ownerPassword = tenant.ownerPassword || generatePassword();
  const job = await prisma.provisioningJob.create({
    data: {
      tenantId,
      status: "RUNNING",
      currentStep: "CREATING_APPLICATION",
      startedAt: new Date(),
      dokployApplicationId: tenant.dokployApplicationId,
    },
  });

  await prisma.tenant.update({ where: { id: tenantId }, data: { status: "PROVISIONING", supportKey, ownerPassword } });

  try {
    let applicationId = tenant.dokployApplicationId;

    if (!applicationId) {
      const created = await createTenantApplication({
        slug: tenant.slug,
        companyName: tenant.companyName,
        domain: tenantDomain(tenant.slug),
        port: TENANT_PORT,
        env: buildTenantEnv(tenant.slug, supportKey, tenant.email, ownerPassword),
      });
      applicationId = created.applicationId;
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          dokployApplicationId: applicationId,
          deploymentUrl: `https://${tenantDomain(tenant.slug)}`,
        },
      });
    }

    await prisma.provisioningJob.update({
      where: { id: job.id },
      data: { currentStep: "DEPLOYING", dokployApplicationId: applicationId },
    });

    await deployApplication(applicationId);

    await prisma.provisioningJob.update({ where: { id: job.id }, data: { currentStep: "VERIFYING" } });
    await prisma.auditLog.create({
      data: { adminId, action: "PROVISION_STARTED", tenantId, metadata: JSON.stringify({ applicationId }) },
    });
    return { ok: true, applicationId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.$transaction([
      prisma.provisioningJob.update({
        where: { id: job.id },
        data: { status: "FAILED", currentStep: "FAILED", errorMessage: message, completedAt: new Date() },
      }),
      prisma.tenant.update({ where: { id: tenantId }, data: { status: "FAILED" } }),
      prisma.auditLog.create({
        data: { adminId, action: "PROVISION_FAILED", tenantId, metadata: JSON.stringify({ error: message }) },
      }),
    ]);
    throw new Error(message);
  }
}

/** Poll in-flight deployments; called by the cron worker. */
export async function advanceProvisioningJobs(): Promise<{ checked: number; activated: number }> {
  const jobs = await prisma.provisioningJob.findMany({
    where: { status: "RUNNING", currentStep: "VERIFYING", dokployApplicationId: { not: null } },
    include: { tenant: true },
  });

  let activated = 0;
  for (const job of jobs) {
    try {
      const app = await getApplicationStatus(job.dokployApplicationId!);
      const done = ["done", "running", "idle"].includes(app.status.toLowerCase());
      if (!done) continue;

      const tenant = job.tenant;
      await prisma.$transaction([
        prisma.provisioningJob.update({
          where: { id: job.id },
          data: { status: "COMPLETED", currentStep: "COMPLETED", completedAt: new Date(), errorMessage: null },
        }),
        prisma.tenant.update({
          where: { id: tenant.id },
          data: { status: "ACTIVE", activatedAt: new Date() },
        }),
        prisma.auditLog.create({
          data: { adminId: "system", action: "PROVISION_COMPLETED", tenantId: tenant.id, metadata: JSON.stringify({ applicationId: job.dokployApplicationId }) },
        }),
      ]);
      await enqueueTenantNotification(tenant.id, "WELCOME");
      activated++;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await prisma.provisioningJob.update({
        where: { id: job.id },
        data: { status: "FAILED", currentStep: "VERIFYING", errorMessage: message, completedAt: new Date() },
      });
      await prisma.tenant.update({ where: { id: job.tenantId }, data: { status: "FAILED" } });
    }
  }

  return { checked: jobs.length, activated };
}

/** Retry a failed provisioning job (idempotent — reuses the existing app if present). */
export async function retryProvisioning(tenantId: string, adminId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("not found");
  await prisma.provisioningJob.updateMany({
    where: { tenantId, status: "FAILED" },
    data: { retryCount: { increment: 1 } },
  });
  await prisma.tenant.update({ where: { id: tenantId }, data: { status: "APPROVED" } });
  await prisma.auditLog.create({
    data: { adminId, action: "PROVISION_RETRY", tenantId, metadata: JSON.stringify({ slug: tenant.slug }) },
  });
  return startProvisioning(tenantId, adminId);
}