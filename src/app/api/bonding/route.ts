export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get('profileId');

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!profileId) {
            return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
        }

        // Fetch Messages with non-empty tags in conversation with this profile
        // We find the conversation first or query messages directly
        const conversation = await prisma.conversation.findFirst({
            where: {
                OR: [
                    { participantA: user.id, participantB: profileId },
                    { participantA: profileId, participantB: user.id }
                ]
            }
        });

        let tags: any[] = [];
        let tagCounts: Record<string, number> = {};

        if (conversation) {
            const messages = await prisma.message.findMany({
                where: {
                    conversationId: conversation.id,
                    NOT: { tags: { equals: [] } } // Only messages with tags
                },
                include: {
                    sender: {
                        select: {
                            name: true,
                            profile: { select: { displayName: true, avatarUrl: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Transform to expected shape
            tags = messages.flatMap(msg => {
                // msg.tags is String[]
                return msg.tags.map(tag => ({
                    id: `${msg.id}-${tag}`,
                    messageId: msg.id,
                    userId: msg.senderId,
                    profileId: profileId, // Contextual
                    tagType: tag, // "Urgent", "Fun", etc.
                    taggedContent: null,
                    note: null,
                    createdAt: msg.createdAt,
                    message: {
                        id: msg.id,
                        content: msg.content,
                        createdAt: msg.createdAt,
                        sender: msg.sender
                    }
                }));
            });

            // Filter tags if needed (e.g. only "Urgent" goes to Blacklist? No, matching logic in UI)
            // UI expects tagCounts
            tagCounts = tags.reduce((acc, tag) => {
                acc[tag.tagType] = (acc[tag.tagType] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
        }

        // Return empty facts as feature is removed
        const facts: any[] = [];

        return NextResponse.json({
            tags,
            facts,
            tagCounts,
        });

    } catch (error) {
        console.error('Error fetching bonding data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    // Feature disabled/removed
    return NextResponse.json({ error: 'Feature disabled' }, { status: 501 });
}

