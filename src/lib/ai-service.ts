import { pipeline, Pipeline } from '@xenova/transformers';
import { prisma } from '@/lib/prisma'; // Assuming you have a global prisma client instance
import { UserInsight, AIChatMessage } from '@prisma/client';

// Singleton to hold the pipeline
class AIModelService {
    private static instance: AIModelService;
    private pipe: any = null;
    private modelName = 'Xenova/Phi-1_5'; // Better 1.3B parameter model

    private constructor() { }

    public static getInstance(): AIModelService {
        if (!AIModelService.instance) {
            AIModelService.instance = new AIModelService();
        }
        return AIModelService.instance;
    }

    public async getPipeline(): Promise<any> {
        if (!this.pipe) {
            console.log('Loading AI model...');
            this.pipe = await pipeline('text-generation', this.modelName);
            console.log('AI model loaded.');
        }
        return this.pipe;
    }
}

export const aiService = {
    // Generate a response using the local model
    async generateResponse(
        userMessage: string,
        context: string,
        systemPrompt: string,
        conversationHistory: Array<{ role: string; content: string }> = [],
        options: any = {}
    ): Promise<string> {
        try {
            const model = await AIModelService.getInstance().getPipeline();

            // Build conversation history string
            let historyText = '';
            if (conversationHistory.length > 0) {
                const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
                historyText = recentHistory.map(msg =>
                    `${msg.role === 'user' ? 'User' : 'dbot'}: ${msg.content}`
                ).join('\n');
            }

            // Construct a better prompt for Phi-1.5
            const fullPrompt = `${systemPrompt}

${historyText ? `Previous conversation:\n${historyText}\n` : ''}
User: ${userMessage}
dbot:`;

            const output = await model(fullPrompt, {
                max_new_tokens: 200,
                temperature: 0.9,
                do_sample: true,
                top_p: 0.95,
                top_k: 50,
                repetition_penalty: 1.15,
                num_return_sequences: 1,
            });

            // @ts-ignore - Transformers.js types can be tricky
            let responseText = output[0]?.generated_text || "I'm having trouble thinking right now.";

            // Extract only the new response (after "dbot:")
            const dbotIndex = responseText.lastIndexOf('dbot:');
            if (dbotIndex !== -1) {
                responseText = responseText.substring(dbotIndex + 5).trim();
            }

            // Clean up response
            responseText = responseText.split('\n')[0].trim(); // Take first line only
            responseText = responseText.replace(/^["']|["']$/g, ''); // Remove surrounding quotes

            return responseText || "I'm listening. Tell me more.";

        } catch (error) {
            console.error('AI Generation Error:', error);
            return "I'm sorry, I'm having a bit of trouble. Can we try again?";
        }
    },

    // DB Helper: Get User Insights
    async getUserInsights(userId: string): Promise<string> {
        const insights = await prisma.userInsight.findMany({
            where: { userId },
            orderBy: { confidence: 'desc' },
            take: 5,
        });

        if (insights.length === 0) return "No prior insights.";
        return insights.map(i => `- ${i.content}`).join('\n');
    },

    // DB Helper: Save Interaction
    async saveInteraction(
        userId: string,
        sessionId: string,
        userContent: string,
        aiContent: string
    ) {
        // Save User Message
        await prisma.aIChatMessage.create({
            data: {
                sessionId,
                role: 'user',
                content: userContent,
            },
        });

        // Save AI Message
        await prisma.aIChatMessage.create({
            data: {
                sessionId,
                role: 'assistant',
                content: aiContent,
            },
        });

        // Update session with new messages (optional, if you want to keep a running log in the session object itself)
        // But creating separate message records is usually enough.
    },

    // DB Helper: Extract and Save New Insight (Mock/Heuristic for now to save compute)
    // In a real scenario, we'd ask the model to extract insights in a second pass.
    async extractAndSaveInsight(userId: string, userContent: string) {
        // Simple heuristic: if user says "I feel" or "I am", save it.
        const lower = userContent.toLowerCase();
        if (lower.includes('i feel') || lower.includes('i am') || lower.includes('i like')) {
            await prisma.userInsight.create({
                data: {
                    userId,
                    content: userContent.substring(0, 200), // Truncate for safety
                    confidence: 0.8,
                },
            });
        }
    },

    // Transcribe audio using local Whisper model
    async transcribeAudio(audioBlob: Blob): Promise<string> {
        try {
            // Load Whisper model (lightweight version)
            const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');

            // Convert blob to array buffer
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioData = new Float32Array(arrayBuffer);

            // Transcribe
            const result = await transcriber(audioData);

            // @ts-ignore - Type handling for Transformers.js output
            return result?.text || result || '';
        } catch (error) {
            console.error('Transcription Error:', error);
            throw new Error('Failed to transcribe audio');
        }
    }
};
