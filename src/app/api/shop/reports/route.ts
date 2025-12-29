import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        const { productId, orderId, reason, details, target } = body;

        // "target" should be "SELLER" or "FUY"
        const reportTarget = target === 'SELLER' ? 'SELLER' : 'FUY';

        const report = await prisma.report.create({
            data: {
                reporterId: user.id,
                productId: productId, // Optional
                orderId: orderId,     // Optional
                reason: reason,
                details: details,
                status: 'PENDING',
                target: reportTarget,
                // If it's a product report, link post if possible? 
                // Currently schema has postId optional. We'll leave it null for product reports implies it's not a social post.
            }
        });

        return NextResponse.json(report);

    } catch (error) {
        console.error('Error creating report:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
