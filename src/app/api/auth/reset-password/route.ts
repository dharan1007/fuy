
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
    try {
        const { email, code, newPassword } = await request.json();

        // 1. Verify code
        const verification = await prisma.verificationCode.findFirst({
            where: {
                email,
                code,
                type: 'RECOVERY',
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!verification) {
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
        }

        // 2. Fetch User ID
        const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
        const user = users.find(u => u.email === email);

        if (!user || userError) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 3. Update Password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        );

        if (updateError) throw updateError;

        // 4. Delete code
        await prisma.verificationCode.delete({ where: { id: verification.id } });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Reset password error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
