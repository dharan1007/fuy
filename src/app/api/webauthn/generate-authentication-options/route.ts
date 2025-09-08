// src/app/api/webauthn/generate-authentication-options/route.ts
import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000";
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || new URL(ORIGIN).hostname;

export async function GET() {
  try {
    let allowCredentials: any[] = [];

    const u = await getSessionUser();
    if (u?.id) {
      const creds = await prisma.passkeyCredential.findMany({
        where: { userId: u.id },
        select: { credentialID: true },
      });
      // id can be provided as a base64url string; the lib will coerce it.
      allowCredentials = creds.map((c) => ({
        id: c.credentialID,
        type: "public-key",
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: "preferred",
      allowCredentials,
    });

    return new NextResponse(JSON.stringify(options), {
      headers: {
        "content-type": "application/json",
        "x-webauthn-challenge": options.challenge,
      },
      status: 200,
    });
  } catch (e: any) {
    const msg = e?.message || "Failed to create authentication options";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
