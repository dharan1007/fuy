
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { reportedId, reason } = body;

        if (!reportedId || !reason) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const reporterId = session.user.id;

        // Verify users exist
        const reportedUser = await prisma.user.findUnique({ where: { id: reportedId } });
        if (!reportedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Create Report
        const report = await prisma.report.create({
            data: {
                reporterId,
                reportedUserId: reportedId,
                reason,
                target: 'USER',
                status: 'PENDING',
                details: `Report against ${reportedUser.name || 'User'} (${reportedId})`,
            }
        });

        // Optional: Send notification to admin (via database or email trigger)

        return NextResponse.json({ success: true, report });

    } catch (error) {
        console.error('Error submitting report:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
