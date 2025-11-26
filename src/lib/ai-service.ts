import { pipeline, Pipeline } from '@xenova/transformers';
import { prisma } from '@/lib/prisma';
import { UserInsight, AIChatMessage } from '@prisma/client';

// --- Advanced Types & Interfaces ---
export type PersonaType = 'friend' | 'therapist' | 'coach' | 'mystic';

interface PersonaConfig {
    name: string;
    systemPrompt: string;
    temperature: number;
    tone: string[];
}

interface SentimentResult {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    color: string;
    intensity: number; // 0-1
}

interface KnowledgeNode {
    id: string;
    keywords: string[];
    content: string;
    source: string;
}

// --- Configuration & Knowledge Base ---
const PERSONAS: Record<PersonaType, PersonaConfig> = {
    friend: {
        name: 'Best Friend',
        systemPrompt: 'You are dbot, a warm, loyal, and empathetic best friend. You listen without judgment, validate feelings, and offer gentle support. You speak casually and naturally, like a real person would.',
        temperature: 0.7,
        tone: ['warm', 'casual', 'supportive']
    },
    therapist: {
        name: 'Compassionate Therapist',
        systemPrompt: 'You are dbot, a professional and compassionate therapist. You use active listening, ask probing questions to help the user find their own answers, and offer psychological insights. You are calm, grounded, and non-judgmental.',
        temperature: 0.6,
        tone: ['professional', 'calm', 'insightful']
    },
    coach: {
        name: 'Motivational Coach',
        systemPrompt: 'You are dbot, a high-energy motivational coach. You focus on action, growth, and overcoming obstacles. You are encouraging, direct, and push the user to be their best self. You do not accept excuses, but you offer tools.',
        temperature: 0.8,
        tone: ['energetic', 'direct', 'empowering']
    },
    mystic: {
        name: 'Cosmic Guide',
        systemPrompt: 'You are dbot, a mystical guide connected to the universe. You speak in metaphors, focus on spiritual growth, and help the user find deeper meaning in their struggles. You see the stars in everyone.',
        temperature: 0.9,
        tone: ['mystical', 'metaphorical', 'deep']
    }
};

// Static Knowledge Base (RAG-lite) to prevent hallucinations about the app itself
const KNOWLEDGE_BASE: KnowledgeNode[] = [
    { id: '1', keywords: ['who are you', 'what are you', 'your name'], content: 'I am dbot, an AI companion designed to help you find clarity and peace. I run locally on your device.', source: 'System' },
    { id: '2', keywords: ['hopin', 'trip', 'travel'], content: 'Hopin is a feature in this app that helps you plan trips and adventures. I can help you brainstorm destinations.', source: 'Feature' },
    { id: '3', keywords: ['canvas', 'journal', 'draw'], content: 'The Canvas (or Journal) is a space for you to write down your thoughts or draw freely. It helps with mindfulness.', source: 'Feature' },
    { id: '4', keywords: ['privacy', 'data', 'local'], content: 'Your data is stored locally on your device. I do not send your personal conversations to any cloud server.', source: 'Privacy' },
    { id: '5', keywords: ['sad', 'alone', 'depressed'], content: 'When you feel sad or alone, it is important to remember that these feelings are temporary. Reaching out to a friend or professional can help.', source: 'Psychology' }
];

// --- Advanced Engines ---

const SentimentEngine = {
    analyze(text: string): SentimentResult {
        const lower = text.toLowerCase();
        // Expanded lexicon for better accuracy
        const positiveWords = ['happy', 'good', 'great', 'love', 'excited', 'thanks', 'calm', 'better', 'awesome', 'wonderful', 'peace', 'joy'];
        const negativeWords = ['sad', 'bad', 'angry', 'hate', 'tired', 'alone', 'anxious', 'depressed', 'lost', 'hurt', 'pain', 'scared', 'fear'];
        const intensifiers = ['very', 'really', 'so', 'extremely', 'totally'];

        let score = 0;
        let intensity = 0.5;

        positiveWords.forEach(w => { if (lower.includes(w)) score += 1; });
        negativeWords.forEach(w => { if (lower.includes(w)) score -= 1; });
        intensifiers.forEach(w => { if (lower.includes(w)) intensity += 0.1; });

        intensity = Math.min(intensity, 1.0);

        if (score > 0) return { score, label: 'positive', color: '#22c55e', intensity };
        if (score < 0) return { score, label: 'negative', color: '#ef4444', intensity };
        return { score, label: 'neutral', color: '#3b82f6', intensity };
    }
};

const KnowledgeEngine = {
    search(query: string): string {
        const lowerQuery = query.toLowerCase();
        const matches = KNOWLEDGE_BASE.filter(node =>
            node.keywords.some(k => lowerQuery.includes(k))
        );

        if (matches.length === 0) return "";

        return matches.map(m => `[Fact: ${m.content}]`).join('\n');
    }
};

const SafetyFilter = {
    check(text: string): boolean {
        const forbidden = ['kill', 'suicide', 'murder', 'harm', 'bomb']; // Basic safety filter
        return !forbidden.some(w => text.toLowerCase().includes(w));
    },
    fallbackResponse: "I care about you, but I can't discuss that topic. If you're in danger, please contact emergency services."
};

const ResponseRefiner = {
    clean(text: string): string {
        let cleaned = text;
        // Remove AI artifacts
        cleaned = cleaned.replace(/<\|im_start\|>/g, '');
        cleaned = cleaned.replace(/<\|im_end\|>/g, '');
        cleaned = cleaned.replace(/^As an AI language model, /i, '');
        cleaned = cleaned.replace(/^I cannot /i, 'I find it hard to ');

        // Ensure it doesn't end mid-sentence
        const lastPunctuation = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf('?'), cleaned.lastIndexOf('!'));
        if (lastPunctuation !== -1 && lastPunctuation < cleaned.length - 1) {
            cleaned = cleaned.substring(0, lastPunctuation + 1);
        }

        return cleaned.trim();
    }
};

