import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { postIds } = await req.json();

        // 1. Authenticate user
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
            return NextResponse.json({ error: 'Post IDs array required' }, { status: 400 });
        }

        // 2. Verify ownership (Ensure all posts belong to the user)
        // We can do this by deleting only posts that match the ID AND the UserId

        const result = await prisma.post.deleteMany({
            where: {
                id: { in: postIds },
                userId: user.id
            }
        });

        console.log(`Batch delete: User ${user.id} requested ${postIds.length}, deleted ${result.count}`);

        return NextResponse.json({
            success: true,
            count: result.count,
            requested: postIds.length
        });

    } catch (e: any) {
        console.error('Batch Delete API Error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
