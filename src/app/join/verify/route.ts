// src/app/api/join/verify/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = (searchParams.get("token") || "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const inv = await prisma.invite.findUnique({ where: { token }, include: { inviter: true } });
  if (!inv) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  const now = new Date();
  if (inv.revokedAt || inv.status === "REVOKED") {
    return NextResponse.json({ error: "Revoked" }, { status: 404 });
  }
  if (inv.acceptedAt || inv.status === "ACCEPTED") {
    return NextResponse.json({ error: "Already accepted" }, { status: 404 });
  }
  if (inv.expiresAt < now || inv.status === "EXPIRED") {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  return NextResponse.json(
    { inviterName: inv.inviter?.name || "your friend" },
    { status: 200 }
  );
}
