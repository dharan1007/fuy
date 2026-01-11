// Mobile Supabase Admin Client - uses service role for bypassing RLS
// WARNING: Service role key should be kept secure - only for trusted apps
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Supabase Admin: URL or Service Role Key is missing.');
}

// Admin client bypasses RLS - use for read operations only
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
});

// Fetch public posts with full data
export async function fetchPublicPosts(limit: number = 20, postType?: string) {
    try {
        let query = supabaseAdmin
            .from('Post')
            .select(`
                id,
                content,
                postType,
                createdAt,
                visibility,
                userId,
                user:User (
                    id,
                    name,
                    profile:Profile (avatarUrl, displayName)
                ),
                postMedia:PostMedia (
                    media:Media (url, type)
                ),
                _count:PostLike (count),
                commentCount:Comment (count)
            `)
            .eq('visibility', 'PUBLIC')
            .order('createdAt', { ascending: false })
            .limit(limit);

        if (postType && postType !== 'mix') {
            const typeMap: Record<string, string> = {
                lills: 'LILL',
                fills: 'FILL',
                auds: 'AUD',
                channels: 'CHAN',
                chapters: 'CHAPTER',
                xrays: 'XRAY',
                pupds: 'PULLUPDOWN',
            };
            if (typeMap[postType]) {
                query = query.eq('postType', typeMap[postType]);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('Supabase fetch error:', error.message);
            return [];
        }

        // Transform to standard format
        return (data || []).map((p: any) => ({
            id: p.id,
            content: p.content,
            postType: p.postType,
            createdAt: p.createdAt,
            userId: p.userId,
            likes: Array.isArray(p._count) ? p._count.length : 0,
            comments: Array.isArray(p.commentCount) ? p.commentCount.length : 0,
            user: {
                id: p.user?.id,
                name: p.user?.name,
                profile: p.user?.profile,
            },
            media: (p.postMedia || []).map((pm: any) => ({
                url: pm.media?.url,
                type: pm.media?.type,
            })),
        }));
    } catch (error) {
        console.error('fetchPublicPosts error:', error);
        return [];
    }
}
