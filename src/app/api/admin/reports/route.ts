import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch ALL reports (not just FUY target)
        const reports = await prisma.report.findMany({
            include: {
                reporter: { select: { id: true, name: true, email: true } },
                reportedUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: { select: { displayName: true, avatarUrl: true } }
                    }
                },
                post: {
                    select: {
                        id: true,
                        content: true,
                        postType: true,
                        status: true,
                        user: { select: { id: true, name: true, email: true } },
                        postMedia: {
                            take: 1,
                            include: { media: { select: { url: true, type: true } } }
                        }
                    }
                },
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
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, reportId } = body;

        if (!reportId || !action) {
            return NextResponse.json({ error: 'Missing reportId or action' }, { status: 400 });
        }

        const report = await prisma.report.findUnique({
            where: { id: reportId },
            include: { product: true, post: true }
        });

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        if (action === 'REMOVE_PRODUCT') {
            if (report.productId) {
                await prisma.product.update({
                    where: { id: report.productId },
                    data: { status: 'INACTIVE', isTrending: false }
                });
            }
            await prisma.report.update({
                where: { id: reportId },
                data: { status: 'RESOLVED', adminNotes: 'Product removed by admin' }
            });

        } else if (action === 'REMOVE_POST') {
            if (report.postId) {
                await prisma.post.update({
                    where: { id: report.postId },
                    data: { status: 'REMOVED', moderationStatus: 'REMOVED', moderationReason: 'Removed by admin after report' }
                });
            }
            await prisma.report.update({
                where: { id: reportId },
                data: { status: 'RESOLVED', adminNotes: 'Post removed by admin' }
            });

        } else if (action === 'BAN_USER') {
            if (report.reportedUserId) {
                await prisma.user.update({
                    where: { id: report.reportedUserId },
                    data: { isBanned: true, banReason: `Banned after report: ${report.reason}` }
                });
            }
            await prisma.report.update({
                where: { id: reportId },
                data: { status: 'RESOLVED', adminNotes: 'User banned by admin' }
            });

        } else if (action === 'RESOLVE') {
            await prisma.report.update({
                where: { id: reportId },
                data: { status: 'RESOLVED', adminNotes: 'Resolved by admin' }
            });

        } else if (action === 'IGNORE') {
            await prisma.report.update({
                where: { id: reportId },
                data: { status: 'DISMISSED' }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error handling admin report action:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
