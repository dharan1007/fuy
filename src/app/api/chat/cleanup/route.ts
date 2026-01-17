import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST: Cleanup messages based on retention policy
 * This endpoint should be called by a cron job (e.g., Vercel Cron, external scheduler)
 * Schedule: Every hour or every 15 minutes
 */
export async function POST(req: Request) {
    try {
        // Optional: Verify cron secret for security
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Find all conversations with 1day retention
        const conversations = await prisma.conversation.findMany({
            where: {
                messageRetention: '1day'
            },
            select: { id: true }
        });

        const conversationIds = conversations.map(c => c.id);

        if (conversationIds.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No conversations with 1day retention',
                deletedCount: 0
            });
        }

        // Delete messages older than 24 hours that are:
        // 1. In conversations with 1day retention
        // 2. Not saved (isSaved = false or null)
        // 3. Already read by both parties (readAt is set)
        const deleteResult = await prisma.message.deleteMany({
            where: {
                conversationId: { in: conversationIds },
                createdAt: { lt: oneDayAgo },
                OR: [
                    { isSaved: false },
                    { isSaved: null }
                ]
            }
        });

        console.log(`[Cleanup] Deleted ${deleteResult.count} messages older than 24h`);

        return NextResponse.json({
            success: true,
            deletedCount: deleteResult.count,
            timestamp: now.toISOString()
        });
    } catch (error) {
        console.error('Error in message cleanup:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * GET: Check cleanup status and stats
 */
export async function GET(req: Request) {
    try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Count conversations by retention type
        const retentionStats = await prisma.conversation.groupBy({
            by: ['messageRetention'],
            _count: { id: true }
        });

        // Count messages that would be deleted
        const conversations1Day = await prisma.conversation.findMany({
            where: { messageRetention: '1day' },
            select: { id: true }
        });

        const pendingDeletion = await prisma.message.count({
            where: {
                conversationId: { in: conversations1Day.map(c => c.id) },
                createdAt: { lt: oneDayAgo },
                OR: [
                    { isSaved: false },
                    { isSaved: null }
                ]
            }
        });

        return NextResponse.json({
            retentionStats: retentionStats.map(stat => ({
                retention: stat.messageRetention || 'default',
                count: stat._count.id
            })),
            pendingDeletion,
            timestamp: now.toISOString()
        });
    } catch (error) {
        console.error('Error getting cleanup stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
