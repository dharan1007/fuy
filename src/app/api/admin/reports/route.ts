import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        // In a real app, check for ADMIN role here.
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all reports targeting FUY
        const reports = await prisma.report.findMany({
            where: {
                target: 'FUY'
            },
            include: {
                reporter: { select: { id: true, name: true, email: true } },
                product: {
                    select: {
                        id: true,
                        name: true,
                        images: true,
                        seller: { select: { id: true, name: true, email: true } }
                    }
                },
                order: { select: { id: true, status: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(reports);

    } catch (error) {
        console.error('Error fetching admin reports:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        // Check Admin

        const body = await request.json();
        const { action, reportId, message } = body;
        // Action: IGNORE, REMOVE_PRODUCT, RESOLVE, MESSAGE_SELLER?

        if (action === 'REMOVE_PRODUCT') {
            const report = await prisma.report.findUnique({ where: { id: reportId }, include: { product: true } });
            if (report && report.productId) {
                await prisma.product.update({
                    where: { id: report.productId },
                    data: { status: 'INACTIVE', isTrending: false }
                });
                await prisma.report.update({
                    where: { id: reportId },
                    data: { status: 'RESOLVED', adminNotes: 'Product Removed by Admin' }
                });
            }
        } else if (action === 'IGNORE') {
            await prisma.report.update({
                where: { id: reportId },
                data: { status: 'DISMISSED' }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
