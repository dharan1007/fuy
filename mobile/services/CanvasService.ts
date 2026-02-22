import { supabase } from '../lib/supabase';

export interface Block {
    id: string;
    type: 'TEXT' | 'CHECKLIST' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DRAW';
    text?: string;
    url?: string;
    caption?: string;
    checklist?: { id: string; text: string; done: boolean }[];
    drawing?: {
        paths: { points: [number, number][]; stroke?: string; strokeWidth?: number }[];
        stroke: string;
        strokeWidth: number;
    };
    // Position and size for canvas mode
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export type CanvasVisibility = 'PRIVATE' | 'FOLLOWERS' | 'PUBLIC';

export interface JournalEntry {
    id: string;
    title?: string;
    content?: string;
    blocks: Block[];
    mood?: string;
    tags?: string[];
    visibility?: CanvasVisibility;
    isTemplate?: boolean;
    createdAt: string;
    updatedAt?: string;
    userId?: string;
    user?: {
        id: string;
        name?: string;
        profile?: {
            displayName?: string;
            avatarUrl?: string;
        };
    };
}

export interface Todo {
    id: string;
    title: string;
    status: 'PENDING' | 'COMPLETED';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    createdAt: string;
    userId: string;
}

async function getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        throw new Error('Not authenticated');
    }
    return user.id;
}

// Generate a CUID-like ID (compatible with Prisma's cuid())
function generateCuid(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const randomPart2 = Math.random().toString(36).substring(2, 15);
    return `c${timestamp}${randomPart}${randomPart2}`.substring(0, 25);
}

export const CanvasService = {
    // READ: Direct from Supabase (faster, no rate limits)
    async fetchEntries(limit = 50): Promise<JournalEntry[]> {
        try {
            const userId = await getCurrentUserId();

            const { data, error } = await supabase
                .from('JournalEntry')
                .select('*')
                .eq('userId', userId)
                .order('createdAt', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('[CanvasService] Supabase error:', error);
                throw error;
            }


            // Parse JSON fields
            const entries = (data || []).map(e => ({
                ...e,
                blocks: e.blocks ? (typeof e.blocks === 'string' ? JSON.parse(e.blocks) : e.blocks) : [],
                tags: e.tags ? (typeof e.tags === 'string' ? JSON.parse(e.tags) : e.tags) : [],
            }));

            return entries;
        } catch (error) {
            console.error('[CanvasService] fetchEntries error:', error);
            return [];
        }
    },

    // Fetch public entries from followed users (for templates)
    async fetchPublicTemplates(): Promise<JournalEntry[]> {
        try {
            const userId = await getCurrentUserId();


            // Get list of users this user follows
            const { data: following } = await supabase
                .from('Follow')
                .select('followingId')
                .eq('followerId', userId);

            const followedIds = (following || []).map(f => f.followingId);

            if (followedIds.length === 0) {
                // If not following anyone, just get some public entries
                const { data, error } = await supabase
                    .from('JournalEntry')
                    .select('*, user:User(id, name, profile:Profile(displayName, avatarUrl))')
                    .eq('visibility', 'PUBLIC')
                    .neq('userId', userId)
                    .order('createdAt', { ascending: false })
                    .limit(10);

                if (error) throw error;
                return (data || []).map(e => ({
                    ...e,
                    blocks: e.blocks ? (typeof e.blocks === 'string' ? JSON.parse(e.blocks) : e.blocks) : [],
                    tags: e.tags ? (typeof e.tags === 'string' ? JSON.parse(e.tags) : e.tags) : [],
                }));
            }

            // Get public entries from followed users
            const { data, error } = await supabase
                .from('JournalEntry')
                .select('*, user:User(id, name, profile:Profile(displayName, avatarUrl))')
                .in('userId', followedIds)
                .or('visibility.eq.PUBLIC,visibility.eq.FOLLOWERS')
                .order('createdAt', { ascending: false })
                .limit(20);

            if (error) throw error;

            return (data || []).map(e => ({
                ...e,
                blocks: e.blocks ? (typeof e.blocks === 'string' ? JSON.parse(e.blocks) : e.blocks) : [],
                tags: e.tags ? (typeof e.tags === 'string' ? JSON.parse(e.tags) : e.tags) : [],
            }));
        } catch (error) {
            console.error('[CanvasService] fetchPublicTemplates error:', error);
            return [];
        }
    },

    // WRITE: Using authenticated client with RLS
    async saveEntry(entry: Partial<JournalEntry>): Promise<JournalEntry | null> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = supabase;

            const entryData = {
                userId,
                content: entry.content || '',
                blocks: JSON.stringify(entry.blocks || []),
                mood: entry.mood || null,
                tags: JSON.stringify(entry.tags || []),
                visibility: entry.visibility || 'PRIVATE',
            };

            let result;
            if (entry.id) {
                // Update existing
                const { data, error } = await supabase
                    .from('JournalEntry')
                    .update({ ...entryData, updatedAt: new Date().toISOString() })
                    .eq('id', entry.id)
                    .select()
                    .single();

                if (error) {
                    console.error('[CanvasService] Update error:', error);
                    throw error;
                }
                result = data;
            } else {
                // Create new - need to generate ID since Supabase doesn't auto-generate like Prisma
                const newId = generateCuid();
                const { data, error } = await supabase
                    .from('JournalEntry')
                    .insert({ id: newId, ...entryData, updatedAt: new Date().toISOString() })
                    .select()
                    .single();

                if (error) {
                    console.error('[CanvasService] Insert error:', error);
                    throw error;
                }
                result = data;
            }


            return result ? {
                ...result,
                blocks: result.blocks ? JSON.parse(result.blocks) : [],
                tags: result.tags ? JSON.parse(result.tags) : [],
            } : null;
        } catch (error) {
            console.error('[CanvasService] saveEntry error:', error);
            return null;
        }
    },

    async deleteEntry(id: string): Promise<boolean> {
        try {
            const userId = await getCurrentUserId();


            const { error } = await supabase
                .from('JournalEntry')
                .delete()
                .eq('id', id)
                .eq('userId', userId);

            if (error) {
                console.error('[CanvasService] Delete error:', error);
                throw error;
            }
            return true;
        } catch (error) {
            console.error('[CanvasService] deleteEntry error:', error);
            return false;
        }
    },
};

