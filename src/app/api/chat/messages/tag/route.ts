
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

        const { messageId, tag } = await req.json();

        // Validate Tag (No emojis, simple text)
        // Regex for simple alphanumeric + spaces + common punctuation?
        // User said: "no emojies" "happiness, sad, angry".
        // Let's whitelist or blacklist range.
        const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
        if (emojiRegex.test(tag)) {
            return NextResponse.json({ error: 'Emojis are not allowed in tags' }, { status: 400 });
        }

        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

        // Check if tag already exists
        const currentTags = message.tags || [];
        if (currentTags.includes(tag)) {
            return NextResponse.json({ success: true, message });
        }

        const updated = await prisma.message.update({
            where: { id: messageId },
            data: {
                tags: {
                    push: tag
                }
            }
        });

        // Try to create/update Tag in Bonding/Locker logic?
        // For now, just saving on message is enough for the Chat req.
        // Bonding Dashboard will query messages where tags match.

        return NextResponse.json({ success: true, message: updated });

    } catch (error) {
        console.error('Tagging error:', error);
        return NextResponse.json({ error: 'Tagging failed' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messageId, tag } = await req.json();

        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

        // Filter out the tag
        const currentTags = message.tags || [];
        const newTags = currentTags.filter(t => t !== tag);

        const updated = await prisma.message.update({
            where: { id: messageId },
            data: { tags: newTags }
        });

        return NextResponse.json({ success: true, message: updated });

    } catch (error) {
        console.error('Delete tag error:', error);
        return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messageId, oldTag, newTag } = await req.json();

        // Basic validation
        const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
        if (emojiRegex.test(newTag)) {
            return NextResponse.json({ error: 'Emojis are not allowed in tags' }, { status: 400 });
        }

        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

        // Update tag
        let currentTags = message.tags || [];
        if (currentTags.includes(oldTag)) {
            currentTags = currentTags.map(t => t === oldTag ? newTag : t);
        }

        const updated = await prisma.message.update({
            where: { id: messageId },
            data: { tags: currentTags }
        });

        return NextResponse.json({ success: true, message: updated });

    } catch (error) {
        console.error('Update tag error:', error);
        return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
    }
}
