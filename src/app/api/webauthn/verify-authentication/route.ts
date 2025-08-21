// src/app/api/webauthn/verify-authentication/route.ts
import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

function b64urlToUint8Array(b64url: string): Uint8Array {
  // Node 18+ understands 'base64url'
  return new Uint8Array(Buffer.from(b64url, "base64url"));
}
function uint8ArrayToB64url(u8: Uint8Array): string {
  return Buffer.from(u8).toString("base64url");
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  const body = await req.json();

  // Get passkey by its credentialID (stored base64url)
  const cred = await prisma.passkeyCredential.findUnique({
    where: { credentialID: body.id as string },
    // pull what we actually need
    select: {
      id: true,
      userId: true,
      credentialID: true,
      credentialPublicKey: true,
      counter: true,
      transports: true,
      aaguid: true,
    },
  });
  if (!cred || cred.userId !== userId) {
    return NextResponse.json({ error: "Unknown credential" }, { status: 400 });
  }

  const expectedChallenge = req.headers.get("x-webauthn-challenge") || "";

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: process.env.WEBAUTHN_ORIGIN!,
    expectedRPID: process.env.WEBAUTHN_RP_ID!,
    authenticator: {
      credentialID: b64urlToUint8Array(cred.credentialID),
      credentialPublicKey: b64urlToUint8Array(cred.credentialPublicKey),
      counter: cred.counter ?? 0,
      transports: cred.transports ? cred.transports.split(",") as AuthenticatorTransport[] : undefined,
    },
  });

  if (!verification.verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 401 });
  }

  // Update counter
  await prisma.passkeyCredential.update({
    where: { id: cred.id },
    data: { counter: verification.authenticationInfo.newCounter ?? cred.counter },
  });

  return NextResponse.json({ ok: true });
}
