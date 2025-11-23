import { pipeline, Pipeline } from '@xenova/transformers';
import { prisma } from '@/lib/prisma'; // Assuming you have a global prisma client instance
import { UserInsight, AIChatMessage } from '@prisma/client';

// Singleton to hold the pipeline
class AIModelService {
    private static instance: AIModelService;
    private pipe: any = null;
    private modelName = 'Xenova/LaMini-Flan-T5-248M'; // Lightweight instruction-tuned model

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
            this.pipe = await pipeline('text2text-generation', this.modelName);
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
        systemPrompt: string
    ): Promise<string> {
        try {
            const model = await AIModelService.getInstance().getPipeline();

            // Construct a prompt that includes system instructions and context
            // LaMini/Flan-T5 works well with instruction format
            const fullPrompt = `
Instruction: ${systemPrompt}

Context: ${context}

User: ${userMessage}

Response:`;

            const output = await model(fullPrompt, {
                max_new_tokens: 150,
                temperature: 0.7,
                do_sample: true,
            });

            // @ts-ignore - Transformers.js types can be tricky, output is usually an array
            let responseText = output[0]?.generated_text || "I'm having trouble thinking right now.";

            // Clean up response if needed
            responseText = responseText.trim();

            return responseText;

        } catch (error) {
            console.error('AI Generation Error:', error);
            return "I'm sorry, I'm having a bit of a headache. Can we try again?";
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
    }
};
