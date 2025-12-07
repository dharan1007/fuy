import { supabase } from '../lib/supabase';

export interface CardSection {
    id: string;
    title: string;
    questions: {
        id: string;
        question: string;
        answer: string;
        type: 'text' | 'long-text' | 'list';
    }[];
}

export interface ProfileCardData {
    uniqueCode: string;
    content: {
        sections: CardSection[];
        basicInfo: {
            name: string;
            age?: string;
            location?: string;
            occupation?: string;
        };
    };
    theme: string;
}

export const ProfileCardService = {
    // Generate a proper ID for the row (CUID-like or UUID-like)
    generateId: () => {
        return 'pc_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // Generate a random 7-character alphanumeric code
    generateUniqueCode: () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 7; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // Get user's profile card
    getCard: async (userId: string) => {
        const { data, error } = await supabase
            .from('ProfileCard')
            .select(`
                *,
                user:User (
                    id,
                    name,
                    profile:Profile (displayName, avatarUrl)
                )
            `)
            .eq('userId', userId)
            .single();

        if (error) return null;
        return {
            ...data,
            content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content
        };
    },

    // Get card by unique code
    getCardByCode: async (code: string) => {
        const { data, error } = await supabase
            .from('ProfileCard')
            .select(`
                *,
                user:User (
                    id,
                    name,
                    profile:Profile (displayName, avatarUrl)
                )
            `)
            .eq('uniqueCode', code)
            .single();

        if (error) return null;
        return {
            ...data,
            content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content
        };
    },

    // Create or update card
    saveCard: async (userId: string, data: any) => {
        try {
            // Check if exists
            const { data: existing, error: fetchError } = await supabase
                .from('ProfileCard')
                .select('uniqueCode')
                .eq('userId', userId)
                .maybeSingle();

            if (fetchError) throw fetchError;

            const payload = {
                userId,
                content: JSON.stringify(data.content),
                theme: data.theme,
                uniqueCode: existing ? existing.uniqueCode : ProfileCardService.generateUniqueCode(),
                updatedAt: new Date().toISOString()
            };

            if (existing) {
                const { error } = await supabase
                    .from('ProfileCard')
                    .update({
                        content: payload.content,
                        theme: payload.theme,
                        updatedAt: payload.updatedAt
                    })
                    .eq('userId', userId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('ProfileCard')
                    .insert({
                        ...payload,
                        id: ProfileCardService.generateId(), // Generate ID client-side
                        createdAt: new Date().toISOString()
                    });
                if (error) throw error;
            }
        } catch (e) {
            console.error('ProfileCardService.saveCard error:', e);
            throw e;
        }
    }
};
