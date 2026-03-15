// app/dots/bloom-watch.tsx — Fullscreen Bloom Watch Screen
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, TextInput, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { X, Heart, Share2, Plus, StickyNote, MoreHorizontal } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { SlashService } from '../../services/SlashService';

const { width: SW, height: SH } = Dimensions.get('window');

interface WatchLill {
    id: string;
    postId: string;
    videoUrl: string;
    title: string;
    creator: string;
    duration: number;
    bloomScript: string | null;
}

export default function BloomWatchScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const slashId = params.slashId as string;
    const depth = params.depth as string || 'overview';
    const voiceMode = params.voiceMode as string || 'multiple';
    const durationParam = params.duration as string;
    const sessionDuration = durationParam ? parseInt(durationParam) : null;

    const [queue, setQueue] = useState<WatchLill[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slashName, setSlashName] = useState('');
    const [showNotes, setShowNotes] = useState(false);
    const [sessionNotes, setSessionNotes] = useState<{ text: string; source: string; isUser: boolean }[]>([]);
    const [newNote, setNewNote] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(sessionDuration ? sessionDuration * 60 : null);
    const [isLiked, setIsLiked] = useState(false);
    const videoRef = useRef<Video>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const notesPanelX = useSharedValue(200);

    useEffect(() => {
        loadQueue();
        if (sessionDuration) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev === null) return null;
                    if (prev <= 1) {
                        // Session ended
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        if (timeRemaining === 0) {
            // Wait for current video to end, then navigate to end screen
            handleSessionEnd();
        }
    }, [timeRemaining]);

    const loadQueue = async () => {
        const slashResult = await SlashService.getSlashById(slashId);
        if (slashResult.success && slashResult.data) {
            setSlashName(slashResult.data.name);
        }

        const result = await SlashService.getSlashLills(slashId, depth, 20);
        if (result.success && result.data) {
            const mapped: WatchLill[] = result.data.map((lill: any) => {
                const post = lill.post;
                const media = post?.postMedia?.[0]?.media;
                const creator = post?.user;
                const creatorProfile = Array.isArray(creator?.profile) ? creator.profile[0] : creator?.profile;

                return {
                    id: lill.id,
                    postId: lill.postId,
                    videoUrl: media?.url || '',
                    title: post?.content || 'untitled',
                    creator: creatorProfile?.displayName || creator?.name || 'unknown',
                    duration: lill.duration || 60,
                    bloomScript: lill.bloomScript,
                };
            }).filter((l: WatchLill) => l.videoUrl);

            // Voice mode: if single, keep one creator; if multiple, interleave
            if (voiceMode === 'single' && mapped.length > 0) {
                const firstCreator = mapped[0].creator;
                setQueue(mapped.filter(l => l.creator === firstCreator));
            } else {
                setQueue(mapped);
            }

            // Collect bloomscript notes
            const notes: { text: string; source: string; isUser: boolean }[] = [];
            mapped.forEach((l: WatchLill) => {
                if (l.bloomScript) {
                    const bullets = l.bloomScript.split('\n').filter(b => b.trim());
                    bullets.forEach(b => notes.push({ text: b, source: slashResult.data?.name || '', isUser: false }));
                }
            });
            setSessionNotes(notes);
        }
    };

    const handleVideoEnd = () => {
        if (currentIndex < queue.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsLiked(false);
        } else {
            handleSessionEnd();
        }
    };

    const handleSessionEnd = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        router.replace({
            pathname: '/dots/bloom-end' as any,
            params: {
                slashId,
                slashName,
                lillsWatched: (currentIndex + 1).toString(),
                notesCount: sessionNotes.length.toString(),
                minutesWatched: sessionDuration ? (sessionDuration - Math.floor((timeRemaining || 0) / 60)).toString() : '0',
            },
        });
    };

    const handleDone = () => {
        handleSessionEnd();
    };

    const toggleNotes = () => {
        setShowNotes(prev => !prev);
        notesPanelX.value = withSpring(showNotes ? 200 : 0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const addUserNote = () => {
        if (!newNote.trim()) return;
        setSessionNotes(prev => [...prev, { text: newNote.trim(), source: 'me', isUser: true }]);
        setNewNote('');
    };

    const notesPanelStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: notesPanelX.value }],
    }));

    const currentLill = queue[currentIndex];

    if (!currentLill) {
        return (
            <View style={st.root}>
                <Text style={st.loadingText}>loading session...</Text>
            </View>
        );
    }

    return (
        <View style={st.root}>
            {/* Video */}
            <Video
                ref={videoRef}
                source={{ uri: currentLill.videoUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping={false}
                onPlaybackStatusUpdate={(status: any) => {
                    if (status.didJustFinish) handleVideoEnd();
                }}
            />

            {/* Top overlay */}
            <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={st.topOverlay}>
                <View style={st.topRow}>
                    <View>
                        <Text style={st.topSlash}>/{slashName}</Text>
                        <Text style={st.topProgress}>{currentIndex + 1} of {queue.length}</Text>
                    </View>
                    <TouchableOpacity onPress={handleDone}>
                        <Text style={st.doneText}>done</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Bottom overlay */}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={st.bottomOverlay}>
                <Text style={st.creatorName}>@{currentLill.creator}</Text>
                <Text style={st.lillTitle} numberOfLines={2}>{currentLill.title}</Text>
                {/* Progress bar */}
                <View style={st.progressBg}>
                    <View style={st.progressFill} />
                </View>
            </LinearGradient>

            {/* Right side icons */}
            <View style={st.iconColumn}>
                <TouchableOpacity onPress={toggleNotes} style={st.iconBtn}>
                    <StickyNote size={20} color="#eee" />
                    {sessionNotes.length > 0 && (
                        <View style={st.noteBadge}>
                            <Text style={st.noteBadgeText}>{sessionNotes.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => { setIsLiked(!isLiked); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={st.iconBtn}
                >
                    <Heart size={20} color={isLiked ? '#c8383a' : '#eee'} fill={isLiked ? '#c8383a' : 'transparent'} />
                </TouchableOpacity>
                <TouchableOpacity style={st.iconBtn}>
                    <Share2 size={20} color="#eee" />
                </TouchableOpacity>
                <TouchableOpacity style={st.iconBtn}>
                    <Plus size={20} color="#eee" />
                </TouchableOpacity>
                <TouchableOpacity style={st.iconBtn}>
                    <MoreHorizontal size={20} color="#eee" />
                </TouchableOpacity>
            </View>

            {/* Notes panel */}
            {showNotes && (
                <Animated.View style={[st.notesPanel, notesPanelStyle]}>
                    <Text style={st.notesPanelTitle}>SESSION NOTES</Text>
                    <FlatList
                        data={sessionNotes}
                        keyExtractor={(_, i) => i.toString()}
                        renderItem={({ item }) => (
                            <View style={st.noteRow}>
                                <Text style={[st.noteText, item.isUser ? st.noteTextUser : st.noteTextCreator]}>
                                    {item.text}
                                </Text>
                                <Text style={st.noteSource}>/{item.source}</Text>
                            </View>
                        )}
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={false}
                    />
                    <View style={st.noteInputRow}>
                        <TextInput
                            value={newNote}
                            onChangeText={setNewNote}
                            placeholder="add note..."
                            placeholderTextColor="#333"
                            style={st.noteInput}
                            onSubmitEditing={addUserNote}
                        />
                        <TouchableOpacity onPress={addUserNote} style={st.addNoteBtn}>
                            <Text style={st.addNoteBtnText}>+ add</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={st.noteActions}>
                        <Text style={st.noteActionText}>save</Text>
                        <Text style={st.noteActionText}>share</Text>
                        <Text style={st.noteActionText}>export</Text>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const st = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#080808' },
    loadingText: { color: '#2e2e2e', fontSize: 10, textAlign: 'center', marginTop: SH / 2 },

    // Top overlay
    topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, paddingTop: 50, paddingHorizontal: 16, zIndex: 10 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topSlash: { color: '#eee', fontSize: 9, fontWeight: '700' },
    topProgress: { color: '#3a3a3a', fontSize: 9, marginTop: 2 },
    doneText: { color: '#c8383a', fontSize: 9, fontWeight: '700' },

    // Bottom overlay
    bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, paddingHorizontal: 16, paddingBottom: 40, justifyContent: 'flex-end', zIndex: 10 },
    creatorName: { color: '#eee', fontSize: 10, fontWeight: '700' },
    lillTitle: { color: '#777', fontSize: 8, marginTop: 2, maxWidth: SW * 0.65 },
    progressBg: { height: 1.5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 1, marginTop: 8 },
    progressFill: { height: '100%', width: '30%', backgroundColor: '#eee', borderRadius: 1 },

    // Icon column
    iconColumn: { position: 'absolute', right: 12, bottom: 140, gap: 16, zIndex: 10 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
    noteBadge: { position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    noteBadgeText: { color: '#080808', fontSize: 7, fontWeight: '700' },

    // Notes panel
    notesPanel: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 200, backgroundColor: '#0e0e0e', borderLeftWidth: 0.5, borderColor: '#1c1c1c', paddingTop: 60, paddingHorizontal: 12, paddingBottom: 20, zIndex: 20 },
    notesPanelTitle: { color: '#555', fontSize: 8, fontWeight: '600', letterSpacing: 1, marginBottom: 12 },
    noteRow: { paddingVertical: 6, borderBottomWidth: 0.5, borderColor: '#1c1c1c' },
    noteText: { fontSize: 9, lineHeight: 14 },
    noteTextCreator: { color: '#bbb' },
    noteTextUser: { color: '#444' },
    noteSource: { color: '#1e1e1e', fontSize: 7, marginTop: 2 },
    noteInputRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
    noteInput: { flex: 1, color: '#eee', fontSize: 10, backgroundColor: '#0a0a0a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 0.5, borderColor: '#1c1c1c' },
    addNoteBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, backgroundColor: '#1a1a1a' },
    addNoteBtnText: { color: '#555', fontSize: 9, fontWeight: '600' },
    noteActions: { flexDirection: 'row', gap: 12, marginTop: 8, justifyContent: 'center' },
    noteActionText: { color: '#444', fontSize: 8, fontWeight: '600' },
});
