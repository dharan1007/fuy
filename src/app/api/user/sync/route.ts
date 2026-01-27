
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Remove local client creation


export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Upsert public User record with conflict handling
        try {
            await prisma.user.upsert({
                where: { id: user.id },
                create: {
                    id: user.id,
                    email: user.email!,
                    name: user.user_metadata?.name || null,
                },
                update: {
                    email: user.email!,
                },
            });
        } catch (error: any) {
            // Check for Unique Constraint Violation (P2002) on email
            if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
                console.log(`[Sync] Email conflict detected for ${user.email}. resolving...`);

                // Find and delete the conflicting user (zombie record)
                const existingUser = await prisma.user.findUnique({
                    where: { email: user.email! }
                });

                if (existingUser && existingUser.id !== user.id) {
                    console.log(`[Sync] Deleting zombie user ${existingUser.id}`);
                    // Delete the old record
                    // Note: This might fail if strict FK constraints exist without cascade. 
                    // But for now, we assume standard cleanup is desired.
                    await prisma.user.delete({ where: { id: existingUser.id } });

                    // Retry upsert
                    await prisma.user.upsert({
                        where: { id: user.id },
                        create: {
                            id: user.id,
                            email: user.email!,
                            name: user.user_metadata?.name || null,
                        },
                        update: {
                            email: user.email!,
                        },
                    });
                }
            } else {
                throw error;
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Sync error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
