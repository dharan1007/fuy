// src/app/api/webauthn/verify-authentication/route.ts
import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000";
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || new URL(ORIGIN).hostname;

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;
const enc = new TextEncoder();

function b64urlToU8(b64url: string) {
  return new Uint8Array(Buffer.from(b64url, "base64url"));
}

export async function POST(req: Request) {
  try {
    const expectedChallenge = req.headers.get("x-webauthn-challenge") || undefined;
    if (!expectedChallenge) {
      return NextResponse.json({ error: "Missing challenge header" }, { status: 400 });
    }

    const body = (await req.json()) as any;

    const cred = await prisma.passkeyCredential.findUnique({
      where: { credentialID: body.id },
    });
    if (!cred) {
      return NextResponse.json({ error: "Unknown credential" }, { status: 400 });
    }

    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: b64urlToU8(cred.credentialID),
        credentialPublicKey: b64urlToU8(cred.credentialPublicKey),
        counter: cred.counter,
      },
      requireUserVerification: false,
    });

    if (!verified || !authenticationInfo) {
      return NextResponse.json({ error: "Authentication not verified" }, { status: 400 });
    }

    await prisma.passkeyCredential.update({
      where: { credentialID: cred.credentialID },
      data: { counter: authenticationInfo.newCounter },
    });

    const loginToken = await new SignJWT({ uid: cred.userId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("fuy")
      .setAudience("fuy")
      .setExpirationTime("10m")
      .sign(enc.encode(NEXTAUTH_SECRET));

    return NextResponse.json({ ok: true, loginToken });
  } catch (e: any) {
    const msg = e?.message || "Failed to verify authentication";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
