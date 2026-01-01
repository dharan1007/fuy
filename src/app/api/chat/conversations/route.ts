
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: List conversations
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = session.user;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participantA: userId },
          { participantB: userId },
        ],
        // Exclude conversations deleted by this user
        NOT: {
          states: {
            some: {
              userId: userId,
              isDeleted: true
            }
          }
        }
      },
      include: {
        userA: {
          select: { id: true, name: true, profile: { select: { avatarUrl: true } }, lastSeen: true } as any,
        },
        userB: {
          select: { id: true, name: true, profile: { select: { avatarUrl: true } }, lastSeen: true } as any,
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        states: {
          where: { userId: userId }
        }
      },
      orderBy: { updatedAt: 'desc' },
    } as any) as any[];

    // Format for frontend
    const formatted = conversations.map((c: any) => {
      const otherUser = c.participantA === userId ? c.userB : c.userA;
      const lastMsg = c.messages?.[0];
      const userState = c.states?.[0]; // Should be only one for this user

      return {
        id: c.id,
        participantName: userState?.nickname || otherUser?.name || 'Unknown User',
        participantId: otherUser?.id,
        lastMessage: lastMsg?.content || 'Started a conversation',
        lastMessageTime: lastMsg ? new Date(lastMsg.createdAt).getTime() : new Date(c.createdAt).getTime(),
        unreadCount: 0, // TODO: Implement unread count
        avatar: otherUser?.profile?.avatarUrl,
        userA: c.userA,
        userB: c.userB,
        isMuted: userState?.isMuted || false,
        isPinned: userState?.isPinned || false,
        isGhosted: userState?.isGhosted || false,
        nickname: userState?.nickname
      };
    });

    // Sort: Pinned first, then by updated/last message time
    formatted.sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then by time
      return b.lastMessageTime - a.lastMessageTime;
    });

    return NextResponse.json({ conversations: formatted });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create or get conversation
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID required' }, { status: 400 });
    }

    const userId = session.user.id;

    // Check existing
    const existing = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participantA: userId, participantB: targetUserId },
          { participantA: targetUserId, participantB: userId },
        ],
      },
    });

    if (existing) {
      const fullConversation = await prisma.conversation.findUnique({
        where: { id: existing.id },
        include: {
          userA: { select: { id: true, name: true, profile: { select: { avatarUrl: true } }, lastSeen: true } as any },
          userB: { select: { id: true, name: true, profile: { select: { avatarUrl: true } }, lastSeen: true } as any },
        },
      });
      return NextResponse.json({ conversation: fullConversation });
    }

    // Create new
    const newConv = await prisma.conversation.create({
      data: {
        participantA: userId,
        participantB: targetUserId,
      },
      include: {
        userA: { select: { id: true, name: true, profile: { select: { avatarUrl: true } }, lastSeen: true } as any },
        userB: { select: { id: true, name: true, profile: { select: { avatarUrl: true } }, lastSeen: true } as any },
      },
    });

    return NextResponse.json({ conversation: newConv });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
