import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    FlatList,
    ActivityIndicator,
    Vibration,
    Modal,
    StyleSheet,
    Dimensions,
    RefreshControl,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    withSpring,
    Easing,
    interpolate,
    runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
    ChevronLeft,
    Play,
    Pause,
    RotateCcw,
    Plus,
    Check,
    Trash2,
    Clock,
    Target,
    TrendingUp,
    Zap,
    X,
    CheckCircle,
    AlertCircle,
    Star,
} from 'lucide-react-native';
import { FocusService, FocusSession, FocusSettings } from '../services/FocusService';
import { TodoService } from '../services/CanvasService';

// ── Types ──────────────────────────────────────────────
interface TodoItem {
    id: string;
    title: string;
    status: 'PENDING' | 'COMPLETED';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    createdAt: string;
}

type Phase = 'work' | 'short' | 'long';
type Tab = 'timer' | 'tasks' | 'analysis';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Color System ───────────────────────────────────────
const C = {
    bg: '#000000',
    card: '#1C1C1E',
    cardActive: '#2C2C2E',
    white: '#FFFFFF',
    white60: 'rgba(255,255,255,0.60)',
    white40: 'rgba(255,255,255,0.40)',
    white20: 'rgba(255,255,255,0.20)',
    white12: 'rgba(255,255,255,0.12)',
    white08: 'rgba(255,255,255,0.08)',
    white04: 'rgba(255,255,255,0.04)',
    ringStart: '#FFFFFF',
    ringEnd: '#A1A1A1',
    success: '#34C759',
    error: '#FF3B30',
};

// ── Ring Constants ──────────────────────────────────────
const RING_SIZE = 250;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ── Suggestion chips ───────────────────────────────────
const SUGGESTIONS = ['Study', 'Deep Work', 'Reading', 'Coding', 'Workout'];

// ── Phase labels ───────────────────────────────────────
const PHASE_LABELS: { key: Phase; label: string }[] = [
    { key: 'work', label: 'Focus' },
    { key: 'short', label: 'Short Break' },
    { key: 'long', label: 'Long Break' },
];

const TAB_LABELS: { key: Tab; label: string }[] = [
    { key: 'timer', label: 'Timer' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'analysis', label: 'Analysis' },
];

