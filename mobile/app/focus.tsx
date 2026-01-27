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
    RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
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
    Coffee,
    Zap,
    X,
    CheckCircle,
    AlertCircle,
    Star
} from 'lucide-react-native';
import { FocusService, Task, FocusSession, FocusSettings } from '../services/FocusService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Monochrome palette
const MONO = {
    black: '#000000',
    white: '#FFFFFF',
    gray100: '#F8F8F8',
    gray200: '#E8E8E8',
    gray300: '#D0D0D0',
    gray400: '#A0A0A0',
    gray500: '#707070',
    gray600: '#505050',
    gray700: '#303030',
    gray800: '#1A1A1A',
    gray900: '#0A0A0A',
};

type Phase = 'work' | 'short' | 'long';
type Tab = 'timer' | 'tasks' | 'analysis';

export default function FocusScreen() {
    const router = useRouter();
    const { mode } = useTheme();

    // Theme
    const isDark = mode === 'dark';
    const bg = isDark ? MONO.black : MONO.white;
    const cardBg = isDark ? MONO.gray800 : MONO.gray100;
    const textPrimary = isDark ? MONO.white : MONO.black;
    const textSecondary = isDark ? MONO.gray400 : MONO.gray600;
    const accent = isDark ? MONO.white : MONO.black;

    // State
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
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [tasksLoading, setTasksLoading] = useState(true);

    // Sessions
    const [sessions, setSessions] = useState<FocusSession[]>([]);
    const [intention, setIntention] = useState('');

    // Review Modal
    const [showReview, setShowReview] = useState(false);
    const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(4);
    const [sessionStartTime, setSessionStartTime] = useState<number>(0);

    // Toast
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

    // Timer ref
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Toast component
    const Toast = () => {
        if (!toast.visible) return null;
        return (
            <View className="absolute top-20 left-5 right-5 z-50">
                <View className="flex-row items-center p-4 rounded-2xl" style={{ backgroundColor: toast.type === 'error' ? '#c00' : accent }}>
                    {toast.type === 'error' ? <AlertCircle size={20} color={MONO.white} /> : <CheckCircle size={20} color={isDark ? MONO.black : MONO.white} />}
                    <Text style={[styles.fontSans, { fontSize: 14, color: toast.type === 'error' ? MONO.white : (isDark ? MONO.black : MONO.white), marginLeft: 12, flex: 1 }]}>{toast.message}</Text>
                    <TouchableOpacity onPress={() => setToast(prev => ({ ...prev, visible: false }))}>
                        <X size={18} color={toast.type === 'error' ? MONO.white : (isDark ? MONO.black : MONO.white)} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    // Load data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [loadedSettings, loadedSessions, todayStats, loadedTasks] = await Promise.all([
            FocusService.getSettings(),
            FocusService.getSessions(),
            FocusService.getTodayStats(),
            FocusService.getTasks(),
        ]);
        setSettings(loadedSettings);
        setSessions(loadedSessions);
        setCompletedToday(todayStats.completed);
        setTotalMinutesToday(todayStats.totalMinutes);
        setTasks(loadedTasks);
        setTasksLoading(false);
        setSeconds(loadedSettings.workMinutes * 60);
    };

    // Timer countdown
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

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [running]);

    // Phase end handler
    const onPhaseEnd = () => {
        setRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);
        Vibration.vibrate([500, 200, 500]);

        if (phase === 'work') {
            // Show review modal
            setShowReview(true);
        } else {
            // After break, go back to work
            setPhase('work');
            setSeconds(settings.workMinutes * 60);
        }
    };

    // Save review
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

        // Update today stats
        const newCompleted = completedToday + 1;
        setCompletedToday(newCompleted);
        setTotalMinutesToday(prev => prev + Math.round(actualSeconds / 60));

        // Next phase
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
        showToast('Session completed!', 'success');

        // Refresh sessions
        const newSessions = await FocusService.getSessions();
        setSessions(newSessions);
    };

    // Controls
    const start = () => {
        setRunning(true);
        if (seconds === settings.workMinutes * 60) {
            setSessionStartTime(Date.now());
        }
    };

    const pause = () => setRunning(false);

    const reset = () => {
        setRunning(false);
        const time = phase === 'work' ? settings.workMinutes : phase === 'short' ? settings.shortBreakMinutes : settings.longBreakMinutes;
        setSeconds(time * 60);
    };

    const switchPhase = (newPhase: Phase) => {
        setRunning(false);
        setPhase(newPhase);
        const time = newPhase === 'work' ? settings.workMinutes : newPhase === 'short' ? settings.shortBreakMinutes : settings.longBreakMinutes;
        setSeconds(time * 60);
    };

    // Task handlers
    const addTask = async () => {
        if (!newTaskText.trim()) return;
        const result = await FocusService.addTask(newTaskText.trim());
        if (result.success) {
            setNewTaskText('');
            const updated = await FocusService.getTasks();
            setTasks(updated);
            showToast('Task added', 'success');
        } else {
            showToast(result.error || 'Failed to add task', 'error');
        }
    };

    const toggleTask = async (task: Task) => {
        await FocusService.toggleTask(task.id, task.status);
        const updated = await FocusService.getTasks();
        setTasks(updated);
    };

    const deleteTask = async (id: string) => {
        await FocusService.deleteTask(id);
        const updated = await FocusService.getTasks();
        setTasks(updated);
        showToast('Task deleted', 'success');
    };

    // Format time
    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Progress
    const totalPhaseSeconds = phase === 'work' ? settings.workMinutes * 60 : phase === 'short' ? settings.shortBreakMinutes * 60 : settings.longBreakMinutes * 60;
    const progress = 1 - (seconds / totalPhaseSeconds);

    // ==================== TIMER VIEW ====================
    const TimerView = () => (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Phase selector */}
            <View className="flex-row rounded-2xl overflow-hidden mb-8" style={{ backgroundColor: cardBg }}>
                {(['work', 'short', 'long'] as Phase[]).map(p => (
                    <TouchableOpacity
                        key={p}
                        onPress={() => switchPhase(p)}
                        className="flex-1 py-4 items-center"
                        style={{ backgroundColor: phase === p ? accent : 'transparent' }}
                    >
                        <Text style={[styles.fontMono, { fontSize: 10, letterSpacing: 1, color: phase === p ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>
                            {p === 'work' ? 'FOCUS' : p === 'short' ? 'SHORT' : 'LONG'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Timer circle */}
            <View className="items-center mb-10">
                <View className="w-64 h-64 rounded-full items-center justify-center" style={{ borderWidth: 6, borderColor: running ? accent : textSecondary }}>
                    <Text style={[styles.fontCondensed, { fontSize: 64, color: textPrimary, letterSpacing: 4 }]}>
                        {formatTime(seconds)}
                    </Text>
                    <Text style={[styles.fontMono, { fontSize: 11, color: textSecondary, letterSpacing: 2, marginTop: 8 }]}>
                        {running ? 'RUNNING' : 'PAUSED'}
                    </Text>
                </View>
            </View>

            {/* Controls */}
            <View className="flex-row items-center justify-center mb-10">
                <TouchableOpacity
                    onPress={reset}
                    className="w-14 h-14 rounded-full items-center justify-center mr-6"
                    style={{ backgroundColor: cardBg }}
                >
                    <RotateCcw size={22} color={textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={running ? pause : start}
                    className="w-20 h-20 rounded-full items-center justify-center"
                    style={{ backgroundColor: accent }}
                >
                    {running ? (
                        <Pause size={32} color={isDark ? MONO.black : MONO.white} fill={isDark ? MONO.black : MONO.white} />
                    ) : (
                        <Play size={32} color={isDark ? MONO.black : MONO.white} fill={isDark ? MONO.black : MONO.white} style={{ marginLeft: 4 }} />
                    )}
                </TouchableOpacity>

                <View className="w-14 ml-6" />
            </View>

            {/* Intention input */}
            {phase === 'work' && !running && (
                <View className="mb-8">
                    <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 8 }]}>INTENTION</Text>
                    <TextInput
                        value={intention}
                        onChangeText={setIntention}
                        placeholder="What will you focus on?"
                        placeholderTextColor={textSecondary}
                        className="p-4 rounded-2xl"
                        style={[styles.fontSans, { fontSize: 15, color: textPrimary, backgroundColor: cardBg }]}
                    />
                </View>
            )}

            {/* Stats row */}
            <View className="flex-row mb-8">
                <View className="flex-1 p-5 rounded-2xl mr-2" style={{ backgroundColor: cardBg }}>
                    <Target size={18} color={textSecondary} />
                    <Text style={[styles.fontCondensed, { fontSize: 28, color: textPrimary, marginTop: 8 }]}>{completedToday}</Text>
                    <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1 }]}>TODAY</Text>
                </View>
                <View className="flex-1 p-5 rounded-2xl ml-2" style={{ backgroundColor: cardBg }}>
                    <Clock size={18} color={textSecondary} />
                    <Text style={[styles.fontCondensed, { fontSize: 28, color: textPrimary, marginTop: 8 }]}>{totalMinutesToday}</Text>
                    <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1 }]}>MINUTES</Text>
                </View>
            </View>

            {/* Cycle indicator */}
            <View className="p-5 rounded-2xl" style={{ backgroundColor: cardBg }}>
                <View className="flex-row items-center justify-between">
                    <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2 }]}>CYCLE {(cycleCount % settings.cyclesUntilLong) + 1} OF {settings.cyclesUntilLong}</Text>
                    <Coffee size={16} color={textSecondary} />
                </View>
                <View className="flex-row mt-3">
                    {Array.from({ length: settings.cyclesUntilLong }).map((_, i) => (
                        <View
                            key={i}
                            className="flex-1 h-2 rounded-full mr-1"
                            style={{ backgroundColor: i <= (cycleCount % settings.cyclesUntilLong) ? accent : (isDark ? MONO.gray700 : MONO.gray300) }}
                        />
                    ))}
                </View>
            </View>
        </ScrollView>
    );

    // ==================== TASKS VIEW ====================
    const TasksView = () => (
        <View className="flex-1" style={{ paddingHorizontal: 24 }}>
            {/* Add task */}
            <View className="flex-row items-center mb-6">
                <TextInput
                    value={newTaskText}
                    onChangeText={setNewTaskText}
                    onSubmitEditing={addTask}
                    placeholder="Add a task..."
                    placeholderTextColor={textSecondary}
                    className="flex-1 p-4 rounded-2xl"
                    style={[styles.fontSans, { fontSize: 15, color: textPrimary, backgroundColor: cardBg }]}
                />
                <TouchableOpacity onPress={addTask} className="w-14 h-14 rounded-2xl items-center justify-center ml-3" style={{ backgroundColor: accent }}>
                    <Plus size={22} color={isDark ? MONO.black : MONO.white} />
                </TouchableOpacity>
            </View>

            {/* Tasks list */}
            {tasksLoading ? (
                <ActivityIndicator size="large" color={textPrimary} className="mt-10" />
            ) : tasks.length === 0 ? (
                <View className="items-center py-16">
                    <Target size={48} color={textSecondary} />
                    <Text style={[styles.fontSerif, { fontSize: 20, color: textPrimary, marginTop: 16 }]}>No tasks yet</Text>
                    <Text style={[styles.fontSans, { fontSize: 14, color: textSecondary, marginTop: 4 }]}>Add tasks to stay focused</Text>
                </View>
            ) : (
                <FlatList
                    data={tasks}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    renderItem={({ item }) => (
                        <View className="flex-row items-center p-4 rounded-2xl mb-3" style={{ backgroundColor: cardBg }}>
                            <TouchableOpacity onPress={() => toggleTask(item)} className="w-8 h-8 rounded-full items-center justify-center mr-4" style={{ borderWidth: 2, borderColor: item.status === 'COMPLETED' ? accent : textSecondary, backgroundColor: item.status === 'COMPLETED' ? accent : 'transparent' }}>
                                {item.status === 'COMPLETED' && <Check size={16} color={isDark ? MONO.black : MONO.white} />}
                            </TouchableOpacity>
                            <Text style={[styles.fontSans, { fontSize: 15, color: item.status === 'COMPLETED' ? textSecondary : textPrimary, flex: 1, textDecorationLine: item.status === 'COMPLETED' ? 'line-through' : 'none' }]}>{item.title}</Text>
                            <TouchableOpacity onPress={() => deleteTask(item.id)} className="p-2">
                                <Trash2 size={18} color={textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </View>
    );

    // ==================== ANALYSIS VIEW ====================
    const AnalysisView = () => {
        const today = new Date().toISOString().slice(0, 10);
        const last7Days = sessions.filter(s => {
            const sessionDate = new Date(s.ts);
            const daysDiff = (Date.now() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7;
        });

        const avgQuality = last7Days.length > 0 ? (last7Days.reduce((acc, s) => acc + s.quality, 0) / last7Days.length).toFixed(1) : '0';
        const totalSessions = last7Days.length;
        const totalMinutes = Math.round(last7Days.reduce((acc, s) => acc + s.actualSeconds, 0) / 60);

        return (
            <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                {/* Summary cards */}
                <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>LAST 7 DAYS</Text>
                <View className="flex-row mb-6">
                    <View className="flex-1 p-5 rounded-2xl mr-2" style={{ backgroundColor: cardBg }}>
                        <Zap size={18} color={textSecondary} />
                        <Text style={[styles.fontCondensed, { fontSize: 32, color: textPrimary, marginTop: 8 }]}>{totalSessions}</Text>
                        <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1 }]}>SESSIONS</Text>
                    </View>
                    <View className="flex-1 p-5 rounded-2xl mx-2" style={{ backgroundColor: cardBg }}>
                        <Clock size={18} color={textSecondary} />
                        <Text style={[styles.fontCondensed, { fontSize: 32, color: textPrimary, marginTop: 8 }]}>{totalMinutes}</Text>
                        <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1 }]}>MINUTES</Text>
                    </View>
                    <View className="flex-1 p-5 rounded-2xl ml-2" style={{ backgroundColor: cardBg }}>
                        <Star size={18} color={textSecondary} />
                        <Text style={[styles.fontCondensed, { fontSize: 32, color: textPrimary, marginTop: 8 }]}>{avgQuality}</Text>
                        <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1 }]}>AVG QUALITY</Text>
                    </View>
                </View>

                {/* Recent sessions */}
                <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12, marginTop: 8 }]}>RECENT SESSIONS</Text>
                {sessions.slice(-10).reverse().map(session => (
                    <View key={session.id} className="p-4 rounded-2xl mb-3" style={{ backgroundColor: cardBg }}>
                        <View className="flex-row items-center justify-between mb-2">
                            <Text style={[styles.fontSerif, { fontSize: 16, color: textPrimary }]} numberOfLines={1}>{session.intention}</Text>
                            <View className="flex-row items-center">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} size={12} color={i < session.quality ? accent : textSecondary} fill={i < session.quality ? accent : 'transparent'} />
                                ))}
                            </View>
                        </View>
                        <View className="flex-row items-center">
                            <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary }]}>
                                {new Date(session.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                            <View className="w-1 h-1 rounded-full mx-2" style={{ backgroundColor: textSecondary }} />
                            <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary }]}>
                                {Math.round(session.actualSeconds / 60)} min
                            </Text>
                        </View>
                    </View>
                ))}

                {sessions.length === 0 && (
                    <View className="items-center py-16">
                        <TrendingUp size={48} color={textSecondary} />
                        <Text style={[styles.fontSerif, { fontSize: 20, color: textPrimary, marginTop: 16 }]}>No sessions yet</Text>
                        <Text style={[styles.fontSans, { fontSize: 14, color: textSecondary, marginTop: 4 }]}>Complete focus sessions to see analysis</Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    // ==================== MAIN RENDER ====================
    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: bg }}>
            <Toast />

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4">
                <TouchableOpacity onPress={() => router.back()} className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: cardBg }}>
                    <ChevronLeft size={24} color={textPrimary} />
                </TouchableOpacity>
                <View className="items-center">
                    <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 3 }]}>PRODUCTIVITY</Text>
                    <Text style={[styles.fontSerif, { fontSize: 24, color: textPrimary }]}>Focus</Text>
                </View>
                <View className="w-12" />
            </View>

            {/* Tab bar */}
            <View className="flex-row mx-6 mb-6 rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg }}>
                {(['timer', 'tasks', 'analysis'] as Tab[]).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        className="flex-1 py-4 items-center"
                        style={{ backgroundColor: activeTab === tab ? accent : 'transparent' }}
                    >
                        <Text style={[styles.fontMono, { fontSize: 10, letterSpacing: 1, color: activeTab === tab ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>
                            {tab.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {activeTab === 'timer' && <TimerView />}
            {activeTab === 'tasks' && <TasksView />}
            {activeTab === 'analysis' && <AnalysisView />}

            {/* Review Modal */}
            <Modal visible={showReview} transparent animationType="fade">
                <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <View className="w-80 rounded-3xl p-6" style={{ backgroundColor: isDark ? MONO.gray800 : MONO.white }}>
                        <Text style={[styles.fontSerif, { fontSize: 24, color: textPrimary, marginBottom: 8 }]}>Session Complete</Text>
                        <Text style={[styles.fontSans, { fontSize: 14, color: textSecondary, marginBottom: 24 }]}>How was your focus?</Text>

                        {/* Quality rating */}
                        <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 2, marginBottom: 12 }]}>QUALITY</Text>
                        <View className="flex-row justify-between mb-8">
                            {([1, 2, 3, 4, 5] as const).map(q => (
                                <TouchableOpacity
                                    key={q}
                                    onPress={() => setQuality(q)}
                                    className="w-14 h-14 rounded-xl items-center justify-center"
                                    style={{ backgroundColor: quality >= q ? accent : cardBg }}
                                >
                                    <Star size={20} color={quality >= q ? (isDark ? MONO.black : MONO.white) : textSecondary} fill={quality >= q ? (isDark ? MONO.black : MONO.white) : 'transparent'} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={saveReview}
                            className="py-4 rounded-2xl items-center"
                            style={{ backgroundColor: accent }}
                        >
                            <Text style={[styles.fontMono, { fontSize: 12, color: isDark ? MONO.black : MONO.white, letterSpacing: 2 }]}>SAVE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// Typography styles
const styles = StyleSheet.create({
    fontSerif: { fontFamily: 'System', fontWeight: '700' },
    fontSans: { fontFamily: 'System', fontWeight: '400' },
    fontMono: { fontFamily: 'System', fontWeight: '500' },
    fontCondensed: { fontFamily: 'System', fontWeight: '700' },
});
