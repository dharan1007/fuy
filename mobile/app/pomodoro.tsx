import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Play, Pause, RefreshCw, Timer } from 'lucide-react-native';

// I'll stick to simple standard View/Text to avoid dependency issues for now, or use SVG if installed.
// Assuming react-native-svg might be present as it's common in Expo, but safe bet is simple UI.

const MINUTES_FOCUS = 25;
const MINUTES_BREAK = 5;

export default function PomodoroScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [timeLeft, setTimeLeft] = useState(MINUTES_FOCUS * 60);
    const [isActive, setIsActive] = useState(false);
    const [modeType, setModeType] = useState<'FOCUS' | 'BREAK'>('FOCUS'); // FOCUS or BREAK
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isActive) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current!);
                        setIsActive(false);
                        Vibration.vibrate([1000, 1000, 1000]);
                        // Toggle mode automatically? Or wait for user. 
                        // Let's just stop and switch mode ready directly
                        if (modeType === 'FOCUS') {
                            setModeType('BREAK');
                            return MINUTES_BREAK * 60;
                        } else {
                            setModeType('FOCUS');
                            return MINUTES_FOCUS * 60;
                        }
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, modeType]);

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(modeType === 'FOCUS' ? MINUTES_FOCUS * 60 : MINUTES_BREAK * 60);
    };

    const switchMode = (newMode: 'FOCUS' | 'BREAK') => {
        setIsActive(false);
        setModeType(newMode);
        setTimeLeft(newMode === 'FOCUS' ? MINUTES_FOCUS * 60 : MINUTES_BREAK * 60);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getGradientColors = (): [string, string, string] => {
        if (modeType === 'BREAK') return ['#10b981', '#059669', '#047857']; // Green for break
        return ['#f59e0b', '#d97706', '#b45309']; // Orange for focus
    };

    return (
        <LinearGradient colors={['#1a1a1a', '#000000']} className="flex-1">
            {/* Background overlay for mode color */}
            <LinearGradient
                colors={getGradientColors()}
                className="absolute inset-0 opacity-20"
            />

            <SafeAreaView className="flex-1 px-6">
                <View className="flex-row items-center justify-between py-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-white/10">
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-white">Pomodoro</Text>
                    <View className="w-10" />
                </View>

                <View className="flex-1 justify-center items-center">

                    {/* Mode Toggles */}
                    <View className="flex-row bg-white/10 p-1 rounded-full mb-12">
                        <TouchableOpacity
                            onPress={() => switchMode('FOCUS')}
                            className={`px-6 py-2 rounded-full ${modeType === 'FOCUS' ? 'bg-white/20' : ''}`}
                        >
                            <Text className={`font-bold ${modeType === 'FOCUS' ? 'text-white' : 'text-gray-400'}`}>Focus</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => switchMode('BREAK')}
                            className={`px-6 py-2 rounded-full ${modeType === 'BREAK' ? 'bg-white/20' : ''}`}
                        >
                            <Text className={`font-bold ${modeType === 'BREAK' ? 'text-white' : 'text-gray-400'}`}>Break</Text>
                        </TouchableOpacity>
                    </View>


                    {/* Timer Display */}
                    <View className="w-64 h-64 rounded-full border-4 border-white/20 items-center justify-center mb-12 relative">
                        {/* Simple progress ring simulation with border opacity or just text for now */}
                        <View className="absolute inset-0 rounded-full border-4 border-white opacity-100" />

                        <Text className="text-6xl font-black text-white tracking-widest">
                            {formatTime(timeLeft)}
                        </Text>
                        <Text className="text-white/70 uppercase tracking-widest mt-2">{isActive ? 'Running' : 'Paused'}</Text>
                    </View>

                    {/* Controls */}
                    <View className="flex-row items-center gap-8">
                        <TouchableOpacity
                            onPress={toggleTimer}
                            className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-lg active:scale-95 transition-transform"
                        >
                            {isActive ? (
                                <Pause fill="black" size={32} />
                            ) : (
                                <Play fill="black" className="ml-1" size={32} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={resetTimer}
                            className="w-14 h-14 bg-white/20 rounded-full items-center justify-center active:scale-95"
                        >
                            <RefreshCw color="white" size={24} />
                        </TouchableOpacity>
                    </View>

                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}
