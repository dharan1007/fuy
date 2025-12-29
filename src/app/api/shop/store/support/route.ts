import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

        // Fetch Product Reviews for products sold by this user
        const reviews = await prisma.productReview.findMany({
            where: {
                product: {
                    sellerId: user.id
                }
            },
            include: {
                user: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
                product: { select: { id: true, name: true, images: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Fetch Reports targeting this Seller (linked to their products)
        const reports = await prisma.report.findMany({
            where: {
                target: 'SELLER',
                product: {
                    sellerId: user.id
                }
            },
            include: {
                reporter: { select: { id: true, name: true } },
                product: { select: { id: true, name: true, images: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Fetch Admin Disputes (Reports targeting FUY but about this seller's products)
        // Seller should see these maybe? Or only if Admin messages them? 
        // For now let's just fetch direct reports. The user said "reports which are reported to fuy will go to the admin page... and the seller can also reply".
        // This implies the seller needs to see them IF the admin engages or if they are visible.
        // Let's include them in a separate bucket "disputes" if they are linked to seller's usage.

        const disputes = await prisma.report.findMany({
            where: {
                target: 'FUY',
                product: {
                    sellerId: user.id
                }
            },
            include: {
                reporter: { select: { id: true, name: true } },
                product: { select: { id: true, name: true, images: true } }
            },
            orderBy: { createdAt: 'desc' }
        });


        return NextResponse.json({ reviews, reports, disputes });

    } catch (error) {
        console.error('Error fetching support data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
