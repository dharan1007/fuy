
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        // 1. Check if user exists (Optional, avoid leaking info if strict security needed, but good for UX)
        // We can just proceed to generate code regardless.

        // 2. Generate OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        // 3. Store in DB
        await prisma.verificationCode.create({
            data: {
                email,
                code,
                type: 'RECOVERY',
                expiresAt
            }
        });

        // 4. Send Email
        await resend.emails.send({
            from: 'Fuy <verify@fuymedia.org>',
            to: email,
            subject: 'Reset your password',
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>Use the following code to reset your password:</p>
                <h2 style="letter-spacing: 5px; background: #f0f0f0; padding: 10px; display: inline-block;">${code}</h2>
                <p>If you didn't request this, ignore this email.</p>
            </div>`
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Recover error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
