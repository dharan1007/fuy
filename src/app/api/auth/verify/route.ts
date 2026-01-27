
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
    try {
        const { email, code, type, password } = await request.json();

        // 1. Find valid code
        const verification = await prisma.verificationCode.findFirst({
            where: {
                email,
                code,
                type: type, // 'SIGNUP' or 'RECOVERY'
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!verification) {
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
        }

        // 2. Handle specific actions
        if (type === 'SIGNUP') {
            if (!password) {
                return NextResponse.json({ error: 'Password is required to complete registration' }, { status: 400 });
            }

            // Retrieve stored name from metadata
            const metadata = (verification as any).metadata;
            const name = metadata?.name || '';

            // Create user in Supabase NOW (verified)
            const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // It's verified now
                user_metadata: { name },
            });

            if (createError) {
                // Check if user exists just in case of race condition or retry
                if (!createError.message.includes('already been registered')) {
                    throw createError;
                }
            }

            // Fix: Ensure public User record exists manually since trigger might be missing
            const userId = authData?.user?.id;
            if (userId) {
                await prisma.user.upsert({
                    where: { id: userId },
                    create: {
                        id: userId,
                        email: email,
                        name: name,
                    },
                    update: {},
                });
            }
        }

        // 3. Delete code (consumable)
        await prisma.verificationCode.delete({ where: { id: verification.id } });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Verify error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
