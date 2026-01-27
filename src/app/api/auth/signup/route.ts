
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {
        const { email, password, name } = await request.json();

        // 1. Check if user already exists in Supabase
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        if (existingUser.users.find(u => u.email?.toLowerCase() === email.toLowerCase())) {
            return NextResponse.json({ error: 'A user with this email address has already been registered' }, { status: 400 });
        }

        // 2. Generate OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        // 3. Store in DB (without creating user yet)
        await prisma.verificationCode.create({
            data: {
                email,
                code,
                type: 'SIGNUP',
                expiresAt,
                metadata: { name } // Store name to be used during verification
            } as any
        });

        // 4. Send Email
        await resend.emails.send({
            from: 'Fuy <verify@fuymedia.org>',
            to: email,
            subject: 'Verify your Fuy account',
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1>Welcome to Fuy</h1>
                <p>Your verification code is:</p>
                <h2 style="letter-spacing: 5px; background: #f0f0f0; padding: 10px; display: inline-block;">${code}</h2>
                <p>This code expires in 15 minutes.</p>
            </div>`
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
