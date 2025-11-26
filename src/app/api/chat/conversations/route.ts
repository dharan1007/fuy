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
      },
      include: {
        userA: {
          select: { id: true, name: true, profile: { select: { avatarUrl: true } } },
        },
        userB: {
          select: { id: true, name: true, profile: { select: { avatarUrl: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Format for frontend
    const formatted = conversations.map(c => {
      const otherUser = c.participantA === user.id ? c.userB : c.userA;
      const lastMsg = c.messages[0];
      return {
        id: c.id,
        user: {
          id: otherUser.id,
          name: otherUser.name,
          avatar: otherUser.profile?.avatarUrl,
          lastSeen: otherUser.lastSeen,
        },
        lastMessage: lastMsg?.content || '',
        lastMessageAt: c.updatedAt,
        unreadCount: 0, // TODO: Implement unread count logic if needed
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
          userA: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
          userB: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
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
        userA: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
        userB: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
      },
    });

    return NextResponse.json({ conversation: newConv });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
