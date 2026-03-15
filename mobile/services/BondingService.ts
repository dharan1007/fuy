// SECURITY CONTRACT — BondingService
// 1. verifyConversationAccess() must be called before every method
// 2. Never query Message.content — only aggregate counts or use already-decrypted on-device data
// 3. Hard no / green flag matching uses ONLY: AsyncStorage snoozed_messages (decrypted),
//    or in-memory message previews already rendered in the chat view — never trigger a new decrypt batch
// 4. Partner profile data fetched: hardNos, greenFlags, communicationPassport, displayName ONLY
//    — these are public profile fields
// 5. BondMoment.preview_text is set by the calling screen (chat room) after decryption
//    — never set server-side
// 6. All state owned by bonding.tsx is scoped to the current conversation — switching partner
//    via profile switcher must call loadBondingData() with the new conversationId
// 7. CanvasSession logs are created only when both users are confirmed active
//    — never create a log unilaterally

import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatStats {
    totalMessages: number;
    thisWeek: number;
    myCount: number;
    theirCount: number;
    replyStreak: number;
}

export interface ChatBehaviourStats {
    silentSends: { myCount: number; theirCount: number };
    toneCounts: Record<string, number>;
    stackCount: number;
    slashCommandCounts: Record<string, { myCount: number; theirCount: number }>;
    canvasSessionCount: number;
}

export interface SnoozedItem {
    id: string;
    text: string;
    snoozedAt: string;
    reminderAt: string;
    isPending: boolean;
}

export interface HardNoViolation {
    keyword: string;
    violationCount: number;
}

export interface GreenFlagMatch {
    flag: string;
    matched: boolean;
}

export interface SlashPulseItem {
    tag: string;
    slashId?: string;
    myScore: number;
    theirScore: number;
    category: 'both' | 'only_me' | 'only_them';
}

export interface BondMomentRow {
    id: string;
    preview_text: string;
    pinned_at: string;
    message_id: string | null;
    slash_context_id: string | null;
}

export interface BondMomentData {
    firstMessage: { text: string; createdAt: string } | null;
    pinned: BondMomentRow[];
}

export interface PartnerPassport {
    displayName: string;
    hardNos: string[];
    greenFlags: string[];
    communicationPassport: {
        responseTime?: string;
        formatPreference?: string;
        depth?: string;
        availability?: string;
    } | null;
}

export interface StickyNoteData {
    text: string;
    setBy: string;
    setAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SNOOZE_STORAGE_KEY = 'app:snooze:items';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Service ─────────────────────────────────────────────────────────────────

class BondingServiceImpl {
    private passportCache: Map<string, PartnerPassport> = new Map();

    // ── Security wrapper ─────────────────────────────────────────────────────

    async verifyConversationAccess(conversationId: string): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        const { data } = await supabase
            .from('Conversation')
            .select('id')
            .eq('id', conversationId)
            .or(`participantA.eq.${user.id},participantB.eq.${user.id}`)
            .single();
        return !!data;
    }