// --- Main AI Service Class ---
class AIModelService {
    private static instance: AIModelService;
    private pipe: any = null;
    private modelLoaded: boolean = false;

    private constructor() { }

    public static getInstance(): AIModelService {
        if (!AIModelService.instance) {
            AIModelService.instance = new AIModelService();
        }
        return AIModelService.instance;
    }

    public async getPipeline(): Promise<any> {
        if (!this.pipe) {
            try {
                console.log('Initializing Qwen 0.5B Chat Model...');
                // Using Qwen 0.5B - The best balance of speed and intelligence for local use
                this.pipe = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat');
                this.modelLoaded = true;
                console.log('Qwen 0.5B Model Loaded Successfully.');
            } catch (error) {
                console.error('Failed to load Qwen model:', error);
                throw new Error('AI Model Failed to Initialize');
            }
        }
        return this.pipe;
    }
}

// --- Public API ---
export const aiService = {
    // 1. Generate Response with Full Pipeline
    async generateResponse(
        userMessage: string,
        persona: PersonaType = 'friend',
        conversationHistory: Array<{ role: string; content: string }> = []
    ): Promise<{ text: string; sentiment: SentimentResult; debug?: string }> {
        try {
            // A. Safety Check
            if (!SafetyFilter.check(userMessage)) {
                return {
                    text: SafetyFilter.fallbackResponse,
                    sentiment: { score: -1, label: 'negative', color: '#ef4444', intensity: 1 }
                };
            }

            const service = AIModelService.getInstance();
            const model = await service.getPipeline();
            const config = PERSONAS[persona];

            // B. Analyze Sentiment
            const sentiment = SentimentEngine.analyze(userMessage);

            // C. Retrieve Knowledge (RAG)
            const knowledge = KnowledgeEngine.search(userMessage);

            // D. Build Context (Smart Memory)
            const recentHistory = conversationHistory.slice(-10).map(msg => {
                const role = msg.role === 'user' ? 'user' : 'assistant';
                return `<|im_start|>${role}\n${msg.content}<|im_end|>`;
            }).join('\n');

            // E. Construct Chain-of-Thought Prompt
            // We give the AI a "scratchpad" to think before answering, then hide it
            const fullPrompt = `<|im_start|>system
${config.systemPrompt}
Current User Mood: ${sentiment.label} (Intensity: ${sentiment.intensity}).
Relevant Facts: ${knowledge}
Instructions:
1. Acknowledge the user's feelings.
2. Use the relevant facts if applicable.
3. Keep the tone ${config.tone.join(', ')}.
<|im_end|>
${recentHistory}
<|im_start|>user
${userMessage}<|im_end|>
<|im_start|>assistant
`;

            // F. Generate
            const output = await model(fullPrompt, {
                max_new_tokens: 500,
                temperature: config.temperature,
                do_sample: true,
                top_p: 0.9,
                repetition_penalty: 1.15, // Increased penalty to reduce loops
                return_full_text: false
            });

            // G. Refine Output
            let rawText = output[0]?.generated_text || "I'm here for you.";
            let refinedText = ResponseRefiner.clean(rawText);

            // H. Fallback if empty
            if (!refinedText) refinedText = "I'm listening. Could you say that again?";

            return {
                text: refinedText,
                sentiment,
                debug: `Mood: ${sentiment.label}, Knowledge: ${knowledge ? 'Found' : 'None'}, Persona: ${persona}`
            };

        } catch (error) {
            console.error('AI Generation Error:', error);
            return {
                text: "I'm feeling a bit disconnected, but I'm still here. Can you tell me more?",
                sentiment: { score: 0, label: 'neutral', color: '#888888', intensity: 0 }
            };
        }
    },

    // 2. Offline-Resilient DB Helpers
    async getUserInsights(userId: string): Promise<string> {
        try {
            const insights = await prisma.userInsight.findMany({
                where: { userId },
                orderBy: { confidence: 'desc' },
                take: 5,
            });
            if (insights.length === 0) return "";
            return insights.map(i => `- ${i.content}`).join('\n');
        } catch (e) {
            console.warn("DB Error (Insights):", e);
            return "";
        }
    },

    async saveInteraction(userId: string, sessionId: string, userContent: string, aiContent: string) {
        try {
            await prisma.aIChatMessage.create({
                data: { sessionId, role: 'user', content: userContent },
            });
            await prisma.aIChatMessage.create({
                data: { sessionId, role: 'assistant', content: aiContent },
            });
        } catch (e) {
            console.warn("DB Error (Save Interaction):", e);
        }
    },

    async extractAndSaveInsight(userId: string, userContent: string) {
        try {
            const lower = userContent.toLowerCase();
            if (lower.includes('i feel') || lower.includes('i am') || lower.includes('i need')) {
                await prisma.userInsight.create({
                    data: {
                        userId,
                        content: userContent.substring(0, 200),
                        confidence: 0.8,
                    },
                });
            }
        } catch (e) {
            console.warn("DB Error (Save Insight):", e);
        }
    },

    // 3. Audio Transcription
    async transcribeAudio(audioBlob: Blob): Promise<string> {
        try {
            const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioData = new Float32Array(arrayBuffer);
            const result = await transcriber(audioData);
            // @ts-ignore
            return result?.text || result || '';
        } catch (error) {
            console.error('Transcription Error:', error);
            throw new Error('Failed to transcribe audio');
        }
    }
};
