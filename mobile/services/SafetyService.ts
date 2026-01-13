import { supabase } from '../lib/supabase';

export interface SafetyFilters {
    excludedUserIds: string[];
    hiddenPostIds: string[];
}

export const getSafetyFilters = async (userId: string): Promise<SafetyFilters> => {
    if (!userId) {
        return { excludedUserIds: [], hiddenPostIds: [] };
    }

    try {
        const [muted, blocked, hidden] = await Promise.all([
            supabase.from('MutedUser').select('mutedUserId').eq('muterId', userId),
            supabase.from('BlockedUser').select('blockedId').eq('blockerId', userId),
            supabase.from('HiddenPost').select('postId').eq('userId', userId)
        ]);

        const excludedUserIds: string[] = [];
        const hiddenPostIds: string[] = [];

        if (muted.data) {
            excludedUserIds.push(...muted.data.map((m: any) => m.mutedUserId));
        }

        if (blocked.data) {
            excludedUserIds.push(...blocked.data.map((b: any) => b.blockedId));
        }

        if (hidden.data) {
            hiddenPostIds.push(...hidden.data.map((h: any) => h.postId));
        }

        return {
            excludedUserIds: [...new Set(excludedUserIds)], // Remove duplicates
            hiddenPostIds: [...new Set(hiddenPostIds)]
        };
    } catch (e) {
        console.error('[SafetyService] Error fetching filters:', e);
        return { excludedUserIds: [], hiddenPostIds: [] };
    }
};

export const applySafetyFilters = (query: any, filters: SafetyFilters) => {
    const { excludedUserIds, hiddenPostIds } = filters;

    if (excludedUserIds.length > 0) {
        // format: (id1,id2,id3)
        const filterString = `(${excludedUserIds.join(',')})`;
        query = query.filter('userId', 'not.in', filterString);
    }

    if (hiddenPostIds.length > 0) {
        const filterString = `(${hiddenPostIds.join(',')})`;
        query = query.filter('id', 'not.in', filterString);
    }

    return query;
};
