
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messageId, tag } = await req.json();

        if (!messageId || !tag) {
            return NextResponse.json({ error: 'Missing messageId or tag' }, { status: 400 });
        }

        // Verify ownership or participation
        const message = await prisma.message.findUnique({
            where: { id: messageId },
            include: {
                conversation: true
            }
        });

        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        // Allow tagging if user is participant
        const isParticipant = message.conversation.participantA === session.user.id ||
            message.conversation.participantB === session.user.id;

        if (!isParticipant) {
            return NextResponse.json({ error: 'Not authorized to tag this message' }, { status: 403 });
        }

        // Update tags. Since it's a simple array, we appended or replace?
        // User requirement implies "Tagging" which usually means adding.
        // Let's implement toggle logic or simple add for now. 
        // Given the UI allows multiple tags but shows "Tag Message", let's assume replacement for category style or append.
        // The UI handles one tag at a time. Let's make it an array of unique tags.

        // We also need to ensure we don't duplicate tags.
        const currentTags = message.tags || [];
        let newTags = [...currentTags];

        // If tag is already present, remove it (toggle), else add it.
        if (newTags.includes(tag)) {
            newTags = newTags.filter(t => t !== tag);
        } else {
            // If we want to limit to ONE main tag (Urgent/Fun/etc) which acts as a category, we might want to clear others?
            // But the schema is array. Let's allowing multiple for flexibility, but the UI bubble shows the *first* one prominently.
            newTags.push(tag);
        }

        const updatedMessage = await prisma.message.update({
            where: { id: messageId },
            data: {
                tags: newTags
            }
        });

        return NextResponse.json({ success: true, message: updatedMessage });

    } catch (error) {
        console.error('Error tagging message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
