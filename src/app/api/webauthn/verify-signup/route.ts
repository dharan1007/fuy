// src/app/api/webauthn/verify-signup/route.ts
import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { sanitizeInput } from "@/lib/security";
import { securityLogger, SecurityEventType } from "@/lib/security-logger";

const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000";
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || new URL(ORIGIN).hostname;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;
const enc = new TextEncoder();

function u8ToB64url(u8: Uint8Array) {
    return Buffer.from(u8).toString("base64url");
}

export async function POST(req: Request) {
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    try {
        const expectedChallenge = req.headers.get("x-webauthn-challenge") || undefined;
        const email = req.headers.get("x-signup-email");
        const name = req.headers.get("x-signup-name");

        if (!expectedChallenge || !email || !name) {
            return NextResponse.json(
                { error: "Missing required headers" },
                { status: 400 }
            );
        }

        // Check if user already exists (double-check)
        const existing = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existing) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 400 }
            );
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
            return NextResponse.json(
                { error: "Registration not verified" },
                { status: 400 }
            );
        }

        const {
            credentialID,
            credentialPublicKey,
            counter,
            aaguid,
            credentialDeviceType,
            credentialBackedUp,
        } = registrationInfo;

        // Sanitize name
        const sanitizedName = sanitizeInput(name);

        // Create user, profile, and passkey credential in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create user (no password for passkey-only signup)
            const user = await tx.user.create({
                data: {
                    email: email.toLowerCase(),
                    password: null, // No password for passkey-only users
                    name: sanitizedName,
                    emailVerified: new Date(), // Auto-verify for passkey signups
                },
            });

            // Create profile
            await tx.profile.create({
                data: {
                    userId: user.id,
                    displayName: sanitizedName,
                },
            });

            // Create passkey credential
            await tx.passkeyCredential.create({
                data: {
                    userId: user.id,
                    credentialID: u8ToB64url(credentialID),
                    credentialPublicKey: u8ToB64url(credentialPublicKey),
                    counter,
                    aaguid: aaguid || null,
                    transports: null,
                },
            });

            return user;
        });

        // Log successful signup
        securityLogger.log({
            type: SecurityEventType.AUTH_SUCCESS,
            severity: "low",
            path: "/api/webauthn/verify-signup",
            userId: result.id,
            ip: clientIp,
            details: { action: "passkey_signup", deviceType: credentialDeviceType },
        });

        // Generate login token for auto-signin
        const loginToken = await new SignJWT({ uid: result.id })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuer("fuy")
            .setAudience("fuy")
            .setExpirationTime("10m")
            .sign(enc.encode(NEXTAUTH_SECRET));

        return NextResponse.json({
            ok: true,
            loginToken,
            userId: result.id,
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
        });
    } catch (e: any) {
        const msg = e?.message || "Failed to verify registration";

        securityLogger.log({
            type: SecurityEventType.SUSPICIOUS_ACTIVITY,
            severity: "medium",
            path: "/api/webauthn/verify-signup",
            ip: clientIp,
            details: { error: msg },
        });

        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
