// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const dbUrl = process.env.DATABASE_URL || "";
  const separator = dbUrl.includes("?") ? "&" : "?";
  // Force connection limit to 20 to avoid P2024 timeouts
  const urlWithParams = dbUrl.includes("connection_limit")
    ? dbUrl.replace(/connection_limit=\d+/, "connection_limit=20")
    : `${dbUrl}${separator}connection_limit=20`;

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: urlWithParams,
      },
    },
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
