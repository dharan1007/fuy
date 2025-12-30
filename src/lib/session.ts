// src/lib/session.ts
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    console.log("[SESSION_DEBUG] getSessionUser: No session returned from getServerSession");
  } else {
    console.log(`[SESSION_DEBUG] getSessionUser: Found user ${session.user.email} (${session.user.id})`);
  }
  return session?.user ?? null;
}

export async function requireUser() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.id) throw new Error("UNAUTHENTICATED");

  // Verify user exists in DB to prevent FK errors
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });

  if (!user) throw new Error("USER_NOT_FOUND");

  return user;
}

export async function requireUserId() {
  const user = await requireUser();
  return user.id;
}
