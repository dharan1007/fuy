import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: List conversations
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participantA: user.id },
          { participantB: user.id },
        ],
        // Exclude conversations deleted by this user
        NOT: {
          states: {
            some: {
              userId: user.id,
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
          where: { userId: user.id }
        }
      },
      orderBy: { updatedAt: 'desc' },
    }) as any[];

    // Format for frontend
    const formatted = conversations.map((c: any) => {
      const otherUser = c.participantA === user.id ? c.userB : c.userA;
      const lastMsg = c.messages?.[0];
      const userState = c.states?.[0]; // Should be only one for this user

      return {
        id: c.id,
        participantName: otherUser?.name || 'Unknown User',
        participantId: otherUser?.id,
        lastMessage: lastMsg?.content || 'Started a conversation',
        lastMessageTime: lastMsg ? new Date(lastMsg.createdAt).getTime() : new Date(c.createdAt).getTime(),
        unreadCount: 0, // TODO: Implement unread count
        avatar: otherUser?.profile?.avatarUrl,
        userA: c.userA,
        userB: c.userB,
        isMuted: userState?.isMuted || false
      };
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
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Check existing
    const existing = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participantA: user.id, participantB: targetUserId },
          { participantA: targetUserId, participantB: user.id },
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
        participantA: user.id,
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
