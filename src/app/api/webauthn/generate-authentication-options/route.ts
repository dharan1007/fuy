import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";

// Shape we need from DB for allowCredentials
type PasskeyRow = { id: string; transports: string | null };

export async function GET() {
  const email = "demo@fuy.local";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const creds = (await prisma.passkeyCredential.findMany({
    where: { userId: user.id },
    select: { id: true, transports: true },
  })) as PasskeyRow[];

  const options = await generateAuthenticationOptions({
    rpID: process.env.NEXT_PUBLIC_RP_ID || "localhost",
    allowCredentials: creds.map((c: PasskeyRow) => ({
      id: Buffer.from(c.id, "base64url"),
      type: "public-key",
      transports: c.transports ? (JSON.parse(c.transports) as AuthenticatorTransport[]) : undefined,
    })),
    userVerification: "preferred",
  });

  return NextResponse.json(options, {
    headers: { "x-webauthn-challenge": options.challenge },
  });
}
