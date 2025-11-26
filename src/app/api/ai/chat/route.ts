import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aiService, PersonaType } from '@/lib/ai-service';

export async function POST(req: NextRequest) {
    try {
        // 1. Robust Auth Check (Offline Resilient)
        let userId = 'guest-user';
        let userEmail = 'guest@example.com';

        try {
            const session = await getServerSession(authOptions);
            if (session?.user?.email) {
                userEmail = session.user.email;
                // Try to fetch real user ID, fallback to guest if DB fails
                const user = await prisma.user.findUnique({ where: { email: userEmail } });
                if (user) userId = user.id;
            }
        } catch (e) {
            console.warn("Auth/DB Error (Running in Guest Mode):", e);
            // Continue as guest - do not crash
        }

        // 2. Parse Request
        const { message, sessionId, persona } = await req.json();
        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // 3. Get or Create Session (Offline Resilient)
        let currentSessionId = sessionId || `local-${Date.now()}`;
        if (userId !== 'guest-user') {
            try {
                if (!sessionId) {
                    const newSession = await prisma.aIChatSession.create({
                        data: { userId, title: 'New Chat' },
                    });
                    currentSessionId = newSession.id;
                }
            } catch (e) {
                console.warn("Session Creation Error (Using Local Session):", e);
            }
        }

        // 4. Get Context & History (Offline Resilient)
        let context = "";
        let history: any[] = [];

        if (userId !== 'guest-user') {
            try {
                context = await aiService.getUserInsights(userId);
                history = await prisma.aIChatMessage.findMany({
                    where: { sessionId: currentSessionId },
                    orderBy: { createdAt: 'asc' },
                    take: 10,
                    select: { role: true, content: true },
                });
            } catch (e) {
                console.warn("History Fetch Error:", e);
            }
        }

        // 5. Generate Response (The Core Logic)
        // Now returns { text, sentiment }
        const aiResult = await aiService.generateResponse(
            message,
            (persona as PersonaType) || 'friend',
            history
        );

        // 6. Save Interaction (Best Effort)
        if (userId !== 'guest-user') {
            // These are fire-and-forget in the service now, but we call them here
            await aiService.saveInteraction(userId, currentSessionId, message, aiResult.text);
            await aiService.extractAndSaveInsight(userId, message);
        }

        // 7. Triggers
        const giftTrigger = aiResult.text.toLowerCase().includes('gift') || message.toLowerCase().includes('journal');
        const charmTrigger = aiResult.text.toLowerCase().includes('charm') || message.toLowerCase().includes('card');

        return NextResponse.json({
            response: aiResult.text,
            sentiment: aiResult.sentiment, // New field
            sessionId: currentSessionId,
            gift: giftTrigger ? { type: 'journal_template', name: 'Mindful Reflection' } : null,
            charm: charmTrigger ? { type: 'charm_card', title: 'Strength', quote: 'You are stronger than you know.' } : null,
        });

    } catch (error) {
        console.error('Chat API Critical Error:', error);
        // Even in a critical error, try to return a valid JSON so the UI doesn't crash
        return NextResponse.json({
            response: "I'm having a bit of trouble connecting to my brain right now, but I'm still here. Please try again in a moment.",
            sentiment: { score: 0, label: 'neutral', color: '#888888' },
            sessionId: 'error-session'
        });
    }
}
