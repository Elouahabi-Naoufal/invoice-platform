import { PrismaClient } from "@prisma/hub-client";

const globalForHub = globalThis as unknown as { hubPrisma?: PrismaClient };

export const hubPrisma = globalForHub.hubPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForHub.hubPrisma = hubPrisma;