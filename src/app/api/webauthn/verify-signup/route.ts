// src/app/api/webauthn/verify-signup/route.ts
import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { sanitizeInput } from "@/lib/security";
import { securityLogger, SecurityEventType } from "@/lib/security-logger";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

        // 0. Create User in Supabase (Service Role)
        const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            email_confirm: true,
            user_metadata: {
                display_name: name,
                name: name,
                auth_method: 'passkey'
            }
        });

        if (sbError) {
            console.error("[PASSKEY_SIGNUP] Supabase error:", sbError);
            if (sbError.message.includes("already registered")) {
                return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
            }
            return NextResponse.json({ error: sbError.message }, { status: 400 });
        }

        const sbUser = sbData.user;

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
        await prisma.$transaction(async (tx) => {
            // Create user (no password for passkey-only signup)
            await tx.user.create({
                data: {
                    id: sbUser.id, // Use Supabase ID
                    email: email.toLowerCase(),
                    password: null, // No password for passkey-only users
                    name: sanitizedName,
                    emailVerified: new Date(), // Auto-verify for passkey signups
                },
            });

            // Create profile
            await tx.profile.create({
                data: {
                    userId: sbUser.id,
                    displayName: sanitizedName,
                },
            });

            // Create passkey credential
            await tx.passkeyCredential.create({
                data: {
                    userId: sbUser.id,
                    credentialID: u8ToB64url(credentialID),
                    credentialPublicKey: u8ToB64url(credentialPublicKey),
                    counter,
                    aaguid: aaguid || null,
                    transports: null,
                },
            });
        });

        // Log successful signup
        securityLogger.log({
            type: SecurityEventType.AUTH_SUCCESS,
            severity: "low",
            path: "/api/webauthn/verify-signup",
            userId: sbUser.id,
            ip: clientIp,
            details: { action: "passkey_signup", deviceType: credentialDeviceType },
        });

        // Generate a standard Supabase Magic Link but use it immediately
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: sbUser.email!,
            options: {
                redirectTo: '/profile/setup'
            }
        });

        if (linkError) {
            console.error("[PASSKEY_SIGNUP] Link generation error:", linkError);
            return NextResponse.json({ error: "Failed to generate session link" }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            loginUrl: linkData.properties.action_link,
            userId: sbUser.id,
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
