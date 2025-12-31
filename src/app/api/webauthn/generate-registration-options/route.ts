export const dynamic = 'force-dynamic';
// src/app/api/webauthn/generate-registration-options/route.ts
import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000";
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || new URL(ORIGIN).hostname;

function b64urlToU8(b64url: string) {
  return new Uint8Array(Buffer.from(b64url, "base64url"));
}

export async function GET() {
  try {
    const user = await requireUser();

    const existing = await prisma.passkeyCredential.findMany({
      where: { userId: user.id },
      select: { credentialID: true },
    });

    const options = await generateRegistrationOptions({
      rpName: "Fuy",
      rpID: RP_ID,
      userID: user.id,
      userName: user.email || user.id,
      userDisplayName: user.name || user.email || user.id,
      attestationType: "none",
      authenticatorSelection: {
        userVerification: "preferred",
        residentKey: "preferred",
        requireResidentKey: false,
      },
      excludeCredentials: existing.map((c) => ({
        id: b64urlToU8(c.credentialID),
        type: "public-key",
      })),
    });

    return new NextResponse(JSON.stringify(options), {
      headers: {
        "content-type": "application/json",
        "x-webauthn-challenge": options.challenge,
      },
      status: 200,
    });
  } catch (e: any) {
    const msg = e?.message || "Failed to create registration options";
    return NextResponse.json({ error: msg }, { status: msg === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

