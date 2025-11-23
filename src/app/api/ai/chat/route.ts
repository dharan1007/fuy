import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Adjust path to your auth options
import { prisma } from '@/lib/prisma';
import { aiService } from '@/lib/ai-service';

const SYSTEM_PROMPT = `
You are "dbot", a gentle, comforting, and motivating AI companion.
Your goal is to help the user understand their thoughts and feelings.
ALWAYS be kind, empathetic, and supportive.
NEVER use hurtful, aggressive, or judgmental language.
If the user is distressed, offer comfort and simple grounding techniques.
Keep your responses concise and conversational (2-3 sentences usually).
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
        const aiResponse = await aiService.generateResponse(message, context, SYSTEM_PROMPT);

        // 6. Save Interaction & Extract Insights
        await aiService.saveInteraction(user.id, currentSessionId, message, aiResponse);
        await aiService.extractAndSaveInsight(user.id, message);

        // 7. Check for "Gift" or "Charm" triggers (Simple keyword check for now)
        // In a more advanced version, the AI could output a special token.
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
