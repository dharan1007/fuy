// app/dots/bloom.tsx — Bloom Sphere Screen
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { SharedValue, useSharedValue, useAnimatedStyle, withDecay, useDerivedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { SlashService, SphereSlash, Slash } from '../../services/SlashService';
import SlashCreationSheet from '../../components/SlashCreationSheet';
import AccessRequestSheet from '../../components/AccessRequestSheet';

const { width: SW, height: SH } = Dimensions.get('window');
const SPHERE_RADIUS = SW * 0.38;
const CENTER_X = SW / 2;
const CENTER_Y = SH * 0.42;

// ============================================================
// Sphere Card Component
// ============================================================
const SphereCard = React.memo(({
    slash,
    rotationY,
    onTap,
}: {
    slash: SphereSlash;
    rotationY: SharedValue<number>;
    onTap: (slash: SphereSlash) => void;
}) => {
    const animatedStyle = useAnimatedStyle(() => {
        const theta = slash.clusterTheta + rotationY.value;
        const phi = slash.clusterPhi;

        const depth = Math.sin(phi) * Math.sin(theta);
        if (depth < 0) return { opacity: 0, transform: [{ scale: 0 }], position: 'absolute' as const };

        const screenX = Math.sin(phi) * Math.cos(theta) * SPHERE_RADIUS + CENTER_X;
        const screenY = Math.cos(phi) * SPHERE_RADIUS * 0.7 + CENTER_Y;
        const scale = 0.75 + depth * 0.25;
        const opacity = depth > 0.1 ? 0.3 + depth * 0.7 : 0.2;

        return {
            position: 'absolute' as const,
            left: screenX - 45,
            top: screenY - 18,
            transform: [{ scale }],
            opacity,
            zIndex: Math.round(depth * 100),
        };
    });

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                onPress={() => {
                    Haptics.selectionAsync();
                    onTap(slash);
                }}
                activeOpacity={0.7}
                style={st.sphereCard}
            >
                <Text style={st.sphereCardName} numberOfLines={1}>/{slash.name}</Text>
                <Text style={st.sphereCardCount}>{slash.lillCount} lills</Text>
                {slash.accessMode === 'locked' && (
                    <Text style={st.sphereCardLocked}>[L]</Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
});

// ============================================================
// Slash Entry Bottom Sheet
// ============================================================
const SlashEntrySheet = ({
    visible,
    slash,
    onClose,
    onStartBloom,
    onRequestAccess,
}: {
    visible: boolean;
    slash: Slash | null;
    onClose: () => void;
    onStartBloom: (slashId: string, depth: string, voiceMode: string, duration: number | null) => void;
    onRequestAccess: () => void;
}) => {
    const [depth, setDepth] = useState('overview');
    const [voiceMode, setVoiceMode] = useState('multiple');
    const [sessionDuration, setSessionDuration] = useState<number | null>(20);
    const [lills, setLills] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && slash) fetchLills();
    }, [visible, slash, depth]);

    const fetchLills = async () => {
        if (!slash) return;
        setLoading(true);
        const result = await SlashService.getSlashLills(slash.id, depth, 20);
        if (result.success && result.data) setLills(result.data);
        setLoading(false);
    };

    if (!visible || !slash) return null;

    const creatorProfile = slash.creator?.profile;
    const creatorName = creatorProfile?.displayName || slash.creator?.name || 'unknown';

    return (
        <View style={st.entrySheet}>
            {/* Header */}
            <View style={st.entryHeader}>
                <TouchableOpacity onPress={onClose} style={st.entryCloseBtn}>
                    <X size={18} color="#555" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={st.entryTitle}>/{slash.name}</Text>
                    <Text style={st.entryMeta}>
                        {slash.lillCount} lills  {slash.contributorCount} contributors
                    </Text>
                    <Text style={st.entryCode}>{slash.slashCode}</Text>
                </View>
                {slash.accessMode === 'locked' && (
                    <View style={st.lockedBadge}>
                        <Text style={st.lockedText}>locked</Text>
                    </View>
                )}
            </View>

            {/* Locked banner */}
            {slash.accessMode === 'locked' && (
                <View style={st.lockedBanner}>
                    <Text style={st.lockedBannerTitle}>locked slash -- curator @{creatorName}</Text>
                    <Text style={st.lockedBannerDesc}>only approved contributors can add lills here</Text>
                </View>
            )}

            {/* Depth dial */}
            <Text style={st.sectionLabel}>depth</Text>
            <View style={st.pillRow}>
                {['intro', 'overview', 'deep', 'expert'].map(d => (
                    <TouchableOpacity
                        key={d}
                        onPress={() => { setDepth(d); Haptics.selectionAsync(); }}
                        style={[st.pill, depth === d && st.pillActive]}
                    >
                        <Text style={[st.pillText, depth === d && st.pillTextActive]}>{d}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Voice mode */}
            <Text style={st.sectionLabel}>voice mode</Text>
            <View style={st.pillRow}>
                {[{ id: 'single', label: 'one creator' }, { id: 'multiple', label: 'multiple voices' }].map(v => (
                    <TouchableOpacity
                        key={v.id}
                        onPress={() => { setVoiceMode(v.id); Haptics.selectionAsync(); }}
                        style={[st.pill, voiceMode === v.id && st.pillActive]}
                    >
                        <Text style={[st.pillText, voiceMode === v.id && st.pillTextActive]}>{v.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Queue */}
            <Text style={st.sectionLabel}>queue ({lills.length})</Text>
            {loading ? (
                <ActivityIndicator color="#555" style={{ marginVertical: 12 }} />
            ) : lills.length === 0 ? (
                <Text style={st.emptyQueue}>no lills at this depth level</Text>
            ) : (
                <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                    {lills.slice(0, 5).map((lill, i) => {
                        const post = lill.post;
                        const creator = post?.user;
                        const creatorP = Array.isArray(creator?.profile) ? creator.profile[0] : creator?.profile;
                        return (
                            <View key={lill.id} style={st.queueRow}>
                                <Text style={st.queueIndex}>{i + 1}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={st.queueTitle} numberOfLines={1}>{post?.content || 'untitled'}</Text>
                                    <Text style={st.queueCreator}>@{creatorP?.displayName || creator?.name || 'unknown'}</Text>
                                </View>
                                <Text style={st.queueDuration}>{Math.round((lill.duration || 60) / 60)}m</Text>
                            </View>
                        );
                    })}
                </ScrollView>
            )}

            {/* Session timer */}
            <Text style={st.sectionLabel}>session</Text>
            <View style={st.pillRow}>
                {[10, 20, 30, null].map(d => (
                    <TouchableOpacity
                        key={d || 'none'}
                        onPress={() => { setSessionDuration(d); Haptics.selectionAsync(); }}
                        style={[st.pill, sessionDuration === d && st.pillActive]}
                    >
                        <Text style={[st.pillText, sessionDuration === d && st.pillTextActive]}>
                            {d ? `${d} min` : 'no limit'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Start button */}
            <TouchableOpacity
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onStartBloom(slash.id, depth, voiceMode, sessionDuration);
                }}
                style={st.startBtn}
                disabled={lills.length === 0}
            >
                <Text style={st.startBtnText}>start bloom</Text>
            </TouchableOpacity>

            {/* Access request button for locked slashes */}
            {slash.accessMode === 'locked' && (
                <TouchableOpacity onPress={onRequestAccess} style={st.requestBtn}>
                    <Text style={st.requestBtnText}>request to contribute lills</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

// ============================================================
// Main Bloom Screen
// ============================================================
export default function BloomScreen() {
    const router = useRouter();
    const { session } = useAuth();
    const [slashes, setSlashes] = useState<SphereSlash[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Slash[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedSlash, setSelectedSlash] = useState<Slash | null>(null);
    const [showEntry, setShowEntry] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [showAccessRequest, setShowAccessRequest] = useState(false);
    const [lowEndMode, setLowEndMode] = useState(false);

    const rotationY = useSharedValue(0);

    useEffect(() => {
        loadSlashes();
    }, []);

    const loadSlashes = async () => {
        if (!session?.user) return;
        setLoading(true);
        const result = await SlashService.getSphereSlashes(session.user.id);
        if (result.success && result.data) {
            setSlashes(result.data);
        }
        setLoading(false);
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        const result = await SlashService.searchSlashes(query, 10);
        if (result.success && result.data) setSearchResults(result.data);
    };

    const handleSlashTap = async (sphereSlash: SphereSlash) => {
        const result = await SlashService.getSlashById(sphereSlash.id);
        if (result.success && result.data) {
            setSelectedSlash(result.data);
            setShowEntry(true);
        }
    };

    const handleSearchSelect = async (slash: Slash) => {
        setSelectedSlash(slash);
        setIsSearching(false);
        setSearchQuery('');
        setShowEntry(true);
    };

    const handleStartBloom = (slashId: string, depth: string, voiceMode: string, duration: number | null) => {
        setShowEntry(false);
        router.push({
            pathname: '/dots/bloom-watch' as any,
            params: { slashId, depth, voiceMode, duration: duration?.toString() || '' },
        });
    };

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            rotationY.value += e.translationX * 0.003;
        })
        .onEnd((e) => {
            rotationY.value = withDecay({
                velocity: e.velocityX * 0.003,
                deceleration: 0.997,
            });
        });

    const sphereOpacity = useAnimatedStyle(() => ({
        opacity: withTiming(isSearching ? 0.15 : 1, { duration: 300 }),
    }));

    // Low-end fallback grid
    const renderFallbackGrid = () => (
        <ScrollView contentContainerStyle={st.fallbackGrid}>
            {slashes.map(slash => (
                <TouchableOpacity
                    key={slash.id}
                    style={st.fallbackCard}
                    onPress={() => handleSlashTap(slash)}
                >
                    <Text style={st.fallbackName} numberOfLines={1}>/{slash.name}</Text>
                    <Text style={st.fallbackCount}>{slash.lillCount} lills</Text>
                    {slash.accessMode === 'locked' && (
                        <Text style={st.fallbackLocked}>[L]</Text>
                    )}
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    return (
        <View style={st.root}>
            {/* Sphere */}
            {loading ? (
                <View style={st.loadingCenter}>
                    <ActivityIndicator color="#555" />
                    <Text style={st.loadingText}>loading sphere</Text>
                </View>
            ) : lowEndMode ? (
                <>
                    <TouchableOpacity
                        onPress={() => setLowEndMode(false)}
                        style={st.sphereToggle}
                    >
                        <Text style={st.sphereToggleText}>sphere view</Text>
                    </TouchableOpacity>
                    {renderFallbackGrid()}
                </>
            ) : (
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[st.sphereContainer, sphereOpacity]}>
                        {slashes.map(slash => (
                            <SphereCard
                                key={slash.id}
                                slash={slash}
                                rotationY={rotationY}
                                onTap={handleSlashTap}
                            />
                        ))}
                    </Animated.View>
                </GestureDetector>
            )}

            {/* Search bar */}
            <SafeAreaView style={st.searchContainer} edges={['top']}>
                <LinearGradient
                    colors={['#080808', 'transparent']}
                    style={st.searchGradient}
                >
                    <View style={st.searchBar}>
                        <Search size={14} color="#2e2e2e" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={handleSearch}
                            onFocus={() => setIsSearching(true)}
                            onBlur={() => {
                                if (!searchQuery) setIsSearching(false);
                            }}
                            placeholder="search slashes or codes"
                            placeholderTextColor="#2e2e2e"
                            style={st.searchInput}
                            autoCapitalize="none"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setIsSearching(false); }}>
                                <X size={14} color="#2e2e2e" />
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>
            </SafeAreaView>

            {/* Search results */}
            {isSearching && searchResults.length > 0 && (
                <View style={st.searchResults}>
                    {searchResults.map(slash => (
                        <TouchableOpacity
                            key={slash.id}
                            onPress={() => handleSearchSelect(slash)}
                            style={st.searchResultRow}
                        >
                            <Text style={st.searchResultName}>/{slash.name}</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <Text style={st.searchResultCount}>{slash.lillCount} lills</Text>
                                {slash.accessMode === 'locked' && (
                                    <Text style={st.searchResultLocked}>locked</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                    {/* Create new option */}
                    {searchQuery.length > 1 && !searchResults.find(s => s.name === searchQuery.toLowerCase()) && (
                        <TouchableOpacity
                            onPress={() => {
                                setIsSearching(false);
                                setShowCreate(true);
                            }}
                            style={st.createResultRow}
                        >
                            <Text style={st.createResultText}>create /{searchQuery.toLowerCase()}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Slash entry sheet */}
            <SlashEntrySheet
                visible={showEntry}
                slash={selectedSlash}
                onClose={() => setShowEntry(false)}
                onStartBloom={handleStartBloom}
                onRequestAccess={() => {
                    setShowEntry(false);
                    setShowAccessRequest(true);
                }}
            />

            {/* Creation sheet */}
            <SlashCreationSheet
                visible={showCreate}
                onClose={() => setShowCreate(false)}
                onCreated={(newSlash) => {
                    setSlashes(prev => [{
                        id: newSlash.id,
                        name: newSlash.name,
                        slashCode: newSlash.slashCode,
                        accessMode: newSlash.accessMode,
                        lillCount: 0,
                        clusterTheta: newSlash.clusterTheta || 0,
                        clusterPhi: newSlash.clusterPhi || 0,
                        isInteracted: true,
                    }, ...prev]);
                }}
                prefillName={searchQuery}
            />

            {/* Access request sheet */}
            {selectedSlash && (
                <AccessRequestSheet
                    visible={showAccessRequest}
                    onClose={() => setShowAccessRequest(false)}
                    slashId={selectedSlash.id}
                    slashName={selectedSlash.name}
                    curatorUsername={selectedSlash.creator?.profile?.displayName || selectedSlash.creator?.name}
                />
            )}
        </View>
    );
}

const st = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#080808' },
    loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: '#2e2e2e', fontSize: 9, fontWeight: '600', letterSpacing: 1, marginTop: 8, textTransform: 'uppercase' },
    sphereContainer: { flex: 1 },
    sphereCard: { width: 90, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#0e0e0e', borderRadius: 8, borderWidth: 0.5, borderColor: '#1c1c1c' },
    sphereCardName: { color: '#eee', fontSize: 9, fontWeight: '700' },
    sphereCardCount: { color: '#2e2e2e', fontSize: 7, marginTop: 2 },
    sphereCardLocked: { color: '#c8383a', fontSize: 7, fontWeight: '700', position: 'absolute', top: 3, right: 5 },

    // Search
    searchContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
    searchGradient: { paddingHorizontal: 16, paddingBottom: 16 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0e0e0e', borderRadius: 20, borderWidth: 0.5, borderColor: '#1c1c1c', paddingHorizontal: 14, height: 36, gap: 8 },
    searchInput: { flex: 1, color: '#eee', fontSize: 12 },
    searchResults: { position: 'absolute', top: 100, left: 16, right: 16, backgroundColor: '#0e0e0e', borderRadius: 12, borderWidth: 0.5, borderColor: '#1c1c1c', zIndex: 200, maxHeight: 300, overflow: 'hidden' },
    searchResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderColor: '#1c1c1c' },
    searchResultName: { color: '#eee', fontSize: 11, fontWeight: '600' },
    searchResultCount: { color: '#2e2e2e', fontSize: 9 },
    searchResultLocked: { color: '#c8383a', fontSize: 8, fontWeight: '600' },
    createResultRow: { paddingHorizontal: 14, paddingVertical: 12 },
    createResultText: { color: '#c8383a', fontSize: 10, fontWeight: '600' },

    // Entry sheet
    entrySheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SH * 0.72, backgroundColor: '#0e0e0e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, zIndex: 50 },
    entryHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    entryCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
    entryTitle: { color: '#eee', fontSize: 14, fontWeight: '700' },
    entryMeta: { color: '#2e2e2e', fontSize: 8, marginTop: 2 },
    entryCode: { color: '#1e1e1e', fontSize: 7, fontFamily: 'monospace', marginTop: 2 },
    lockedBadge: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#1a0e0e', borderRadius: 6 },
    lockedText: { color: '#c8383a', fontSize: 8, fontWeight: '700' },
    lockedBanner: { backgroundColor: '#120e0e', borderRadius: 8, padding: 10, marginBottom: 12 },
    lockedBannerTitle: { color: '#c8383a', fontSize: 8 },
    lockedBannerDesc: { color: '#4a2020', fontSize: 8, marginTop: 2 },
    sectionLabel: { color: '#555', fontSize: 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
    pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0e0e0e', borderWidth: 0.5, borderColor: '#1c1c1c' },
    pillActive: { backgroundColor: '#eee' },
    pillText: { color: '#3a3a3a', fontSize: 9, fontWeight: '600' },
    pillTextActive: { color: '#080808' },
    emptyQueue: { color: '#2e2e2e', fontSize: 9, paddingVertical: 12, textAlign: 'center' },
    queueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 0.5, borderColor: '#1c1c1c' },
    queueIndex: { color: '#2e2e2e', fontSize: 9, fontWeight: '700', width: 16, textAlign: 'center' },
    queueTitle: { color: '#aaa', fontSize: 9 },
    queueCreator: { color: '#333', fontSize: 8, marginTop: 1 },
    queueDuration: { color: '#2e2e2e', fontSize: 8 },
    startBtn: { backgroundColor: '#eee', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
    startBtnText: { color: '#080808', fontSize: 10, fontWeight: '700' },
    requestBtn: { backgroundColor: '#1a0e0e', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
    requestBtnText: { color: '#c8383a', fontSize: 9, fontWeight: '600' },

    // Fallback grid
    sphereToggle: { alignSelf: 'center', marginTop: 60, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 0.5, borderColor: '#1c1c1c' },
    sphereToggleText: { color: '#2e2e2e', fontSize: 9 },
    fallbackGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 8, paddingTop: 8 },
    fallbackCard: { width: (SW - 48) / 2, backgroundColor: '#0e0e0e', borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: '#1c1c1c' },
    fallbackName: { color: '#eee', fontSize: 10, fontWeight: '700' },
    fallbackCount: { color: '#2e2e2e', fontSize: 8, marginTop: 4 },
    fallbackLocked: { color: '#c8383a', fontSize: 7, fontWeight: '700', position: 'absolute', top: 8, right: 8 },
});
