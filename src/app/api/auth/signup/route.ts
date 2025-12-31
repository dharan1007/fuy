import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";
import CryptoJS from "crypto-js";

const SECRET = process.env.SUPABASE_SERVICE_ROLE || "fallback-secret-key-change-this-in-prod";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, name, captchaAnswer, captchaToken, _gotcha } = body;

        // 0. Email Normalization
        const normalizedEmail = email?.toLowerCase().trim();

        if (!normalizedEmail) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // 1. HONEYPOT check
        if (_gotcha && _gotcha.trim() !== "") {
            console.warn(`[AUTH_SIGNUP] Bot detected via honeypot. Email: ${normalizedEmail}`);
            // Return fake success to confuse bot
            return NextResponse.json({ success: true, fake: true });
        }

        // 2. CAPTCHA Verification
        if (!captchaAnswer || !captchaToken) {
            return NextResponse.json({ error: "CAPTCHA required" }, { status: 400 });
        }

        let decryptedBytes;
        try {
            decryptedBytes = CryptoJS.AES.decrypt(captchaToken, SECRET);
        } catch (e) {
            return NextResponse.json({ error: "Invalid CAPTCHA token" }, { status: 400 });
        }

        const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedString) {
            return NextResponse.json({ error: "Invalid CAPTCHA token structure" }, { status: 400 });
        }

        const [realCode, timestampStr] = decryptedString.split("|");
        const timestamp = parseInt(timestampStr);
        const now = Date.now();

        // 3. Timeliness check
        if (isNaN(timestamp)) {
            return NextResponse.json({ error: "Invalid CAPTCHA timestamp" }, { status: 400 });
        }

        // Too fast (< 1s)
        if (now - timestamp < 1000) {
            return NextResponse.json({ error: "Suspicious activity (Too fast)" }, { status: 400 });
        }

        // Expired (> 5m)
        if (now - timestamp > 5 * 60 * 1000) {
            return NextResponse.json({ error: "CAPTCHA expired. Please refresh." }, { status: 400 });
        }

        // 4. Answer verification
        if (realCode.toUpperCase() !== captchaAnswer.trim().toUpperCase()) {
            return NextResponse.json({ error: "Incorrect CAPTCHA code" }, { status: 400 });
        }

        // 4.5 Check if user already exists in Prisma
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (existingUser) {
            return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
        }

        // 5. Create User in Supabase
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true, // Auto-confirm email since we did CAPTCHA check
            user_metadata: {
                display_name: name,
                name: name
            }
        });

        if (error) {
            console.error("[AUTH_SIGNUP] Supabase error:", error);
            // If Supabase says user already exists, return friendly error
            if (error.message.includes("already registered") || error.status === 422) {
                return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // 6. Create User in Prisma (Sync DB)
        try {
            await prisma.user.create({
                data: {
                    id: data.user.id,
                    email: data.user.email!,
                    name: name
                }
            });
            console.log(`[AUTH_SIGNUP] Prisma User created: ${data.user.id}`);
        } catch (dbError: any) {
            console.error("[AUTH_SIGNUP] Prisma creation failed:", dbError);
            // If prisma creation fails, we technically have a "zombie" user in Supabase
            // but we don't delete the existing Prisma record anymore.
            // We just return error. 
            return NextResponse.json({ error: "Failed to sync user data. Please contact support." }, { status: 500 });
        }

        // Successful creation
        console.log(`[AUTH_SIGNUP] User created: ${data.user.id} | Confirmed: ${data.user.email_confirmed_at}`);

        return NextResponse.json({
            success: true,
            user: { email: data.user.email, id: data.user.id }
        });

    } catch (error: any) {
        console.error("[AUTH_SIGNUP] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
