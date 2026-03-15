/**
 * -- MIGRATION SQL -- Run in Supabase SQL Editor --
 *
 * -- 1A: Remove emotion tag types
 * DELETE FROM "MessageTag" WHERE "tagType" IN ('HAPPY', 'SAD', 'ANGRY', 'EXCITED', 'LOVE');
 *
 * -- 1B: Add columns to Message table (if not already present)
 * ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS silent_send BOOLEAN DEFAULT FALSE;
 * ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'default';
 * ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS stack_id UUID DEFAULT NULL;
 * CREATE INDEX IF NOT EXISTS idx_message_tone ON "Message"(tone) WHERE tone != 'default';
 * CREATE INDEX IF NOT EXISTS idx_message_silent ON "Message"(silent_send) WHERE silent_send = TRUE;
 * CREATE INDEX IF NOT EXISTS idx_message_stack ON "Message"(stack_id) WHERE stack_id IS NOT NULL;
 *
 * -- 1C: Profile additions
 * ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "greenFlags" TEXT[] DEFAULT '{}';
 * ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "communicationPassport" JSONB;
 *
 * -- 1D: BondMoment table
 * CREATE TABLE IF NOT EXISTS "BondMoment" (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   conversation_id UUID NOT NULL REFERENCES "Conversation"(id) ON DELETE CASCADE,
 *   message_id UUID REFERENCES "Message"(id) ON DELETE SET NULL,
 *   pinned_by_user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
 *   preview_text TEXT NOT NULL,
 *   slash_context_id UUID DEFAULT NULL,
 *   pinned_at TIMESTAMPTZ DEFAULT NOW(),
 *   UNIQUE(conversation_id, message_id, pinned_by_user_id)
 * );
 * CREATE INDEX idx_bond_moment_conversation ON "BondMoment"(conversation_id, pinned_by_user_id);
 * ALTER TABLE "BondMoment" ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY bond_moment_owner ON "BondMoment"
 *   USING (pinned_by_user_id = auth.uid()::text)
 *   WITH CHECK (pinned_by_user_id = auth.uid()::text);
 *
 * -- 1E: CanvasSession table
 * CREATE TABLE IF NOT EXISTS "CanvasSession" (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   conversation_id UUID NOT NULL REFERENCES "Conversation"(id) ON DELETE CASCADE,
 *   started_at TIMESTAMPTZ DEFAULT NOW(),
 *   initiated_by UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE
 * );
 * CREATE INDEX idx_canvas_session_conv ON "CanvasSession"(conversation_id, started_at DESC);
 * ALTER TABLE "CanvasSession" ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY canvas_session_participant ON "CanvasSession"
 *   USING (
 *     initiated_by = auth.uid()::text OR
 *     EXISTS (
 *       SELECT 1 FROM "Conversation" c
 *       WHERE c.id = conversation_id
 *       AND (c."participantA" = auth.uid()::text OR c."participantB" = auth.uid()::text)
 *     )
 *   );
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Image,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, BookOpen, Plus, X, Edit3, ChevronRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

import {
    BondingService,
    ChatStats,
    ChatBehaviourStats,
    HardNoViolation,
    GreenFlagMatch,
    SlashPulseItem,
    BondMomentData,
    SnoozedItem,
    PartnerPassport,
    StickyNoteData,
} from '../services/BondingService';

import BondScoreSection from '../components/bonding/BondScoreSection';
import ChatBehaviourSection from '../components/bonding/ChatBehaviourSection';
import SharedSlashPulse from '../components/bonding/SharedSlashPulse';
import BondMomentsSection from '../components/bonding/BondMomentsSection';
import ToneUsageChart from '../components/bonding/ToneUsageChart';
import CommunicationPassportSheet from '../components/bonding/CommunicationPassportSheet';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile {
    id: string;
    name: string;
    avatar: string;
    conversationId?: string;
}

interface FactWarning {
    id: string;
    keyword: string;
    warningText: string;
    isActive: boolean;
    triggeredCount?: number;
    createdAt: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BondingScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        conversationId?: string;
        partnerUserId?: string;
        partnerUsername?: string;
        userId?: string;
        userName?: string;
        userAvatar?: string;
    }>();
    const { session } = useAuth();

    // ── Core state ───────────────────────────────────────────────────────────
    const [dbUserId, setDbUserId] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(params.conversationId ?? null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // ── Bonding data state ───────────────────────────────────────────────────
    const [bondScore, setBondScore] = useState<number>(0);
    const [chatStats, setChatStats] = useState<ChatStats | null>(null);
    const [behaviourStats, setBehaviourStats] = useState<ChatBehaviourStats | null>(null);
    const [hardNoViolations, setHardNoViolations] = useState<HardNoViolation[]>([]);
    const [greenFlagsMatched, setGreenFlagsMatched] = useState<GreenFlagMatch[]>([]);
    const [sharedSlashPulse, setSharedSlashPulse] = useState<SlashPulseItem[]>([]);
    const [bondMoments, setBondMoments] = useState<BondMomentData | null>(null);
    const [snoozedPending, setSnoozedPending] = useState<SnoozedItem[]>([]);
    const [partnerPassport, setPartnerPassport] = useState<PartnerPassport | null>(null);
    const [activeStickyNote, setActiveStickyNote] = useState<StickyNoteData | null>(null);

    // ── Locker state ─────────────────────────────────────────────────────────
    const [activeLocker, setActiveLocker] = useState<'custom' | 'triggers'>('custom');
    const [facts, setFacts] = useState<FactWarning[]>([]);
    const [triggers, setTriggers] = useState<any[]>([]);
    const [tags, setTags] = useState<any[]>([]);

    // ── Modals ───────────────────────────────────────────────────────────────
    const [showAddFact, setShowAddFact] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPassportSheet, setShowPassportSheet] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [editType, setEditType] = useState<'tag' | 'trigger' | 'fact'>('tag');
    const [newKeyword, setNewKeyword] = useState('');
    const [newWarningText, setNewWarningText] = useState('');

    // ── Canvas state ─────────────────────────────────────────────────────────
    const [myCanvasOn, setMyCanvasOn] = useState(false);
    const [partnerCanvasOn, setPartnerCanvasOn] = useState(false);

    // ── Resolve DB user ──────────────────────────────────────────────────────
    useEffect(() => {
        const resolve = async () => {
            if (session?.user?.email) {
                const { data } = await supabase
                    .from('User').select('id').eq('email', session.user.email).single();
                if (data) setDbUserId(data.id);
            }
        };
        resolve();
    }, [session?.user?.email]);

    // ── Fetch profiles ───────────────────────────────────────────────────────
    const fetchProfiles = useCallback(async () => {
        if (!dbUserId) return;
        const { data: conversations } = await supabase
            .from('Conversation')
            .select(`
                id, lastMessageAt, participantA, participantB,
                userA:participantA(id, name, profile:Profile(displayName, avatarUrl)),
                userB:participantB(id, name, profile:Profile(displayName, avatarUrl))
            `)
            .or(`participantA.eq.${dbUserId},participantB.eq.${dbUserId}`)
            .order('lastMessageAt', { ascending: false });

        if (conversations) {
            const list: Profile[] = conversations.map((conv: any) => {
                const isA = conv.participantA === dbUserId;
                const partner = isA ? conv.userB : conv.userA;
                const p = Array.isArray(partner.profile) ? partner.profile[0] : partner.profile;
                return {
                    id: partner.id,
                    name: p?.displayName || partner.name || 'Unknown',
                    avatar: p?.avatarUrl || '',
                    conversationId: conv.id,
                };
            });
            setProfiles(list);

            // Auto-select from params or first
            if (params.partnerUserId) {
                const match = list.find(p => p.id === params.partnerUserId);
                if (match) {
                    setSelectedProfile(match);
                    setConversationId(match.conversationId ?? params.conversationId ?? null);
                }
            } else if (params.userId) {
                const match = list.find(p => p.id === params.userId);
                if (match) {
                    setSelectedProfile(match);
                    setConversationId(match.conversationId ?? null);
                }
            } else if (!selectedProfile && list.length > 0) {
                setSelectedProfile(list[0]);
                setConversationId(list[0].conversationId ?? null);
            }
        }
    }, [dbUserId]);

    // ── Load bonding data ────────────────────────────────────────────────────
    const loadBondingData = useCallback(async () => {
        if (!conversationId || !selectedProfile || !dbUserId) return;

        setIsLoading(true);
        try {
            const hasAccess = await BondingService.verifyConversationAccess(conversationId);
            if (!hasAccess) { router.back(); return; }

            const [
                score, stats, behaviour, hardNos, greenFlags,
                slashPulse, moments, snoozed, passport, sticky,
            ] = await Promise.all([
                BondingService.getBondScore(conversationId),
                BondingService.getChatStats(conversationId),
                BondingService.getChatBehaviourStats(conversationId),
                BondingService.getHardNoViolations(conversationId, selectedProfile.id, dbUserId),
                BondingService.getGreenFlagsMatched(conversationId, selectedProfile.id, dbUserId),
                BondingService.getSharedSlashPulse(conversationId, dbUserId, selectedProfile.id),
                BondingService.getBondMoments(conversationId, dbUserId),
                BondingService.getSnoozedPendingReplies(conversationId, dbUserId),
                BondingService.getPartnerCommunicationPassport(selectedProfile.id),
                BondingService.getActiveStickyNote(conversationId),
            ]);

            setBondScore(score);
            setChatStats(stats);
            setBehaviourStats(behaviour);
            setHardNoViolations(hardNos);
            setGreenFlagsMatched(greenFlags.filter(g => g.matched));
            setSharedSlashPulse(slashPulse);
            setBondMoments(moments);
            setSnoozedPending(snoozed);
            setPartnerPassport(passport);
            setActiveStickyNote(sticky);
        } catch (e) {
            console.error('[BondingPage] Load error:', e);
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, selectedProfile?.id, dbUserId]);

    // ── Fetch locker data (tags, facts, triggers) ────────────────────────────
    const fetchLockerData = useCallback(async () => {
        if (!selectedProfile || !dbUserId || !conversationId) return;

        try {
            const [tagRes, factRes, trigRes] = await Promise.all([
                supabase.from('MessageTag')
                    .select('id, messageId, tagType, createdAt, message:Message(id, content, createdAt)')
                    .eq('userId', dbUserId)
                    .not('tagType', 'in', '(HAPPY,SAD,ANGRY,EXCITED,LOVE,BLACKLIST,RED,JOY,FUNNY,GREEN)')
                    .order('createdAt', { ascending: false }),
                supabase.from('FactWarning')
                    .select('*')
                    .eq('userId', dbUserId)
                    .eq('profileId', selectedProfile.id)
                    .order('createdAt', { ascending: false }),
                supabase.from('Trigger')
                    .select('id, selectedText, targetUser, conditionType, warningMessage, isActive, createdAt, triggeredCount')
                    .order('createdAt', { ascending: false }),
            ]);

            setTags((tagRes.data ?? []).map((t: any) => ({
                ...t,
                message: Array.isArray(t.message) ? t.message[0] : t.message,
            })).filter((t: any) => t.message));
            setFacts(factRes.data ?? []);
            setTriggers(trigRes.data ?? []);
        } catch (e) {
            console.log('[BondingPage] Locker fetch error:', e);
        }
    }, [selectedProfile?.id, dbUserId, conversationId]);

    // ── Read canvas state ────────────────────────────────────────────────────
    useEffect(() => {
        if (!conversationId) return;
        AsyncStorage.getItem(`app:live_canvas:enabled_${conversationId}`).then(val => {
            setMyCanvasOn(val === 'true');
        });
    }, [conversationId]);

    // ── Effects ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (dbUserId) fetchProfiles().finally(() => setIsLoading(false));
    }, [dbUserId]);

    useEffect(() => {
        if (conversationId && selectedProfile && dbUserId) {
            loadBondingData();
            fetchLockerData();
        }
    }, [conversationId, selectedProfile?.id, dbUserId, activeLocker]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([loadBondingData(), fetchLockerData()]);
        setIsRefreshing(false);
    };

    const handleProfileSwitch = (profile: Profile) => {
        setSelectedProfile(profile);
        setConversationId(profile.conversationId ?? null);
        setShowProfileDropdown(false);
    };

    const handleDeleteMoment = async (momentId: string) => {
        setBondMoments(prev => prev ? {
            ...prev,
            pinned: prev.pinned.filter(m => m.id !== momentId),
        } : null);
        try {
            await BondingService.deleteBondMoment(momentId);
        } catch { /* rollback not needed for optimistic */ }
    };

    const handlePinMoment = () => {
        if (!conversationId) return;
        router.push({
            pathname: '/(tabs)/chat',
            params: { roomId: conversationId, mode: 'pin_moment' },
        });
    };

    const handleEdit = (item: any, type: 'tag' | 'trigger' | 'fact') => {
        setEditItem(item);
        setEditType(type);
        if (type === 'fact') {
            setNewKeyword(item.keyword);
            setNewWarningText(item.warningText);
        }
        setShowEditModal(true);
    };

    const handleDelete = async (id: string, type: 'tag' | 'trigger' | 'fact') => {
        Alert.alert('Delete', 'Remove this item?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    const table = type === 'tag' ? 'MessageTag' : type === 'trigger' ? 'Trigger' : 'FactWarning';
                    await supabase.from(table).delete().eq('id', id);
                    if (type === 'tag') setTags(p => p.filter(t => t.id !== id));
                    else if (type === 'trigger') setTriggers(p => p.filter(t => t.id !== id));
                    else setFacts(p => p.filter(f => f.id !== id));
                },
            },
        ]);
    };

    const saveEdit = async () => {
        if (!editItem) return;
        if (editType === 'fact') {
            await supabase.from('FactWarning')
                .update({ keyword: newKeyword, warningText: newWarningText })
                .eq('id', editItem.id);
            setFacts(p => p.map(f =>
                f.id === editItem.id ? { ...f, keyword: newKeyword, warningText: newWarningText } : f
            ));
        }
        setShowEditModal(false);
        setEditItem(null);
    };

    const addFactWarning = async () => {
        if (!newKeyword.trim() || !newWarningText.trim() || !selectedProfile || !dbUserId) return;
        const id = `cm${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;
        const { data } = await supabase.from('FactWarning').insert({
            id, userId: dbUserId, profileId: selectedProfile.id,
            keyword: newKeyword.toLowerCase().trim(),
            warningText: newWarningText.trim(),
        }).select().single();
        if (data) setFacts(p => [data, ...p]);
        setNewKeyword(''); setNewWarningText(''); setShowAddFact(false);
    };

    // ─── Derived values ──────────────────────────────────────────────────────
    const hardNoCount = hardNoViolations.filter(v => v.violationCount > 0).length;
    const partnerName = selectedProfile?.name ?? params.partnerUsername ?? 'Partner';
    const partnerId = selectedProfile?.id ?? params.partnerUserId ?? '';

    // ─── RENDER ──────────────────────────────────────────────────────────────

    if (isLoading && !selectedProfile) {
        return (
            <View style={[st.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#eee" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={st.container}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={st.header}>
                    <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
                        <ChevronLeft color="#eee" size={22} />
                    </TouchableOpacity>
                    <Text style={st.headerTitle}>Bonding</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingVertical: 12, paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#eee" />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Selector */}
                    <TouchableOpacity
                        onPress={() => setShowProfileDropdown(true)}
                        style={st.profileSelector}
                    >
                        {selectedProfile ? (
                            <View style={st.profileSelectorRow}>
                                <Image source={{ uri: selectedProfile.avatar }} style={st.profileAvatar} />
                                <Text style={st.profileName}>{selectedProfile.name}</Text>
                            </View>
                        ) : (
                            <Text style={{ color: '#555', fontSize: 10 }}>select a profile</Text>
                        )}
                        <ChevronDown color="#555" size={16} />
                    </TouchableOpacity>

                    {selectedProfile && conversationId && (
                        <>
                            {/* 1. Bond Score */}
                            <BondScoreSection
                                score={bondScore}
                                partnerName={partnerName}
                                passport={partnerPassport}
                                hardNoCount={hardNoCount}
                                isLoading={isLoading}
                            />

                            {/* 2. Stats Grid */}
                            <StatsGrid stats={chatStats} myId={dbUserId ?? ''} />

                            {/* 3. Hard No Banner */}
                            <HardNoBanner
                                violations={hardNoViolations}
                                partnerName={partnerName}
                            />

                            {/* 4. Shared Slash Pulse */}
                            <SharedSlashPulse items={sharedSlashPulse} />

                            {/* 5. Bond Moments */}
                            <BondMomentsSection
                                data={bondMoments}
                                onPinMoment={handlePinMoment}
                                onDeleteMoment={handleDeleteMoment}
                            />

                            {/* 6. Chat Behaviour */}
                            <ChatBehaviourSection
                                stats={behaviourStats}
                                snoozedPending={snoozedPending}
                                partnerName={partnerName}
                                onSnoozedTap={() => setActiveLocker('triggers')}
                            />

                            {/* 7. Tone Usage */}
                            <ToneUsageChart toneCounts={behaviourStats?.toneCounts ?? {}} />

                            {/* 8. Tag Activity (inline) */}
                            <TagActivitySection tags={tags} myId={dbUserId ?? ''} />

                            {/* 9. Live Canvas Status */}
                            <LiveCanvasStatus
                                myOn={myCanvasOn}
                                partnerOn={partnerCanvasOn}
                                partnerName={partnerName}
                                sessionCount={behaviourStats?.canvasSessionCount ?? 0}
                            />

                            {/* 10. Profile Card Links */}
                            <ProfileCardLinks
                                partnerId={partnerId}
                                partnerName={partnerName}
                                onPassportTap={() => setShowPassportSheet(true)}
                            />

                            {/* 11. Locker */}
                            <View style={st.lockerSection}>
                                {/* Tabs */}
                                <View style={st.lockerTabs}>
                                    {(['custom', 'triggers'] as const).map(tab => (
                                        <TouchableOpacity
                                            key={tab}
                                            onPress={() => setActiveLocker(tab)}
                                            style={[
                                                st.lockerTab,
                                                activeLocker === tab && st.lockerTabActive,
                                            ]}
                                        >
                                            <Text style={[
                                                st.lockerTabText,
                                                activeLocker === tab && st.lockerTabTextActive,
                                            ]}>
                                                {tab === 'custom' ? 'Custom Tags & Facts' : 'Triggers'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={st.swipeHint}>swipe left to edit or delete</Text>

                                {activeLocker === 'custom' ? (
                                    <>
                                        {/* Facts */}
                                        {facts.map(fact => (
                                            <SwipableLockerCard
                                                key={fact.id}
                                                label={fact.warningText}
                                                subLabel={`keyword: "${fact.keyword}"`}
                                                date={fact.createdAt}
                                                badge="FACT"
                                                onEdit={() => handleEdit(fact, 'fact')}
                                                onDelete={() => handleDelete(fact.id, 'fact')}
                                            />
                                        ))}
                                        {/* Tags */}
                                        {tags.map((tag: any) => (
                                            <SwipableLockerCard
                                                key={tag.id}
                                                label={tag.message?.content ?? 'Tagged message'}
                                                subLabel={tag.tagType}
                                                date={tag.createdAt}
                                                badge={tag.tagType}
                                                onEdit={() => handleEdit(tag, 'tag')}
                                                onDelete={() => handleDelete(tag.id, 'tag')}
                                            />
                                        ))}

                                        {/* Read-only: Hard Nos from their card */}
                                        {hardNoViolations.length > 0 && (
                                            <>
                                                <Text style={st.subSectionTitle}>from their profile card</Text>
                                                {hardNoViolations.map((v, i) => (
                                                    <View key={i} style={[st.readOnlyCard, v.violationCount > 0 && st.readOnlyCardRed]}>
                                                        <View style={[st.readOnlyIcon, v.violationCount > 0 && st.readOnlyIconRed]}>
                                                            <Text style={[st.readOnlyIconText, v.violationCount > 0 && { color: '#c8383a' }]}>!</Text>
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[st.readOnlyLabel, v.violationCount > 0 && { color: '#c8383a' }]}>
                                                                {v.keyword}
                                                            </Text>
                                                            <Text style={[st.readOnlySub, v.violationCount > 0 && { color: '#4a2020' }]}>
                                                                {v.violationCount > 0
                                                                    ? `${v.violationCount} violations this week`
                                                                    : '0 violations'}
                                                            </Text>
                                                        </View>
                                                        {v.violationCount > 0 && (
                                                            <View style={st.readOnlyBadge}>
                                                                <Text style={st.readOnlyBadgeText}>{v.violationCount}</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                ))}
                                            </>
                                        )}

                                        {/* Read-only: Green Flags matched */}
                                        {greenFlagsMatched.length > 0 && (
                                            <>
                                                <Text style={st.subSectionTitle}>green flags you match</Text>
                                                {greenFlagsMatched.map((g, i) => (
                                                    <View key={i} style={st.readOnlyCard}>
                                                        <View style={st.readOnlyIcon}>
                                                            <Text style={st.readOnlyIconText}>G</Text>
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={st.readOnlyLabel}>{g.flag}</Text>
                                                            <Text style={st.readOnlySub}>they listed this — you match</Text>
                                                        </View>
                                                    </View>
                                                ))}
                                            </>
                                        )}

                                        {facts.length === 0 && tags.length === 0 && hardNoViolations.length === 0 && (
                                            <View style={st.emptyState}>
                                                <BookOpen size={28} color="#2e2e2e" />
                                                <Text style={st.emptyText}>no custom tags or facts</Text>
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {/* Triggers */}
                                        {triggers.map((trigger: any) => (
                                            <SwipableLockerCard
                                                key={trigger.id}
                                                label={trigger.selectedText || trigger.warningMessage || 'Trigger'}
                                                subLabel={`triggered ${trigger.triggeredCount ?? 0}x`}
                                                date={trigger.createdAt}
                                                badge="TRIGGER"
                                                onEdit={() => handleEdit(trigger, 'trigger')}
                                                onDelete={() => handleDelete(trigger.id, 'trigger')}
                                            />
                                        ))}

                                        {/* Snoozed messages sub-section */}
                                        {snoozedPending.length > 0 && (
                                            <>
                                                <Text style={st.subSectionTitle}>snoozed — waiting for your reply</Text>
                                                {snoozedPending.map((item, i) => {
                                                    const daysSince = Math.floor(
                                                        (Date.now() - new Date(item.snoozedAt).getTime()) / 86400000
                                                    );
                                                    return (
                                                        <View key={item.id} style={[
                                                            st.readOnlyCard,
                                                            item.isPending && st.readOnlyCardRed,
                                                        ]}>
                                                            <View style={[
                                                                st.readOnlyIcon,
                                                                item.isPending && st.readOnlyIconRed,
                                                            ]}>
                                                                <Text style={[
                                                                    st.readOnlyIconText,
                                                                    item.isPending && { color: '#c8383a' },
                                                                ]}>z</Text>
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text
                                                                    style={[st.readOnlyLabel, item.isPending && { color: '#c8383a' }]}
                                                                    numberOfLines={1}
                                                                >
                                                                    {item.text.slice(0, 50)}
                                                                </Text>
                                                                <Text style={st.readOnlySub}>
                                                                    snoozed {daysSince}d ago  {item.isPending ? 'no reply yet' : 'replied'}
                                                                </Text>
                                                            </View>
                                                            {item.isPending && daysSince > 3 && (
                                                                <View style={st.readOnlyBadge}>
                                                                    <Text style={st.readOnlyBadgeText}>{daysSince}d</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    );
                                                })}
                                            </>
                                        )}

                                        {/* Pattern insight */}
                                        {(() => {
                                            const topTrigger = triggers.find((t: any) => (t.triggeredCount ?? 0) >= 5);
                                            if (!topTrigger) return null;
                                            return (
                                                <Text style={st.patternInsight}>
                                                    "{topTrigger.selectedText || topTrigger.warningMessage}" appears {topTrigger.triggeredCount}x
                                                </Text>
                                            );
                                        })()}

                                        {triggers.length === 0 && snoozedPending.length === 0 && (
                                            <View style={st.emptyState}>
                                                <Text style={st.emptyText}>no triggers yet</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        </>
                    )}
                </ScrollView>

                {/* FAB for adding facts */}
                {activeLocker === 'custom' && selectedProfile && (
                    <TouchableOpacity onPress={() => setShowAddFact(true)} style={st.fab}>
                        <Plus size={20} color="#fff" />
                    </TouchableOpacity>
                )}

                {/* ── Modals ────────────────────────────────────────────── */}

                {/* Profile Dropdown */}
                <Modal visible={showProfileDropdown} transparent animationType="fade">
                    <TouchableOpacity
                        style={st.modalOverlay} activeOpacity={1}
                        onPress={() => setShowProfileDropdown(false)}
                    >
                        <View style={st.dropdownContainer}>
                            <BlurView intensity={80} tint="dark" style={st.dropdownBlur}>
                                <ScrollView style={{ maxHeight: 400 }}>
                                    {profiles.map(profile => (
                                        <TouchableOpacity
                                            key={profile.id}
                                            onPress={() => handleProfileSwitch(profile)}
                                            style={st.dropdownItem}
                                        >
                                            <Image source={{ uri: profile.avatar }} style={st.dropdownAvatar} />
                                            <Text style={st.dropdownName}>{profile.name}</Text>
                                            {selectedProfile?.id === profile.id && <View style={st.selectedDot} />}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </BlurView>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Add Fact Modal */}
                <Modal visible={showAddFact} transparent animationType="slide">
                    <View style={st.bottomModalOverlay}>
                        <View style={st.bottomModal}>
                            <View style={st.modalHeader}>
                                <Text style={st.modalTitle}>add fact warning</Text>
                                <TouchableOpacity onPress={() => setShowAddFact(false)}>
                                    <X size={20} color="#555" />
                                </TouchableOpacity>
                            </View>
                            <Text style={st.inputLabel}>keyword</Text>
                            <TextInput value={newKeyword} onChangeText={setNewKeyword}
                                placeholder="e.g., birthday" placeholderTextColor="#2e2e2e" style={st.input} />
                            <Text style={st.inputLabel}>warning message</Text>
                            <TextInput value={newWarningText} onChangeText={setNewWarningText}
                                placeholder="e.g., Remember!" placeholderTextColor="#2e2e2e"
                                style={[st.input, { height: 70, textAlignVertical: 'top' }]} multiline />
                            <TouchableOpacity style={st.saveBtn} onPress={addFactWarning}>
                                <Text style={st.saveBtnText}>add warning</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Edit Modal */}
                <Modal visible={showEditModal} transparent animationType="slide">
                    <View style={st.bottomModalOverlay}>
                        <View style={st.bottomModal}>
                            <View style={st.modalHeader}>
                                <Text style={st.modalTitle}>edit {editType}</Text>
                                <TouchableOpacity onPress={() => { setShowEditModal(false); setEditItem(null); }}>
                                    <X size={20} color="#555" />
                                </TouchableOpacity>
                            </View>
                            {editType === 'fact' && (
                                <>
                                    <Text style={st.inputLabel}>keyword</Text>
                                    <TextInput value={newKeyword} onChangeText={setNewKeyword} style={st.input} />
                                    <Text style={st.inputLabel}>warning message</Text>
                                    <TextInput value={newWarningText} onChangeText={setNewWarningText}
                                        style={[st.input, { height: 70, textAlignVertical: 'top' }]} multiline />
                                </>
                            )}
                            <TouchableOpacity style={st.saveBtn} onPress={saveEdit}>
                                <Text style={st.saveBtnText}>save changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Communication Passport Sheet */}
                <CommunicationPassportSheet
                    visible={showPassportSheet}
                    onClose={() => setShowPassportSheet(false)}
                    passport={partnerPassport?.communicationPassport ?? null}
                    partnerName={partnerName}
                />
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

// ─── Inline Section Components ───────────────────────────────────────────────

const StatsGrid = React.memo(({ stats, myId }: { stats: ChatStats | null; myId: string }) => {
    if (!stats) return null;
    const total = stats.myCount + stats.theirCount || 1;
    const myPct = Math.round((stats.myCount / total) * 100);
    const theirPct = 100 - myPct;

    return (
        <View style={st.statsGrid}>
            <View style={st.statTile}>
                <Text style={st.statValue}>{stats.totalMessages}</Text>
                <Text style={st.statLabel}>TOTAL MESSAGES</Text>
            </View>
            <View style={st.statTile}>
                <Text style={st.statValue}>{stats.thisWeek}</Text>
                <Text style={st.statLabel}>THIS WEEK</Text>
            </View>
            <View style={st.statTile}>
                <Text style={[st.statValue, { fontSize: 10 }]}>{myPct} / {theirPct}</Text>
                <View style={st.ratioBar}>
                    <View style={[st.ratioFill, { width: `${myPct}%` }]} />
                </View>
                <Text style={st.statLabel}>RATIO</Text>
            </View>
            <View style={st.statTile}>
                <Text style={st.statValue}>{stats.replyStreak}d</Text>
                <Text style={st.statLabel}>REPLY STREAK</Text>
            </View>
        </View>
    );
});

const HardNoBanner = React.memo(({ violations, partnerName }: { violations: HardNoViolation[]; partnerName: string }) => {
    const violated = violations.filter(v => v.violationCount > 0);
    if (violated.length === 0) return null;
    const top = violated.sort((a, b) => b.violationCount - a.violationCount)[0];
    const moreCount = violated.length - 1;

    return (
        <View style={st.hardNoBanner}>
            <Text style={st.hardNoTitle}>hard no conflict</Text>
            <Text style={st.hardNoBody}>
                @{partnerName} listed '{top.keyword}' — you did this {top.violationCount} times this week
            </Text>
            {moreCount > 0 && (
                <Text style={st.hardNoMore}>and {moreCount} more</Text>
            )}
        </View>
    );
});

const TagActivitySection = React.memo(({ tags, myId }: { tags: any[]; myId: string }) => {
    if (tags.length === 0) return null;
    return (
        <View style={st.tagActivityContainer}>
            <Text style={st.sectionTitleSmall}>tag activity</Text>
            <View style={st.tagActivityRow}>
                <View style={st.tagActivityLegend}>
                    <View style={st.legendItem}>
                        <View style={[st.legendDot, { backgroundColor: '#eee' }]} />
                        <Text style={st.legendText}>you</Text>
                    </View>
                    <View style={st.legendItem}>
                        <View style={[st.legendDot, { backgroundColor: '#2a2a2a' }]} />
                        <Text style={st.legendText}>them</Text>
                    </View>
                </View>
                <Text style={st.tagActivityCount}>{tags.length} tags</Text>
            </View>
        </View>
    );
});

const LiveCanvasStatus = React.memo(({
    myOn, partnerOn, partnerName, sessionCount,
}: {
    myOn: boolean; partnerOn: boolean; partnerName: string; sessionCount: number;
}) => {
    const statusText = myOn && partnerOn
        ? 'both on -- active'
        : myOn ? 'only you'
        : partnerOn ? 'only them'
        : 'both off';
    const statusColor = myOn && partnerOn ? '#c8383a' : '#2e2e2e';

    return (
        <View style={st.canvasContainer}>
            <Text style={st.sectionTitleSmall}>live canvas</Text>
            <View style={st.canvasRow}>
                <Text style={st.canvasLabel}>status with @{partnerName}</Text>
                <Text style={[st.canvasValue, { color: statusColor }]}>{statusText}</Text>
            </View>
            <View style={st.canvasRow}>
                <Text style={st.canvasLabel}>sessions this month</Text>
                <Text style={st.canvasValue}>{sessionCount}</Text>
            </View>
        </View>
    );
});

const ProfileCardLinks = React.memo(({
    partnerId, partnerName, onPassportTap,
}: {
    partnerId: string; partnerName: string; onPassportTap: () => void;
}) => {
    const router = useRouter();
    return (
        <View style={{ marginHorizontal: 10, marginBottom: 6 }}>
            <TouchableOpacity
                style={st.linkRow}
                onPress={() => router.push({ pathname: '/profile/[id]', params: { id: partnerId } })}
            >
                <Text style={st.linkText}>view their profile card</Text>
                <ChevronRight size={12} color="#2e2e2e" />
            </TouchableOpacity>
            <TouchableOpacity style={st.linkRow} onPress={onPassportTap}>
                <Text style={st.linkText}>communication passport</Text>
                <ChevronRight size={12} color="#2e2e2e" />
            </TouchableOpacity>
        </View>
    );
});

// ─── Swipable Locker Card (Reanimated + GestureHandler) ──────────────────────

const SwipableLockerCard = ({
    label, subLabel, date, badge, onEdit, onDelete,
}: {
    label: string; subLabel: string; date: string; badge: string;
    onEdit: () => void; onDelete: () => void;
}) => {
    const translateX = useSharedValue(0);

    const pan = Gesture.Pan()
        .onUpdate(e => {
            if (e.translationX < 0) {
                translateX.value = Math.max(e.translationX, -80);
            } else if (translateX.value < 0) {
                translateX.value = Math.min(e.translationX, 0);
            }
        })
        .onEnd(e => {
            if (e.translationX < -40) {
                translateX.value = withSpring(-80, { damping: 15, stiffness: 200 });
            } else {
                translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
            }
        });

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return (
        <View style={st.swipeWrapper}>
            <View style={st.swipeActions}>
                <TouchableOpacity style={st.swipeEditBtn} onPress={onEdit}>
                    <Text style={st.swipeEditText}>edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.swipeDeleteBtn} onPress={onDelete}>
                    <Text style={st.swipeDeleteText}>delete</Text>
                </TouchableOpacity>
            </View>
            <GestureDetector gesture={pan}>
                <Animated.View style={[st.swipeCard, animStyle]}>
                    <View style={st.swipeCardInner}>
                        <View style={st.swipeBadgeRow}>
                            <View style={st.swipeBadge}>
                                <Text style={st.swipeBadgeText}>{badge}</Text>
                            </View>
                        </View>
                        <Text style={st.swipeLabel} numberOfLines={2}>{label}</Text>
                        <Text style={st.swipeSub}>{subLabel}</Text>
                        <Text style={st.swipeDate}>
                            {new Date(date).toLocaleDateString()}
                        </Text>
                    </View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#080808' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 0.5, borderBottomColor: '#141414',
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#0e0e0e', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#eee' },
    profileSelector: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#0e0e0e', borderRadius: 7, padding: 10,
        marginHorizontal: 10, marginBottom: 10,
        borderWidth: 0.5, borderColor: '#141414',
    },
    profileSelectorRow: { flexDirection: 'row', alignItems: 'center' },
    profileAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
    profileName: { fontSize: 12, fontWeight: '600', color: '#eee' },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 4,
        marginHorizontal: 10, marginBottom: 6,
    },
    statTile: {
        width: '48%', backgroundColor: '#0e0e0e', borderRadius: 7,
        borderWidth: 0.5, borderColor: '#141414',
        padding: 8, alignItems: 'center',
    },
    statValue: { fontSize: 13, fontWeight: '700', color: '#eee' },
    statLabel: { fontSize: 7, color: '#2e2e2e', textTransform: 'uppercase', marginTop: 2 },
    ratioBar: {
        width: '100%', height: 3, backgroundColor: '#141414',
        borderRadius: 2, overflow: 'hidden', marginVertical: 3,
    },
    ratioFill: { height: '100%', backgroundColor: '#eee', borderRadius: 2 },

    // Hard No Banner
    hardNoBanner: {
        backgroundColor: '#120808', borderRadius: 7,
        borderWidth: 0.5, borderColor: '#2e1a1a',
        marginHorizontal: 10, marginBottom: 6, padding: 8,
    },
    hardNoTitle: { fontSize: 9, fontWeight: '700', color: '#c8383a', marginBottom: 2 },
    hardNoBody: { fontSize: 8, color: '#4a2020', lineHeight: 11 },
    hardNoMore: { fontSize: 8, color: '#c8383a', marginTop: 3 },

    // Section titles
    sectionTitleSmall: {
        fontSize: 8, color: '#2e2e2e', textTransform: 'uppercase',
        fontWeight: '700', letterSpacing: 0.5, marginBottom: 6,
    },

    // Tag Activity
    tagActivityContainer: {
        marginHorizontal: 10, marginBottom: 6,
        backgroundColor: '#0e0e0e', borderRadius: 7,
        borderWidth: 0.5, borderColor: '#141414', padding: 10,
    },
    tagActivityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tagActivityLegend: { flexDirection: 'row', gap: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 6, height: 6, borderRadius: 3 },
    legendText: { fontSize: 8, color: '#555' },
    tagActivityCount: { fontSize: 9, color: '#555' },

    // Canvas Status
    canvasContainer: {
        marginHorizontal: 10, marginBottom: 6,
        backgroundColor: '#0e0e0e', borderRadius: 7,
        borderWidth: 0.5, borderColor: '#141414', padding: 10,
    },
    canvasRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 4,
    },
    canvasLabel: { fontSize: 9, color: '#555' },
    canvasValue: { fontSize: 9, color: '#eee', fontWeight: '600' },

    // Profile Card Links
    linkRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#0e0e0e', borderRadius: 7,
        borderWidth: 0.5, borderColor: '#141414',
        paddingHorizontal: 9, paddingVertical: 7, marginBottom: 4,
    },
    linkText: { fontSize: 9, color: '#555' },

    // Locker
    lockerSection: { marginHorizontal: 10, marginTop: 6 },
    lockerTabs: { flexDirection: 'row', gap: 6, marginBottom: 8 },
    lockerTab: {
        paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6,
        backgroundColor: '#0e0e0e', borderWidth: 0.5, borderColor: '#141414',
    },
    lockerTabActive: { backgroundColor: '#eee', borderColor: '#eee' },
    lockerTabText: { fontSize: 10, color: '#555', fontWeight: '600' },
    lockerTabTextActive: { color: '#080808' },
    swipeHint: { fontSize: 7, color: '#2e2e2e', marginBottom: 8 },

    subSectionTitle: {
        fontSize: 8, color: '#2e2e2e', textTransform: 'uppercase',
        fontWeight: '700', letterSpacing: 0.5, marginTop: 12, marginBottom: 6,
    },

    // Read-only cards
    readOnlyCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0e0e0e', borderRadius: 6,
        borderWidth: 0.5, borderColor: '#141414',
        padding: 7, marginBottom: 4,
    },
    readOnlyCardRed: { backgroundColor: '#120808', borderColor: '#2e1a1a' },
    readOnlyIcon: {
        width: 20, height: 20, borderRadius: 4,
        backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
        marginRight: 7,
    },
    readOnlyIconRed: { backgroundColor: '#1a0e0e' },
    readOnlyIconText: { fontSize: 9, fontWeight: '700', color: '#555' },
    readOnlyLabel: { fontSize: 9, fontWeight: '600', color: '#eee' },
    readOnlySub: { fontSize: 7, color: '#2e2e2e', marginTop: 1 },
    readOnlyBadge: {
        backgroundColor: '#1a0e0e', borderRadius: 4,
        paddingHorizontal: 5, paddingVertical: 2, marginLeft: 6,
    },
    readOnlyBadgeText: { fontSize: 8, fontWeight: '700', color: '#c8383a' },

    // Pattern insight
    patternInsight: { fontSize: 8, color: '#333', marginTop: 8 },

    // Swipable card
    swipeWrapper: { position: 'relative', marginBottom: 4 },
    swipeActions: {
        position: 'absolute', right: 0, top: 0, bottom: 0,
        flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 2,
    },
    swipeEditBtn: {
        width: 36, height: '100%', backgroundColor: '#141414',
        borderRadius: 4, borderWidth: 0.5, borderColor: '#1c1c1c',
        alignItems: 'center', justifyContent: 'center',
    },
    swipeEditText: { fontSize: 9, color: '#555' },
    swipeDeleteBtn: {
        width: 36, height: '100%', backgroundColor: '#1a0e0e',
        borderRadius: 4, borderWidth: 0.5, borderColor: '#2e1a1a',
        alignItems: 'center', justifyContent: 'center',
    },
    swipeDeleteText: { fontSize: 9, color: '#c8383a' },
    swipeCard: {
        backgroundColor: '#0e0e0e', borderRadius: 6,
        borderWidth: 0.5, borderColor: '#141414', overflow: 'hidden',
    },
    swipeCardInner: { padding: 8 },
    swipeBadgeRow: { flexDirection: 'row', marginBottom: 4 },
    swipeBadge: {
        backgroundColor: '#141414', borderRadius: 3,
        paddingHorizontal: 5, paddingVertical: 1,
    },
    swipeBadgeText: { fontSize: 7, fontWeight: '700', color: '#555' },
    swipeLabel: { fontSize: 10, color: '#eee', marginBottom: 2 },
    swipeSub: { fontSize: 8, color: '#2e2e2e', marginBottom: 2 },
    swipeDate: { fontSize: 7, color: '#2e2e2e' },

    // Empty state
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
    emptyText: { fontSize: 9, color: '#2e2e2e', marginTop: 6 },

    // FAB
    fab: {
        position: 'absolute', bottom: 24, right: 24,
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#c8383a', alignItems: 'center', justifyContent: 'center',
    },

    // Modals
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-start', paddingTop: 120,
    },
    dropdownContainer: { marginHorizontal: 24 },
    dropdownBlur: { borderRadius: 16, overflow: 'hidden' },
    dropdownItem: {
        flexDirection: 'row', alignItems: 'center', padding: 12,
        borderBottomWidth: 0.5, borderBottomColor: '#141414',
    },
    dropdownAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
    dropdownName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#eee' },
    selectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#c8383a' },

    bottomModalOverlay: {
        flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bottomModal: {
        backgroundColor: '#0e0e0e',
        borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16,
    },
    modalTitle: { fontSize: 14, fontWeight: '700', color: '#eee' },
    inputLabel: { fontSize: 9, color: '#555', marginBottom: 4 },
    input: {
        backgroundColor: '#141414', borderRadius: 7, padding: 10,
        fontSize: 11, color: '#eee', borderWidth: 0.5, borderColor: '#1c1c1c',
        marginBottom: 10,
    },
    saveBtn: {
        backgroundColor: '#c8383a', borderRadius: 7, padding: 10, alignItems: 'center',
    },
    saveBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
