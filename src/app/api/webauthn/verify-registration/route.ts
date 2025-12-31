export const dynamic = 'force-dynamic';
// src/app/api/webauthn/verify-registration/route.ts
import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000";
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || new URL(ORIGIN).hostname;

function u8ToB64url(u8: Uint8Array) {
  return Buffer.from(u8).toString("base64url");
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const expectedChallenge = req.headers.get("x-webauthn-challenge") || undefined;
    if (!expectedChallenge) {
      return NextResponse.json({ error: "Missing challenge header" }, { status: 400 });
    }

    const body = (await req.json()) as any;

    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });

    if (!verified || !registrationInfo) {
      return NextResponse.json({ error: "Registration not verified" }, { status: 400 });
    }

    const {
      credentialID,
      credentialPublicKey,
      counter,
      aaguid,
      credentialDeviceType,
      credentialBackedUp,
    } = registrationInfo;

    await prisma.passkeyCredential.create({
      data: {
        userId: user.id,
        credentialID: u8ToB64url(credentialID),
        credentialPublicKey: u8ToB64url(credentialPublicKey),
        counter,
        aaguid: aaguid || null,
        transports: null, // not available from registrationInfo; keep null for now
      },
    });

    return NextResponse.json({
      ok: true,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    });
  } catch (e: any) {
    const msg = e?.message || "Failed to verify registration";
    return NextResponse.json({ error: msg }, { status: msg === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

