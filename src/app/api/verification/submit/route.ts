import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
    try {
        // Get user from auth header
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const body = await request.json();
        const { videoUrl, challenges } = body;

        // Basic validation
        if (!videoUrl) {
            return NextResponse.json({
                verified: false,
                error: 'No video URL received'
            }, { status: 400 });
        }

        // Mark user as verified
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isHumanVerified: true,
                humanVerifiedAt: new Date(),
                verificationSelfieUrl: videoUrl
            }
        });

        return NextResponse.json({ verified: true });

    } catch (error: any) {
        console.error('Verification error:', error);
        return NextResponse.json({
            verified: false,
            error: error.message || 'Verification failed'
        }, { status: 500 });
    }
}
