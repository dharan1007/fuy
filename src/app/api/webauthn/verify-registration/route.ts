// src/app/api/webauthn/verify-registration/route.ts
import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

function uint8ArrayToB64url(u8: Uint8Array): string {
  return Buffer.from(u8).toString("base64url");
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  const body = await req.json();

  const expectedChallenge = req.headers.get("x-webauthn-challenge") || "";

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: process.env.WEBAUTHN_ORIGIN!,
    expectedRPID: process.env.WEBAUTHN_RP_ID!,
  });

  if (!verification.verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 401 });
  }

  const info = verification.registrationInfo!;
  const credentialID = Buffer.from(info.credentialID).toString("base64url");
  const credentialPublicKey = uint8ArrayToB64url(info.credentialPublicKey);
  const transports = Array.isArray(body.transports) ? body.transports.join(",") : null;
  const aaguid = info.aaguid ?? null;

  await prisma.passkeyCredential.upsert({
    where: { credentialID },
    create: {
      userId,
      credentialID,
      credentialPublicKey,
      counter: info.counter ?? 0,
      transports,
      aaguid,
    },
    update: {
      userId,
      credentialPublicKey,
      counter: info.counter ?? 0,
      transports,
      aaguid,
    },
  });

  return NextResponse.json({ ok: true });
}
