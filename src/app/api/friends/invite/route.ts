import { logger } from "@/lib/logger";
// src/app/api/friends/invite/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "../../../../lib/session";
import { sendMail } from "../../../../lib/mailer";
import { absoluteUrl } from "../../../../lib/base-url";

export const runtime = "nodejs";

function isValidEmail(email: string) {
  if (/\.\.|\.@/.test(email)) return false;
  const re = /^[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!re.test(email)) return false;
  const [local] = email.split("@");
  if (local.endsWith(".")) return false;
  return true;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: Request) {
  try {
    const inviterId = await requireUserId();
    const body = await req.json().catch(() => ({} as any));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const username =
      typeof body.username === "string"
        ? body.username.trim().replace(/^@/, "")
        : "";

    if (!email && !username) {
      return NextResponse.json(
        { error: "Provide email or username." },
        { status: 400 }
      );
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48h

    await prisma.invite.create({
      data: {
        token,
        email: email || null,
        username: username || null,
        inviterId,
        expiresAt,
        status: "PENDING",
      },
    });

    // Uses the (req, path) overload
    const link = absoluteUrl(req, `/join?token=${token}`);

    if (email) {
      const subject = "You've been invited to Fuy";
      const text = `You've been invited to join Fuy.\n\nAccept invite: ${link}\n\nThis link expires in 48 hours.`;
      const html = `
        <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
          <p>You've been invited to join <strong>Fuy</strong>.</p>
          <p><a href="${link}">Accept your invitation</a></p>
          <p style="color:#555;font-size:12px">This link expires in 48 hours.</p>
        </div>
      `;
      try {
        await sendMail({ to: email, subject, html, text });
      } catch (emailError: any) {
        logger.error("Failed to send invite email:", emailError?.message);
        // Continue anyway - invite is created, user can use the link
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error while sending invite." },
      { status: 500 }
    );
  }
}
