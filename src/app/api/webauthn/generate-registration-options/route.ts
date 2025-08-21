import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";

// Shape we need from DB for excludeCredentials
type PasskeyIdRow = { id: string };

export async function GET() {
  // DEV user to avoid auth in local
  const email = "demo@fuy.local";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email } });

  const existing = (await prisma.passkeyCredential.findMany({
    where: { userId: user.id },
    select: { id: true },
  })) as PasskeyIdRow[];

  const options = await generateRegistrationOptions({
    rpName: "fuy",
    rpID: process.env.NEXT_PUBLIC_RP_ID || "localhost",
    userID: user.id,
    userName: email,
    attestationType: "none",
    excludeCredentials: existing.map((c: PasskeyIdRow) => ({
      id: Buffer.from(c.id, "base64url"),
      type: "public-key",
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  return NextResponse.json(options, {
    headers: { "x-webauthn-challenge": options.challenge },
  });
}
