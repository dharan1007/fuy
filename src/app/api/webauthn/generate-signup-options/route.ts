// src/app/api/webauthn/generate-signup-options/route.ts
import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000";
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || new URL(ORIGIN).hostname;

// Input validation schema
const signupOptionsSchema = z.object({
    email: z.string().email("Invalid email address").toLowerCase(),
    name: z.string().min(1).max(100),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validate input
        const validation = signupOptionsSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { email, name } = validation.data;

        // Check if user already exists
        const existing = await prisma.user.findUnique({
            where: { email },
        });

        if (existing) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 400 }
            );
        }

        // Generate a temporary user ID for the registration process
        // We'll use the email as the userID for now, then create the actual user on verification
        const tempUserId = `temp_${email}_${Date.now()}`;

        const options = await generateRegistrationOptions({
            rpName: "Fuy",
            rpID: RP_ID,
            userID: tempUserId,
            userName: email,
            userDisplayName: name,
            attestationType: "none",
            authenticatorSelection: {
                userVerification: "preferred",
                residentKey: "preferred",
                requireResidentKey: false,
            },
            excludeCredentials: [], // No existing credentials for new user
        });

        return new NextResponse(JSON.stringify(options), {
            headers: {
                "content-type": "application/json",
                "x-webauthn-challenge": options.challenge,
                "x-signup-email": email,
                "x-signup-name": name,
            },
            status: 200,
        });
    } catch (e: any) {
        const msg = e?.message || "Failed to create registration options";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