// ── Animated Wrappers ──────────────────────────────────
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════
export default function FocusScreen() {
    const router = useRouter();

    // ── State ──────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<Tab>('timer');
    const [settings, setSettings] = useState<FocusSettings>({
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        cyclesUntilLong: 4,
        targetPerDay: 4,
    });
    const [phase, setPhase] = useState<Phase>('work');
    const [seconds, setSeconds] = useState(25 * 60);
    const [running, setRunning] = useState(false);
    const [cycleCount, setCycleCount] = useState(0);
    const [completedToday, setCompletedToday] = useState(0);
    const [totalMinutesToday, setTotalMinutesToday] = useState(0);

    // Tasks
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [tasksLoading, setTasksLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Sessions
    const [sessions, setSessions] = useState<FocusSession[]>([]);
    const [intention, setIntention] = useState('');

    // Review Modal
    const [showReview, setShowReview] = useState(false);
    const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(4);
    const [sessionStartTime, setSessionStartTime] = useState<number>(0);

    // Completion overlay
    const [showCompletion, setShowCompletion] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
        visible: false, message: '', type: 'success',
    });

    // Timer ref
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // ── Animated Values ────────────────────────────────
    const breathScale = useSharedValue(1);
    const tabIndicatorX = useSharedValue(0);
    const ringGlow = useSharedValue(0);
    const completionScale = useSharedValue(0);
    const buttonScale = useSharedValue(1);

    // ── Tab width for indicator ────────────────────────
    const tabWidth = (SCREEN_WIDTH - 48) / 3; // 24px padding each side

    // ── Breathing animation ────────────────────────────
    useEffect(() => {
        if (!running) {
            breathScale.value = withRepeat(
                withSequence(
                    withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                ),
                -1,
                false,
            );
        } else {
            breathScale.value = withTiming(1, { duration: 300 });
        }
    }, [running]);

    // ── Glow animation ─────────────────────────────────
    useEffect(() => {
        ringGlow.value = withTiming(running ? 1 : 0, { duration: 600, easing: Easing.inOut(Easing.ease) });
    }, [running]);

    // ── Tab indicator ──────────────────────────────────
    useEffect(() => {
        const idx = TAB_LABELS.findIndex(t => t.key === activeTab);
        tabIndicatorX.value = withTiming(idx * tabWidth, { duration: 250, easing: Easing.inOut(Easing.ease) });
    }, [activeTab]);

    // ── Animated Styles ────────────────────────────────
    const breathStyle = useAnimatedStyle(() => ({
        transform: [{ scale: breathScale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(ringGlow.value, [0, 1], [0, 0.35]),
        transform: [{ scale: interpolate(ringGlow.value, [0, 1], [0.8, 1.1]) }],
    }));

    const tabIndicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: tabIndicatorX.value }],
    }));

    const completionStyle = useAnimatedStyle(() => ({
        opacity: completionScale.value,
        transform: [{ scale: interpolate(completionScale.value, [0, 1], [0.8, 1]) }],
    }));

    const buttonAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    // ── Toast ──────────────────────────────────────────
    const Toast = () => {
        if (!toast.visible) return null;
        return (
            <View style={s.toastContainer}>
                <View style={[s.toastInner, { backgroundColor: toast.type === 'error' ? C.error : C.cardActive }]}>
                    {toast.type === 'error'
                        ? <AlertCircle size={18} color={C.white} />
                        : <CheckCircle size={18} color={C.success} />
                    }
                    <Text style={s.toastText}>{toast.message}</Text>
                    <TouchableOpacity onPress={() => setToast(p => ({ ...p, visible: false }))}>
                        <X size={16} color={C.white60} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast(p => ({ ...p, visible: false })), 3000);
    };

    // ── Data Loading ───────────────────────────────────
    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [loadedSettings, loadedSessions, todayStats, loadedTodos] = await Promise.all([
            FocusService.getSettings(),
            FocusService.getSessions(),
            FocusService.getTodayStats(),
            TodoService.fetchTodos(),
        ]);
        setSettings(loadedSettings);
        setSessions(loadedSessions);
        setCompletedToday(todayStats.completed);
        setTotalMinutesToday(todayStats.totalMinutes);
        setTodos(loadedTodos as TodoItem[]);
        setTasksLoading(false);
        setSeconds(loadedSettings.workMinutes * 60);
    };

    // ── Timer ──────────────────────────────────────────
    useEffect(() => {
        if (!running) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }
        timerRef.current = setInterval(() => {
            setSeconds(prev => {
                if (prev <= 1) {
                    onPhaseEnd();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [running]);

    const onPhaseEnd = () => {
        setRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate([500, 200, 500]);

        if (phase === 'work') {
            // Show completion overlay briefly, then review
            triggerCompletion();
        } else {
            setPhase('work');
            setSeconds(settings.workMinutes * 60);
        }
    };

    const triggerCompletion = () => {
        setShowCompletion(true);
        completionScale.value = withSequence(
            withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
            withTiming(1, { duration: 1200 }),
            withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) }),
        );
        setTimeout(() => {
            setShowCompletion(false);
            setShowReview(true);
        }, 1800);
    };

    const saveReview = async () => {
        const plannedSeconds = settings.workMinutes * 60;
        const actualSeconds = plannedSeconds - seconds;

        await FocusService.saveSession({
            ts: new Date().toISOString(),
            intention: intention || 'Focus session',
            phase: 'work',
            plannedSeconds,
            actualSeconds,
            quality,
            completed: true,
        });

        await FocusService.logStat('pomodoro', 1);
        await FocusService.logStat('focus_quality', quality);

        const newCompleted = completedToday + 1;
        setCompletedToday(newCompleted);
        setTotalMinutesToday(prev => prev + Math.round(actualSeconds / 60));

        const newCycle = cycleCount + 1;
        setCycleCount(newCycle);

        if (newCycle % settings.cyclesUntilLong === 0) {
            setPhase('long');
            setSeconds(settings.longBreakMinutes * 60);
        } else {
            setPhase('short');
            setSeconds(settings.shortBreakMinutes * 60);
        }

        setIntention('');
        setQuality(4);
        setShowReview(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        showToast('Session completed!', 'success');

        const newSessions = await FocusService.getSessions();
        setSessions(newSessions);
    };

    // ── Controls ───────────────────────────────────────
    const start = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRunning(true);
        if (seconds === settings.workMinutes * 60) {
            setSessionStartTime(Date.now());
        }
    };

    const pause = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRunning(false);
    };

    const reset = () => {
        setRunning(false);
        const time = phase === 'work' ? settings.workMinutes : phase === 'short' ? settings.shortBreakMinutes : settings.longBreakMinutes;
        setSeconds(time * 60);
    };

    const switchPhase = (newPhase: Phase) => {
        Haptics.selectionAsync();
        setRunning(false);
        setPhase(newPhase);
        const time = newPhase === 'work' ? settings.workMinutes : newPhase === 'short' ? settings.shortBreakMinutes : settings.longBreakMinutes;
        setSeconds(time * 60);
    };

    // ── Task Handlers ──────────────────────────────────
    const addTask = async () => {
        if (!newTaskText.trim()) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const tempId = `temp-${Date.now()}`;
        const newTodo: TodoItem = { id: tempId, title: newTaskText.trim(), status: 'PENDING', priority: 'MEDIUM', createdAt: new Date().toISOString() };
        setTodos(prev => [newTodo, ...prev]);
        setNewTaskText('');
        const result = await TodoService.createTodo(newTodo.title);
        if (result) {
            setTodos(prev => prev.map(t => t.id === tempId ? { ...t, id: result.id } as TodoItem : t));
        } else {
            setTodos(prev => prev.filter(t => t.id !== tempId));
            showToast('Failed to add task', 'error');
        }
    };

    const toggleTask = async (todo: TodoItem) => {
        Haptics.selectionAsync();
        const newStatus = todo.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: newStatus } : t));
        const result = await TodoService.updateTodo(todo.id, { status: newStatus });
        if (!result) setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: todo.status } : t));
    };

    const deleteTask = async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const todoToDelete = todos.find(t => t.id === id);
        if (!todoToDelete) return;
        setTodos(prev => prev.filter(t => t.id !== id));
        const success = await TodoService.deleteTodo(id);
        if (!success) {
            setTodos(prev => [...prev, todoToDelete]);
            showToast('Failed to delete task', 'error');
        }
    };

    const onRefreshTasks = async () => {
        setRefreshing(true);
        const latest = await TodoService.fetchTodos();
        setTodos(latest as TodoItem[]);
        setRefreshing(false);
    };

    // ── Helpers ────────────────────────────────────────
    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        if (date.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatTodoTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const totalPhaseSeconds = phase === 'work' ? settings.workMinutes * 60 : phase === 'short' ? settings.shortBreakMinutes * 60 : settings.longBreakMinutes * 60;
    const progress = 1 - (seconds / totalPhaseSeconds);
    const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

    const groupedTodos = todos.reduce((acc, todo) => {
        const dateKey = formatDate(todo.createdAt);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(todo);
        return acc;
    }, {} as Record<string, TodoItem[]>);
    const todoSections = Object.entries(groupedTodos);

    // ── Button press handler ───────────────────────────
    const onPressAction = () => {
        buttonScale.value = withSequence(
            withTiming(0.92, { duration: 60 }),
            withTiming(1, { duration: 60 }),
        );
        if (running) pause(); else start();
    };

    // ════════════════════════════════════════════════════
    //  TIMER VIEW
    // ════════════════════════════════════════════════════
    const TimerView = () => (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

            {/* Phase Chips */}
            <View style={s.phaseRow}>
                {PHASE_LABELS.map(p => {
                    const isActive = phase === p.key;
                    return (
                        <TouchableOpacity
                            key={p.key}
                            onPress={() => switchPhase(p.key)}
                            style={[s.phaseChip, isActive && s.phaseChipActive]}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.phaseChipText, isActive && s.phaseChipTextActive]}>{p.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Timer Ring */}
            <View style={s.timerContainer}>
                {/* Glow behind ring */}
                <Animated.View style={[s.timerGlow, glowStyle]} />

                <Animated.View style={breathStyle}>
                    <View style={s.ringWrapper}>
                        <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
                            <Defs>
                                <SvgGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <Stop offset="0%" stopColor={C.ringStart} stopOpacity="1" />
                                    <Stop offset="100%" stopColor={C.ringEnd} stopOpacity="0.6" />
                                </SvgGradient>
                            </Defs>
                            {/* Background ring */}
                            <Circle
                                cx={RING_SIZE / 2}
                                cy={RING_SIZE / 2}
                                r={RING_RADIUS}
                                stroke={C.white08}
                                strokeWidth={RING_STROKE}
                                fill="none"
                            />
                            {/* Progress ring */}
                            <Circle
                                cx={RING_SIZE / 2}
                                cy={RING_SIZE / 2}
                                r={RING_RADIUS}
                                stroke="url(#ringGrad)"
                                strokeWidth={RING_STROKE}
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={RING_CIRCUMFERENCE}
                                strokeDashoffset={strokeDashoffset}
                                rotation={-90}
                                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                            />
                        </Svg>

                        {/* Timer text overlay */}
                        <View style={s.timerTextOverlay}>
                            <Text style={s.timerDigits}>{formatTime(seconds)}</Text>
                            <Text style={s.timerStatus}>{running ? 'Running' : 'Paused'}</Text>
                        </View>
                    </View>
                </Animated.View>
            </View>

            {/* Action Button */}
            <View style={s.actionRow}>
                <TouchableOpacity onPress={reset} style={s.resetButton} activeOpacity={0.7}>
                    <RotateCcw size={20} color={C.white40} />
                </TouchableOpacity>

                <AnimatedPressable onPress={onPressAction} style={[s.playButton, buttonAnimStyle]}>
                    <View style={s.playButtonInner}>
                        {running
                            ? <Pause size={28} color={C.white} fill={C.white} />
                            : <Play size={28} color={C.white} fill={C.white} style={{ marginLeft: 3 }} />
                        }
                    </View>
                </AnimatedPressable>

                {/* Spacer for symmetry */}
                <View style={{ width: 48 }} />
            </View>

            {/* Intention Input */}
            {phase === 'work' && !running && (
                <View style={s.intentionSection}>
                    <TextInput
                        value={intention}
                        onChangeText={setIntention}
                        placeholder="What deserves your full attention?"
                        placeholderTextColor={C.white40}
                        style={s.intentionInput}
                    />
                    {/* Suggestion chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.suggestionsScroll}>
                        {SUGGESTIONS.map(sug => (
                            <TouchableOpacity
                                key={sug}
                                onPress={() => { setIntention(sug); Haptics.selectionAsync(); }}
                                style={s.suggestionChip}
                                activeOpacity={0.7}
                            >
                                <Text style={s.suggestionText}>{sug}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Stats Cards */}
            <View style={s.statsRow}>
                <View style={s.statCard}>
                    <Target size={16} color={C.white40} />
                    <Text style={s.statNumber}>{completedToday}</Text>
                    <Text style={s.statLabel}>Today</Text>
                </View>
                <View style={{ width: 12 }} />
                <View style={s.statCard}>
                    <Clock size={16} color={C.white40} />
                    <Text style={s.statNumber}>{totalMinutesToday}</Text>
                    <Text style={s.statLabel}>Minutes</Text>
                </View>
            </View>

            {/* Cycle indicator */}
            <View style={s.cycleCard}>
                <Text style={s.cycleLabel}>Cycle {(cycleCount % settings.cyclesUntilLong) + 1} of {settings.cyclesUntilLong}</Text>
                <View style={s.cycleDots}>
                    {Array.from({ length: settings.cyclesUntilLong }).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                s.cycleDot,
                                { backgroundColor: i <= (cycleCount % settings.cyclesUntilLong) ? C.white : C.white12 },
                            ]}
                        />
                    ))}
                </View>
            </View>
        </ScrollView>
    );

    // ════════════════════════════════════════════════════
    //  TASKS VIEW
    // ════════════════════════════════════════════════════
    const TasksView = () => (
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
            {/* Add task */}
            <View style={s.addTaskRow}>
                <TextInput
                    value={newTaskText}
                    onChangeText={setNewTaskText}
                    onSubmitEditing={addTask}
                    placeholder="Add a task..."
                    placeholderTextColor={C.white40}
                    style={s.addTaskInput}
                    returnKeyType="done"
                />
                <TouchableOpacity onPress={addTask} style={s.addTaskButton} activeOpacity={0.7}>
                    <Plus size={18} color={C.white} />
                </TouchableOpacity>
            </View>

            {tasksLoading ? (
                <ActivityIndicator size="large" color={C.white40} style={{ marginTop: 40 }} />
            ) : todos.length === 0 ? (
                <View style={s.emptyState}>
                    <Target size={40} color={C.white20} />
                    <Text style={s.emptyTitle}>No tasks yet</Text>
                    <Text style={s.emptySubtitle}>Add one to focus on.</Text>
                </View>
            ) : (
                <FlatList
                    data={todoSections}
                    keyExtractor={([date]) => date}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshTasks} tintColor={C.white40} />}
                    renderItem={({ item: [date, sectionTodos] }) => (
                        <View style={{ marginBottom: 24 }}>
                            <Text style={s.sectionDate}>{date.toUpperCase()}</Text>
                            {sectionTodos.map(todo => {
                                const done = todo.status === 'COMPLETED';
                                return (
                                    <TouchableOpacity key={todo.id} onPress={() => toggleTask(todo)} style={s.todoCard} activeOpacity={0.7}>
                                        <View style={[s.todoCheck, done && s.todoCheckDone]}>
                                            {done && <Check size={13} color={C.bg} />}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.todoTitle, done && s.todoTitleDone]}>{todo.title}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Clock size={10} color={C.white40} />
                                                    <Text style={s.todoMeta}>{formatTodoTime(todo.createdAt)}</Text>
                                                </View>
                                                {todo.priority === 'HIGH' && (
                                                    <View style={s.priorityBadge}>
                                                        <Text style={s.priorityText}>HIGH</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => deleteTask(todo.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 4 }}>
                                            <Trash2 size={16} color={C.white20} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                />
            )}
        </View>
    );

    // ════════════════════════════════════════════════════
    //  ANALYSIS VIEW
    // ════════════════════════════════════════════════════
    const AnalysisView = () => {
        const last7Days = sessions.filter(s => {
            const daysDiff = (Date.now() - new Date(s.ts).getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7;
        });
        const avgQuality = last7Days.length > 0 ? (last7Days.reduce((acc, s) => acc + s.quality, 0) / last7Days.length).toFixed(1) : '0';
        const totalSessions = last7Days.length;
        const totalMinutes = Math.round(last7Days.reduce((acc, s) => acc + s.actualSeconds, 0) / 60);

        // Weekly chart data (last 7 days)
        const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dailyCounts = weekDays.map((_, i) => {
            const d = new Date();
            const dayOfWeek = d.getDay(); // 0=Sun
            const diff = ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1 - i + 7) % 7;
            const targetDate = new Date(d);
            targetDate.setDate(d.getDate() - diff);
            const dateStr = targetDate.toISOString().slice(0, 10);
            return sessions.filter(s => s.ts.slice(0, 10) === dateStr && s.completed).length;
        });
        const maxCount = Math.max(...dailyCounts, 1);

        return (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                <Text style={s.analysisLabel}>LAST 7 DAYS</Text>

                {/* Summary cards */}
                <View style={s.analysisSummaryRow}>
                    <View style={[s.analysisCard, { marginRight: 6 }]}>
                        <Zap size={16} color={C.white40} />
                        <Text style={s.analysisNumber}>{totalSessions}</Text>
                        <Text style={s.analysisCardLabel}>Sessions</Text>
                    </View>
                    <View style={[s.analysisCard, { marginHorizontal: 6 }]}>
                        <Clock size={16} color={C.white40} />
                        <Text style={s.analysisNumber}>{totalMinutes}</Text>
                        <Text style={s.analysisCardLabel}>Minutes</Text>
                    </View>
                    <View style={[s.analysisCard, { marginLeft: 6 }]}>
                        <Star size={16} color={C.white40} />
                        <Text style={s.analysisNumber}>{avgQuality}</Text>
                        <Text style={s.analysisCardLabel}>Avg Quality</Text>
                    </View>
                </View>

                {/* Weekly chart */}
                <View style={s.chartCard}>
                    <Text style={s.chartTitle}>WEEKLY OVERVIEW</Text>
                    <View style={s.chartBars}>
                        {weekDays.map((day, i) => (
                            <View key={day} style={s.chartBarCol}>
                                <View style={s.chartBarTrack}>
                                    <View style={[s.chartBarFill, { height: `${(dailyCounts[i] / maxCount) * 100}%` }]} />
                                </View>
                                <Text style={s.chartBarLabel}>{day[0]}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Focus score */}
                <View style={s.scoreCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={s.chartTitle}>FOCUS SCORE</Text>
                        <Text style={{ fontSize: 20, fontWeight: '600', color: C.white }}>{avgQuality}/5</Text>
                    </View>
                    <View style={s.scoreBarTrack}>
                        <View style={[s.scoreBarFill, { width: `${(parseFloat(avgQuality as string) / 5) * 100}%` }]} />
                    </View>
                </View>

                {/* Recent sessions */}
                <Text style={[s.analysisLabel, { marginTop: 24 }]}>RECENT SESSIONS</Text>
                {sessions.length === 0 ? (
                    <View style={s.emptyState}>
                        <TrendingUp size={40} color={C.white20} />
                        <Text style={s.emptyTitle}>No focus sessions yet</Text>
                        <Text style={s.emptySubtitle}>Start a focus session to build your streak.</Text>
                    </View>
                ) : (
                    sessions.slice(-10).reverse().map(session => (
                        <View key={session.id} style={s.sessionCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={s.sessionIntention} numberOfLines={1}>{session.intention}</Text>
                                <View style={{ flexDirection: 'row', gap: 2 }}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} size={10} color={i < session.quality ? C.white : C.white20} fill={i < session.quality ? C.white : 'transparent'} />
                                    ))}
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={s.sessionMeta}>{new Date(session.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.white20 }} />
                                <Text style={s.sessionMeta}>{Math.round(session.actualSeconds / 60)} min</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        );
    };

    // ════════════════════════════════════════════════════
    //  MAIN RENDER
    // ════════════════════════════════════════════════════
    return (
        <SafeAreaView style={s.root}>
            <Toast />

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backButton} activeOpacity={0.7}>
                    <ChevronLeft size={22} color={C.white} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Focus</Text>
                <View style={{ width: 44 }} />
            </View>

            {/* Segmented Control */}
            <View style={s.segmentedOuter}>
                <Animated.View style={[s.segmentedIndicator, { width: tabWidth }, tabIndicatorStyle]} />
                {TAB_LABELS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => { setActiveTab(tab.key); Haptics.selectionAsync(); }}
                        style={s.segmentedTab}
                        activeOpacity={0.7}
                    >
                        <Text style={[s.segmentedLabel, activeTab === tab.key && s.segmentedLabelActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {activeTab === 'timer' && <TimerView />}
            {activeTab === 'tasks' && <TasksView />}
            {activeTab === 'analysis' && <AnalysisView />}

            {/* Completion Overlay */}
            {showCompletion && (
                <Animated.View style={[s.completionOverlay, completionStyle]}>
                    <View style={s.completionRing} />
                    <Text style={s.completionText}>Great Focus</Text>
                </Animated.View>
            )}

            {/* Review Modal */}
            <Modal visible={showReview} transparent animationType="fade">
                <View style={s.modalOverlay}>
                    <View style={s.modalCard}>
                        <Text style={s.modalTitle}>Session Complete</Text>
                        <Text style={s.modalSubtitle}>How was your focus?</Text>

                        <Text style={s.modalLabel}>QUALITY</Text>
                        <View style={s.qualityRow}>
                            {([1, 2, 3, 4, 5] as const).map(q => (
                                <TouchableOpacity
                                    key={q}
                                    onPress={() => { setQuality(q); Haptics.selectionAsync(); }}
                                    style={[s.qualityStar, { backgroundColor: quality >= q ? C.white : C.cardActive }]}
                                    activeOpacity={0.7}
                                >
                                    <Star size={18} color={quality >= q ? C.bg : C.white40} fill={quality >= q ? C.bg : 'transparent'} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity onPress={saveReview} style={s.saveButton} activeOpacity={0.8}>
                            <Text style={s.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    // ── Header ─────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: C.white08,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '600',
        color: C.white,
        letterSpacing: -0.5,
    },

    // ── Segmented Control ──────────────────────────────
    segmentedOuter: {
        flexDirection: 'row',
        marginHorizontal: 24,
        marginBottom: 24,
        backgroundColor: C.card,
        borderRadius: 14,
        height: 40,
        position: 'relative',
        overflow: 'hidden',
    },
    segmentedIndicator: {
        position: 'absolute',
        top: 3,
        bottom: 3,
        left: 3,
        backgroundColor: C.cardActive,
        borderRadius: 11,
    },
    segmentedTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    segmentedLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: C.white40,
    },
    segmentedLabelActive: {
        color: C.white,
        fontWeight: '600',
    },

    // ── Phase Chips ────────────────────────────────────
    phaseRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 32,
    },
    phaseChip: {
        height: 32,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    phaseChipActive: {
        backgroundColor: C.cardActive,
    },
    phaseChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: C.white40,
    },
    phaseChipTextActive: {
        color: C.white,
    },

    // ── Timer ──────────────────────────────────────────
    timerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    timerGlow: {
        position: 'absolute',
        width: RING_SIZE + 60,
        height: RING_SIZE + 60,
        borderRadius: (RING_SIZE + 60) / 2,
        backgroundColor: C.white,
    },
    ringWrapper: {
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerTextOverlay: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerDigits: {
        fontSize: 60,
        fontWeight: '500',
        color: C.white,
        letterSpacing: -1.2,
    },
    timerStatus: {
        fontSize: 12,
        fontWeight: '400',
        color: C.white60,
        marginTop: 4,
    },

    // ── Action Row ─────────────────────────────────────
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        gap: 24,
    },
    resetButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: C.white08,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playButtonInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: C.white12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Intention ──────────────────────────────────────
    intentionSection: {
        marginBottom: 24,
    },
    intentionInput: {
        backgroundColor: C.card,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        fontWeight: '400',
        color: C.white,
    },
    suggestionsScroll: {
        marginTop: 10,
    },
    suggestionChip: {
        height: 30,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    suggestionText: {
        fontSize: 12,
        fontWeight: '500',
        color: C.white60,
    },

    // ── Stats Cards ────────────────────────────────────
    statsRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 20,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: '600',
        color: C.white,
        marginTop: 8,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '400',
        color: C.white60,
        marginTop: 2,
    },

    // ── Cycle ──────────────────────────────────────────
    cycleCard: {
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 20,
    },
    cycleLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: C.white60,
        marginBottom: 12,
    },
    cycleDots: {
        flexDirection: 'row',
        gap: 4,
    },
    cycleDot: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },

    // ── Tasks ──────────────────────────────────────────
    addTaskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: C.card,
        borderRadius: 14,
        paddingLeft: 16,
    },
    addTaskInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        fontWeight: '400',
        color: C.white,
    },
    addTaskButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: C.cardActive,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    sectionDate: {
        fontSize: 11,
        fontWeight: '600',
        color: C.white40,
        letterSpacing: 1,
        marginBottom: 10,
    },
    todoCard: {
        backgroundColor: C.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    todoCheck: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: C.white20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    todoCheckDone: {
        backgroundColor: C.white,
        borderColor: C.white,
    },
    todoTitle: {
        fontSize: 15,
        fontWeight: '400',
        color: C.white,
    },
    todoTitleDone: {
        color: C.white40,
        textDecorationLine: 'line-through',
    },
    todoMeta: {
        fontSize: 10,
        fontWeight: '500',
        color: C.white40,
    },
    priorityBadge: {
        backgroundColor: C.white08,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    priorityText: {
        fontSize: 9,
        fontWeight: '600',
        color: C.white60,
    },

    // ── Empty States ───────────────────────────────────
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: C.white,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        fontWeight: '400',
        color: C.white40,
        marginTop: 4,
    },

    // ── Analysis ───────────────────────────────────────
    analysisLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: C.white40,
        letterSpacing: 2,
        marginBottom: 12,
    },
    analysisSummaryRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    analysisCard: {
        flex: 1,
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 16,
    },
    analysisNumber: {
        fontSize: 28,
        fontWeight: '600',
        color: C.white,
        marginTop: 8,
    },
    analysisCardLabel: {
        fontSize: 12,
        fontWeight: '400',
        color: C.white60,
        marginTop: 2,
    },

    // ── Chart ──────────────────────────────────────────
    chartCard: {
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    chartTitle: {
        fontSize: 11,
        fontWeight: '600',
        color: C.white40,
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    chartBars: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 80,
    },
    chartBarCol: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    chartBarTrack: {
        width: 20,
        height: 60,
        backgroundColor: C.white08,
        borderRadius: 6,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    chartBarFill: {
        width: '100%',
        backgroundColor: C.white,
        borderRadius: 6,
        minHeight: 2,
    },
    chartBarLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: C.white40,
    },

    // ── Score ──────────────────────────────────────────
    scoreCard: {
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 20,
    },
    scoreBarTrack: {
        height: 6,
        backgroundColor: C.white08,
        borderRadius: 3,
        overflow: 'hidden',
    },
    scoreBarFill: {
        height: '100%',
        backgroundColor: C.white,
        borderRadius: 3,
    },

    // ── Sessions ───────────────────────────────────────
    sessionCard: {
        backgroundColor: C.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
    },
    sessionIntention: {
        fontSize: 15,
        fontWeight: '500',
        color: C.white,
        flex: 1,
        marginRight: 8,
    },
    sessionMeta: {
        fontSize: 11,
        fontWeight: '400',
        color: C.white40,
    },

    // ── Completion Overlay ─────────────────────────────
    completionOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 100,
    },
    completionRing: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: C.white,
        marginBottom: 24,
    },
    completionText: {
        fontSize: 28,
        fontWeight: '600',
        color: C.white,
        letterSpacing: -0.5,
    },

    // ── Modal ──────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    modalCard: {
        width: 320,
        borderRadius: 24,
        padding: 28,
        backgroundColor: C.card,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: C.white,
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        fontWeight: '400',
        color: C.white60,
        marginBottom: 24,
    },
    modalLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: C.white40,
        letterSpacing: 2,
        marginBottom: 12,
    },
    qualityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 28,
    },
    qualityStar: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        height: 48,
        borderRadius: 14,
        backgroundColor: C.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: C.bg,
    },

    // ── Toast ──────────────────────────────────────────
    toastContainer: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        zIndex: 200,
    },
    toastInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        gap: 10,
    },
    toastText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '400',
        color: C.white,
    },
});
