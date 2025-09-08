// src/app/api/friends/invite-link/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireUserId } from "../../../../lib/session";
import { absoluteUrl } from "../../../../lib/base-url";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const inviterId = await requireUserId();
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48h

    await prisma.invite.create({
      data: { token, inviterId, expiresAt, status: "PENDING" },
    });

    // Uses the (req, path) overload
    const link = absoluteUrl(req, `/join?token=${token}`);
    return NextResponse.json({ link }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: "Unable to generate link." },
      { status: 500 }
    );
  }
}
