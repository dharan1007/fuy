import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * POST: Request access to private profile fields
 * Body: { targetUserId: string, fields?: string[] }
 */
export async function POST(req: Request) {
    try {
        const userId = await requireUserId();
        const { targetUserId, fields = ['all'] } = await req.json();

        if (!targetUserId) {
            return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
        }

        if (targetUserId === userId) {
            return NextResponse.json({ error: 'Cannot request access to own profile' }, { status: 400 });
        }

        // Check if request already exists
        const existing = await prisma.profileAccessRequest.findFirst({
            where: {
                requesterId: userId,
                targetUserId,
                status: 'PENDING'
            }
        });

        if (existing) {
            return NextResponse.json({
                error: 'Request already pending',
                request: existing
            }, { status: 409 });
        }

        // Create access request
        const request = await prisma.profileAccessRequest.create({
            data: {
                id: `par_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`,
                requesterId: userId,
                targetUserId,
                fields: JSON.stringify(fields),
                status: 'PENDING'
            }
        });

        // Create notification for target user
        await prisma.notification.create({
            data: {
                id: `n_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`,
                userId: targetUserId,
                title: 'Profile Access Request',
                body: 'Someone wants to view your private profile information.',
                type: 'PROFILE_ACCESS_REQUEST',
                data: JSON.stringify({ requestId: request.id, requesterId: userId })
            }
        });

        return NextResponse.json({
            success: true,
            request,
            message: 'Access request sent'
        });
    } catch (error: any) {
        console.error('Error creating access request:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * GET: Get pending access requests (for target user)
 */
export async function GET(req: Request) {
    try {
        const userId = await requireUserId();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'received'; // 'received' or 'sent'

        let requests;
        if (type === 'sent') {
            requests = await prisma.profileAccessRequest.findMany({
                where: { requesterId: userId },
                include: {
                    target: { select: { id: true, name: true, profile: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            requests = await prisma.profileAccessRequest.findMany({
                where: { targetUserId: userId },
                include: {
                    requester: { select: { id: true, name: true, profile: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        }

        return NextResponse.json({ requests });
    } catch (error: any) {
        console.error('Error getting access requests:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PATCH: Respond to access request (approve/deny)
 * Body: { requestId: string, status: 'APPROVED' | 'DENIED' }
 */
export async function PATCH(req: Request) {
    try {
        const userId = await requireUserId();
        const { requestId, status } = await req.json();

        if (!requestId || !['APPROVED', 'DENIED'].includes(status)) {
            return NextResponse.json({ error: 'requestId and valid status required' }, { status: 400 });
        }

        // Verify the request belongs to this user
        const request = await prisma.profileAccessRequest.findFirst({
            where: {
                id: requestId,
                targetUserId: userId
            }
        });

        if (!request) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Update request status
        const updated = await prisma.profileAccessRequest.update({
            where: { id: requestId },
            data: {
                status,
                respondedAt: new Date()
            }
        });

        // Notify requester
        await prisma.notification.create({
            data: {
                id: `n_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`,
                userId: request.requesterId,
                title: status === 'APPROVED' ? 'Access Approved' : 'Access Denied',
                body: status === 'APPROVED'
                    ? 'Your profile access request was approved.'
                    : 'Your profile access request was denied.',
                type: 'PROFILE_ACCESS_RESPONSE',
                data: JSON.stringify({ requestId, status })
            }
        });

        return NextResponse.json({
            success: true,
            request: updated
        });
    } catch (error: any) {
        console.error('Error responding to access request:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
