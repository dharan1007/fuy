// src/lib/session.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user?.id) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireUserId() {
  const user = await requireUser();
  return user.id;
}
