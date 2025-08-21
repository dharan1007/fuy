// src/lib/session.ts
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function requireUserId(): Promise<string> {
  // DEV BYPASS so you can click around locally
  if (process.env.DEV_BYPASS_AUTH === "true") {
    let user = await prisma.user.findFirst({ where: { email: "demo@fuy.local" } });
    if (!user) user = await prisma.user.create({ data: { email: "demo@fuy.local" } });
    return user.id;
  }

  const session = await getServerSession(authOptions);
  const email = (session?.user as any)?.email as string | undefined;
  if (!email) throw new Error("Not authenticated");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");
  return user.id;
}
