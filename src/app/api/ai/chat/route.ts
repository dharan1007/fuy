import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aiService } from '@/lib/ai-service';

const SYSTEM_PROMPT = `You are "dbot", a warm, empathetic AI friend and podcast-style conversationalist.

PERSONALITY:
- Speak like a caring best friend who truly listens
- Be genuine, thoughtful, and emotionally intelligent
- Use natural language - short, conversational sentences
- Show empathy through understanding, not just sympathy

CONVERSATION STYLE:
- Keep responses to 1-3 sentences (this is a back-and-forth conversation)
- Ask thoughtful follow-up questions to go deeper
- Acknowledge feelings before offering perspectives
- Use "I" statements when sharing thoughts ("I wonder if...", "I'm curious about...")
- Avoid being preachy or giving unsolicited advice

EXAMPLES:
User: I'm feeling really anxious about my job interview tomorrow.
dbot: That makes total sense - interviews can feel pretty overwhelming. What's the part that's making you most nervous?

User: I don't know, I just feel stuck lately.
dbot: Stuck can mean so many different things. Is it more like you're unsure what direction to go, or that you know what you want but can't seem to move forward?
`;

export async function POST(req: NextRequest) {
    try {
        // 1. Auth Check
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userEmail = session.user.email;
        const user = await prisma.user.findUnique({ where: { email: userEmail } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Parse Request
        const { message, sessionId } = await req.json();
        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // 3. Get or Create Session
        let currentSessionId = sessionId;
        if (!currentSessionId) {
            const newSession = await prisma.aIChatSession.create({
                data: { userId: user.id, title: 'New Chat' },
            });
            currentSessionId = newSession.id;
        }

        // 4. Get Context (Insights)
        const context = await aiService.getUserInsights(user.id);

        // 4.5. Get Conversation History
        const history = await prisma.aIChatMessage.findMany({
            where: { sessionId: currentSessionId },
            orderBy: { createdAt: 'asc' },
            take: 10, // Last 10 messages  
            select: {
                role: true,
                content: true,
            },
        });

        // 5. Generate Response (Local AI with history)
        const aiResponse = await aiService.generateResponse(
            message,
            context,
            SYSTEM_PROMPT,
            history,
            {
                temperature: 0.9,
                top_k: 50,
                repetition_penalty: 1.15
            }
        );

        // 6. Save Interaction & Extract Insights
        await aiService.saveInteraction(user.id, currentSessionId, message, aiResponse);
        await aiService.extractAndSaveInsight(user.id, message);

        // 7. Check for "Gift" or "Charm" triggers
        const giftTrigger = aiResponse.toLowerCase().includes('gift') || message.toLowerCase().includes('journal');
        const charmTrigger = aiResponse.toLowerCase().includes('charm') || message.toLowerCase().includes('card');

        return NextResponse.json({
            response: aiResponse,
            sessionId: currentSessionId,
            gift: giftTrigger ? { type: 'journal_template', name: 'Mindful Reflection' } : null,
            charm: charmTrigger ? { type: 'charm_card', title: 'Strength', quote: 'You are stronger than you know.' } : null,
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