    private async getCurrentUserId(): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        return user.id;
    }

    private async getDbUserId(): Promise<string> {
        const authId = await this.getCurrentUserId();
        // Auth user ID may differ from DB User.id — resolve via email
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) throw new Error('No email on auth user');
        const { data } = await supabase
            .from('User')
            .select('id')
            .eq('email', user.email)
            .single();
        if (!data) throw new Error('DB user not found');
        return data.id;
    }

    // ── 1. getBondScore ──────────────────────────────────────────────────────
    // Base score: 50 + min(totalMessages / 10, 30)
    // Modifiers:
    //   - If uninterested tone count > 3 in the last 7 days: subtract 5
    //   - If canvas sessions > 0 in the last 7 days: add 3
    // Clamped to 0–100

    async getBondScore(conversationId: string): Promise<number> {
        if (!(await this.verifyConversationAccess(conversationId))) return 0;
        const userId = await this.getDbUserId();
        const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

        const [msgResult, uninterestedResult, canvasResult] = await Promise.all([
            supabase.from('Message')
                .select('id', { count: 'exact', head: true })
                .eq('conversationId', conversationId),
            supabase.from('Message')
                .select('id', { count: 'exact', head: true })
                .eq('conversationId', conversationId)
                .eq('senderId', userId)
                .eq('tone', 'uninterested')
                .gte('createdAt', sevenDaysAgo),
            supabase.from('CanvasSession')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', conversationId)
                .gte('started_at', sevenDaysAgo),
        ]);

        const totalMessages = msgResult.count ?? 0;
        const uninterestedCount = uninterestedResult.count ?? 0;
        const canvasCount = canvasResult.count ?? 0;

        let score = 50 + Math.min(totalMessages / 10, 30);
        score -= uninterestedCount > 3 ? 5 : 0;
        score += canvasCount > 0 ? 3 : 0;

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    // ── 2. getChatStats ──────────────────────────────────────────────────────

    async getChatStats(conversationId: string): Promise<ChatStats> {
        if (!(await this.verifyConversationAccess(conversationId))) {
            return { totalMessages: 0, thisWeek: 0, myCount: 0, theirCount: 0, replyStreak: 0 };
        }
        const userId = await this.getDbUserId();
        const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

        const [allResult, weekResult] = await Promise.all([
            supabase.from('Message')
                .select('senderId, createdAt')
                .eq('conversationId', conversationId)
                .order('createdAt', { ascending: false })
                .limit(500),
            supabase.from('Message')
                .select('id', { count: 'exact', head: true })
                .eq('conversationId', conversationId)
                .gte('createdAt', sevenDaysAgo),
        ]);

        const messages = allResult.data ?? [];
        const totalMessages = messages.length;
        const thisWeek = weekResult.count ?? 0;
        const myCount = messages.filter(m => m.senderId === userId).length;
        const theirCount = totalMessages - myCount;

        // Reply streak: consecutive days both users sent at least one message
        let replyStreak = 0;
        if (messages.length > 0) {
            const dayMap = new Map<string, Set<string>>();
            for (const m of messages) {
                const day = m.createdAt.substring(0, 10); // YYYY-MM-DD
                if (!dayMap.has(day)) dayMap.set(day, new Set());
                dayMap.get(day)!.add(m.senderId);
            }

            const today = new Date();
            for (let i = 0; i < 365; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const key = d.toISOString().substring(0, 10);
                const senders = dayMap.get(key);
                if (senders && senders.size >= 2) {
                    replyStreak++;
                } else {
                    break;
                }
            }
        }

        return { totalMessages, thisWeek, myCount, theirCount, replyStreak };
    }

    // ── 3. getChatBehaviourStats ─────────────────────────────────────────────

    async getChatBehaviourStats(conversationId: string): Promise<ChatBehaviourStats> {
        if (!(await this.verifyConversationAccess(conversationId))) {
            return {
                silentSends: { myCount: 0, theirCount: 0 },
                toneCounts: {},
                stackCount: 0,
                slashCommandCounts: {},
                canvasSessionCount: 0,
            };
        }
        const userId = await this.getDbUserId();
        const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

        const [silentResult, toneResult, stackResult, slashResult, canvasResult] = await Promise.all([
            // Silent sends
            supabase.from('Message')
                .select('senderId')
                .eq('conversationId', conversationId)
                .eq('silent_send', true),
            // Tone breakdown for current user
            supabase.from('Message')
                .select('tone')
                .eq('conversationId', conversationId)
                .eq('senderId', userId)
                .neq('tone', 'default'),
            // Stack count: distinct stack_ids
            supabase.from('Message')
                .select('stack_id')
                .eq('conversationId', conversationId)
                .eq('senderId', userId)
                .not('stack_id', 'is', null),
            // Slash command messages by type
            supabase.from('Message')
                .select('type, senderId')
                .eq('conversationId', conversationId)
                .in('type', ['POLL', 'SPIN_WHEEL', 'LOCATION', 'STICKY']),
            // Canvas sessions this month
            supabase.from('CanvasSession')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', conversationId)
                .gte('started_at', thirtyDaysAgo),
        ]);

        // Process silent sends
        const silentData = silentResult.data ?? [];
        const silentSends = {
            myCount: silentData.filter(s => s.senderId === userId).length,
            theirCount: silentData.filter(s => s.senderId !== userId).length,
        };

        // Process tone counts
        const toneCounts: Record<string, number> = {};
        for (const row of (toneResult.data ?? [])) {
            const t = row.tone as string;
            toneCounts[t] = (toneCounts[t] || 0) + 1;
        }

        // Process stack count (distinct stack_ids)
        const stackIds = new Set<string>();
        for (const row of (stackResult.data ?? [])) {
            if (row.stack_id) stackIds.add(row.stack_id);
        }

        // Process slash commands
        const slashCommandCounts: Record<string, { myCount: number; theirCount: number }> = {};
        for (const row of (slashResult.data ?? [])) {
            const t = row.type as string;
            if (!slashCommandCounts[t]) slashCommandCounts[t] = { myCount: 0, theirCount: 0 };
            if (row.senderId === userId) slashCommandCounts[t].myCount++;
            else slashCommandCounts[t].theirCount++;
        }

        return {
            silentSends,
            toneCounts,
            stackCount: stackIds.size,
            slashCommandCounts,
            canvasSessionCount: canvasResult.count ?? 0,
        };
    }

    // ── 4. getActiveStickyNote ────────────────────────────────────────────────

    async getActiveStickyNote(conversationId: string): Promise<StickyNoteData | null> {
        if (!(await this.verifyConversationAccess(conversationId))) return null;

        const { data } = await supabase
            .from('Conversation')
            .select('sticky_note')
            .eq('id', conversationId)
            .single();

        if (!data?.sticky_note) return null;

        try {
            const parsed = typeof data.sticky_note === 'string'
                ? JSON.parse(data.sticky_note)
                : data.sticky_note;
            if (parsed?.text) return parsed as StickyNoteData;
        } catch { /* not valid JSON */ }

        return null;
    }

    // ── 5. getSnoozedPendingReplies ──────────────────────────────────────────

    async getSnoozedPendingReplies(
        conversationId: string,
        currentUserId: string,
    ): Promise<SnoozedItem[]> {
        // Client-side: read AsyncStorage
        const raw = await AsyncStorage.getItem(SNOOZE_STORAGE_KEY);
        if (!raw) return [];

        const all = JSON.parse(raw) as Array<{
            id: string;
            messageId: string;
            text: string;
            conversationId: string;
            snoozedAt: string;
            reminderAt: string;
            dismissed: boolean;
        }>;

        const forRoom = all.filter(
            item => item.conversationId === conversationId && !item.dismissed,
        );

        const results: SnoozedItem[] = [];

        for (const item of forRoom) {
            // Check if user replied after the reminder time
            const { count } = await supabase
                .from('Message')
                .select('id', { count: 'exact', head: true })
                .eq('conversationId', conversationId)
                .eq('senderId', currentUserId)
                .gt('createdAt', item.reminderAt);

            results.push({
                id: item.id,
                text: item.text,
                snoozedAt: item.snoozedAt,
                reminderAt: item.reminderAt,
                isPending: (count ?? 0) === 0,
            });
        }

        return results;
    }

    // ── 6. getHardNoViolations ────────────────────────────────────────────────

    async getHardNoViolations(
        conversationId: string,
        partnerUserId: string,
        _currentUserId: string,
    ): Promise<HardNoViolation[]> {
        if (!(await this.verifyConversationAccess(conversationId))) return [];

        // Step 1: fetch partner's hard nos
        const { data: profile } = await supabase
            .from('Profile')
            .select('hardNos')
            .eq('userId', partnerUserId)
            .single();

        const hardNos: string[] = profile?.hardNos ?? [];
        if (hardNos.length === 0) return [];

        // Step 2: read snoozed messages from AsyncStorage (already decrypted on-device)
        const raw = await AsyncStorage.getItem(SNOOZE_STORAGE_KEY);
        const snoozed = raw ? JSON.parse(raw) as Array<{ text: string; conversationId: string }> : [];
        const roomSnoozed = snoozed.filter(s => s.conversationId === conversationId);

        // Step 3: match keywords against available decrypted text
        // SECURITY: only check against already-decrypted text in AsyncStorage
        const violations: HardNoViolation[] = hardNos.map(keyword => {
            let count = 0;
            for (const s of roomSnoozed) {
                if (s.text.toLowerCase().includes(keyword.toLowerCase())) {
                    count++;
                }
            }
            return { keyword, violationCount: count };
        });

        return violations;
    }

    // ── 7. getGreenFlagsMatched ───────────────────────────────────────────────

    async getGreenFlagsMatched(
        conversationId: string,
        partnerUserId: string,
        currentUserId: string,
    ): Promise<GreenFlagMatch[]> {
        if (!(await this.verifyConversationAccess(conversationId))) return [];

        const [partnerResult, myResult] = await Promise.all([
            supabase.from('Profile')
                .select('greenFlags')
                .eq('userId', partnerUserId)
                .single(),
            supabase.from('Profile')
                .select('communicationPassport')
                .eq('userId', currentUserId)
                .single(),
        ]);

        const greenFlags: string[] = partnerResult.data?.greenFlags ?? [];
        if (greenFlags.length === 0) return [];

        const passport = myResult.data?.communicationPassport;
        const passportStr = passport ? JSON.stringify(passport).toLowerCase() : '';

        return greenFlags.map(flag => ({
            flag,
            matched: passportStr.includes(flag.toLowerCase()),
        }));
    }

    // ── 8. getSharedSlashPulse ────────────────────────────────────────────────

    async getSharedSlashPulse(
        conversationId: string,
        currentUserId: string,
        partnerUserId: string,
    ): Promise<SlashPulseItem[]> {
        if (!(await this.verifyConversationAccess(conversationId))) return [];

        const { data } = await supabase
            .from('user_tag_affinity')
            .select('userId, tag, score')
            .in('userId', [currentUserId, partnerUserId])
            .gt('score', 0)
            .order('score', { ascending: false })
            .limit(40);

        if (!data || data.length === 0) return [];

        const myTags = new Map<string, number>();
        const theirTags = new Map<string, number>();

        for (const row of data) {
            if (row.userId === currentUserId) {
                myTags.set(row.tag, row.score);
            } else {
                theirTags.set(row.tag, row.score);
            }
        }

        const allTags = new Set([...myTags.keys(), ...theirTags.keys()]);
        const items: SlashPulseItem[] = [];

        for (const tag of allTags) {
            const myScore = myTags.get(tag) ?? 0;
            const theirScore = theirTags.get(tag) ?? 0;
            const category: 'both' | 'only_me' | 'only_them' =
                myScore > 0 && theirScore > 0 ? 'both' :
                myScore > 0 ? 'only_me' : 'only_them';

            items.push({ tag, myScore, theirScore, category });
        }

        // Sort: "both" first, then by combined score
        items.sort((a, b) => {
            if (a.category === 'both' && b.category !== 'both') return -1;
            if (a.category !== 'both' && b.category === 'both') return 1;
            return (b.myScore + b.theirScore) - (a.myScore + a.theirScore);
        });

        return items.slice(0, 8);
    }

    // ── 9. getBondMoments ────────────────────────────────────────────────────

    async getBondMoments(
        conversationId: string,
        currentUserId: string,
    ): Promise<BondMomentData> {
        if (!(await this.verifyConversationAccess(conversationId))) {
            return { firstMessage: null, pinned: [] };
        }

        const [momentsResult, firstMsgResult] = await Promise.all([
            supabase.from('BondMoment')
                .select('id, preview_text, pinned_at, message_id, slash_context_id')
                .eq('conversation_id', conversationId)
                .eq('pinned_by_user_id', currentUserId)
                .order('pinned_at', { ascending: true })
                .limit(5),
            supabase.from('Message')
                .select('id, createdAt')
                .eq('conversationId', conversationId)
                .order('createdAt', { ascending: true })
                .limit(1),
        ]);

        let firstMessage: { text: string; createdAt: string } | null = null;
        if (firstMsgResult.data && firstMsgResult.data.length > 0) {
            // We cannot decrypt here — return placeholder.
            // The UI should attempt decryption if keys are available.
            firstMessage = {
                text: 'First message in this chat',
                createdAt: firstMsgResult.data[0].createdAt,
            };
        }

        return {
            firstMessage,
            pinned: (momentsResult.data ?? []) as BondMomentRow[],
        };
    }

    // ── 10. addBondMoment ─────────────────────────────────────────────────────

    async addBondMoment(
        conversationId: string,
        messageId: string,
        previewText: string,
        slashContextId?: string | null,
    ): Promise<void> {
        const userId = await this.getDbUserId();
        if (!(await this.verifyConversationAccess(conversationId))) {
            throw new Error('No access to conversation');
        }

        await supabase.from('BondMoment').insert({
            conversation_id: conversationId,
            message_id: messageId,
            pinned_by_user_id: userId,
            preview_text: previewText.slice(0, 80),
            slash_context_id: slashContextId ?? null,
        });
    }

    // ── 11. deleteBondMoment ──────────────────────────────────────────────────

    async deleteBondMoment(momentId: string): Promise<void> {
        const userId = await this.getDbUserId();
        // RLS enforces ownership; add client-side check
        await supabase.from('BondMoment')
            .delete()
            .eq('id', momentId)
            .eq('pinned_by_user_id', userId);
    }

    // ── 12. getPartnerCommunicationPassport ───────────────────────────────────

    async getPartnerCommunicationPassport(partnerUserId: string): Promise<PartnerPassport> {
        // Check cache first
        const cached = this.passportCache.get(partnerUserId);
        if (cached) return cached;

        const { data } = await supabase
            .from('Profile')
            .select('displayName, hardNos, greenFlags, communicationPassport')
            .eq('userId', partnerUserId)
            .single();

        const passport: PartnerPassport = {
            displayName: data?.displayName ?? 'Unknown',
            hardNos: data?.hardNos ?? [],
            greenFlags: data?.greenFlags ?? [],
            communicationPassport: data?.communicationPassport
                ? (typeof data.communicationPassport === 'string'
                    ? JSON.parse(data.communicationPassport)
                    : data.communicationPassport)
                : null,
        };

        this.passportCache.set(partnerUserId, passport);
        return passport;
    }

    // ── 13. logCanvasSession ──────────────────────────────────────────────────

    async logCanvasSession(conversationId: string): Promise<void> {
        const userId = await this.getDbUserId();
        await supabase.from('CanvasSession').insert({
            conversation_id: conversationId,
            initiated_by: userId,
        });
    }
}

export const BondingService = new BondingServiceImpl();
