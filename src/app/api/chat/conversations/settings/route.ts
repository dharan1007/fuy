
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { conversationId, action, value } = body;
        // action: 'PIN' | 'NICKNAME' | 'GHOST' | 'MUTE'
        // value: boolean | string

        if (!conversationId || !action) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const userId = session.user.id;

        // Ensure state record exists
        let state = await prisma.conversationState.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId
                }
            }
        });

        if (!state) {
            state = await prisma.conversationState.create({
                data: {
                    conversationId,
                    userId
                }
            });
        }

        let updateData: any = {};

        if (action === 'PIN') {
            const isPinned = Boolean(value);
            // Check limit if pinning
            if (isPinned) {
                const pinnedCount = await prisma.conversationState.count({
                    where: { userId, isPinned: true }
                });
                if (pinnedCount >= 4) {
                    return NextResponse.json({ error: 'Pin limit reached (max 4)' }, { status: 400 });
                }
            }
            updateData.isPinned = isPinned;
            updateData.pinnedAt = isPinned ? new Date() : null;
        } else if (action === 'NICKNAME') {
            updateData.nickname = value ? String(value) : null;
        } else if (action === 'GHOST') {
            updateData.isGhosted = Boolean(value);
            // Ghosting usually implies muting too? Let's treat them separately or implied.
            // Requirement said "Ghost to hide/mute".
            if (Boolean(value)) {
                updateData.isMuted = true;
            }
        } else if (action === 'MUTE') {
            updateData.isMuted = Boolean(value);
        } else if (action === 'WALLPAPER') {
            // Update the shared Conversation model directly
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { wallpaperUrl: value ? String(value) : null }
            });
            // Return early or continue? If we return here we skip ConversationState update which is fine.
            return NextResponse.json({ success: true, wallpaperUrl: value });
        }

        const updated = await prisma.conversationState.update({
            where: {
                conversationId_userId: { conversationId, userId }
            },
            data: updateData
        });

        return NextResponse.json({ success: true, state: updated });

    } catch (error) {
        console.error('Error updating chat settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