export const TodoService = {
    // READ: Direct from Supabase
    async fetchTodos(): Promise<Todo[]> {
        try {
            const userId = await getCurrentUserId();


            const { data, error } = await supabase
                .from('Todo')
                .select('*')
                .eq('userId', userId)
                .order('createdAt', { ascending: false });

            if (error) {
                console.error('[TodoService] Supabase error:', error);
                throw error;
            }


            return data || [];
        } catch (error) {
            console.error('[TodoService] fetchTodos error:', error);
            return [];
        }
    },

    // WRITE: Using authenticated client with RLS
    async createTodo(title: string, priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'): Promise<Todo | null> {
        try {
            const userId = await getCurrentUserId();

            const { data, error } = await supabase
                .from('Todo')
                .insert({
                    id: generateCuid(),
                    userId,
                    title,
                    priority,
                    status: 'PENDING',
                    updatedAt: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) {
                console.error('[TodoService] Insert error:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('[TodoService] createTodo error:', error);
            return null;
        }
    },

    async updateTodo(id: string, updates: { status?: string; title?: string }): Promise<Todo | null> {
        try {
            const userId = await getCurrentUserId();


            const { data, error } = await supabase
                .from('Todo')
                .update({ ...updates, updatedAt: new Date().toISOString() })
                .eq('id', id)
                .eq('userId', userId)
                .select()
                .single();

            if (error) {
                console.error('[TodoService] Update error:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('[TodoService] updateTodo error:', error);
            return null;
        }
    },

    async deleteTodo(id: string): Promise<boolean> {
        try {
            const userId = await getCurrentUserId();


            const { error } = await supabase
                .from('Todo')
                .delete()
                .eq('id', id)
                .eq('userId', userId);

            if (error) {
                console.error('[TodoService] Delete error:', error);
                throw error;
            }
            return true;
        } catch (error) {
            console.error('[TodoService] deleteTodo error:', error);
            return false;
        }
    },
};
