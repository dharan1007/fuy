// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const createPrisma = () =>
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

type GlobalWithPrisma = typeof globalThis & {
  __prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

// Ensure a single Prisma instance across hot reloads and serverless invocations
export const prisma: PrismaClient = globalForPrisma.__prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
