
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
            // 1. Handle "User already registered" case to get the correct User ID if needed
            let userId = authData?.user?.id;

            if (!userId && createError?.message.includes('already been registered')) {
                // User exists in Supabase. We need their ID.
                // Admin `listUsers` is the reliable way to search by email without logging in.
                const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
                const existingAuthUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                if (existingAuthUser) {
                    userId = existingAuthUser.id;
                }
            }

            if (userId) {
                // 2. Check for "Zombie" records in Prisma (Same email, diff ID)
                // This causes "Unique constraint failed" if we try to upsert with a new ID
                const existingPrismaUser = await prisma.user.findUnique({
                    where: { email },
                });

                if (existingPrismaUser && existingPrismaUser.id !== userId) {
                    console.log(`[Verify] Found stale Prisma user ${existingPrismaUser.id} for ${email}. Deleting to sync with Supabase ID ${userId}.`);
                    // Delete the stale record so we can recreate it with the correct sync ID
                    try {
                        await prisma.user.delete({ where: { id: existingPrismaUser.id } });
                    } catch (e) {
                        console.error("[Verify] Failed to cleanup stale user:", e);
                    }
                }

                await prisma.user.upsert({
                    where: { id: userId },
                    create: {
                        id: userId,
                        email: email,
                        name: name,
                    },
                    update: {
                        // If it exists with correct ID, just update details
                        email: email,
                        name: name,
                    },
                });

                // 3. Ensure Profile record exists (for encryption keys)
                await prisma.profile.upsert({
                    where: { userId: userId },
                    create: {
                        userId: userId,
                        displayName: name
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
