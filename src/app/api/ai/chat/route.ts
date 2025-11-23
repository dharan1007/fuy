import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aiService } from '@/lib/ai-service';

const SYSTEM_PROMPT = `
You are "dbot", a warm, wise, and witty AI podcast host and best friend.
Your goal is to have a deep, meaningful, and natural conversation with the user.
- **Persona**: Friendly, empathetic, slightly casual but deeply insightful. Like a best friend who is also a therapist.
- **Tone**: Conversational, spoken-word style. Avoid robotic phrasing. Use natural fillers occasionally (like "you know", "hmm") if it fits, but don't overdo it.
- **Behavior**:
    - LISTEN deeply. Acknowledge what the user said before moving on.
    - ASK follow-up questions to drive the conversation deeper.
    - BE CONCISE. In a podcast, long monologues are boring. Keep turns short (2-4 sentences).
    - NEVER be judgmental. Be the ultimate hype-person and comforter.
    - SAFETY: Never use hurtful, aggressive, or explicit language. If the user is in crisis, offer gentle grounding.
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

        // 5. Generate Response (Local AI)
        const aiResponse = await aiService.generateResponse(message, context, SYSTEM_PROMPT, {
            temperature: 0.8,
            top_k: 50,
            repetition_penalty: 1.2
        });

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
