import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Types
export interface Task {
    id: string;
    title: string;
    status: 'PENDING' | 'COMPLETED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    createdAt: string;
}

export interface FocusSession {
    id: string;
    ts: string;
    intention: string;
    phase: 'work' | 'short' | 'long';
    plannedSeconds: number;
    actualSeconds: number;
    quality: 1 | 2 | 3 | 4 | 5;
    completed: boolean;
}

export interface FocusSettings {
    workMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    cyclesUntilLong: number;
    targetPerDay: number;
}

// Storage keys
const SETTINGS_KEY = 'fuy.focus.settings';
const SESSIONS_KEY = 'fuy.focus.sessions';
const TODAY_KEY = 'fuy.focus.today';

// Default settings
const DEFAULT_SETTINGS: FocusSettings = {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesUntilLong: 4,
    targetPerDay: 4,
};

class FocusServiceClass {
    // ==================== SETTINGS ====================
    async getSettings(): Promise<FocusSettings> {
        try {
            const raw = await AsyncStorage.getItem(SETTINGS_KEY);
            if (raw) return JSON.parse(raw);
            return DEFAULT_SETTINGS;
        } catch {
            return DEFAULT_SETTINGS;
        }
    }

    async saveSettings(settings: FocusSettings): Promise<void> {
        try {
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    // ==================== SESSIONS ====================
    async getSessions(): Promise<FocusSession[]> {
        try {
            const raw = await AsyncStorage.getItem(SESSIONS_KEY);
            if (raw) return JSON.parse(raw);
            return [];
        } catch {
            return [];
        }
    }

    async saveSession(session: Omit<FocusSession, 'id'>): Promise<FocusSession> {
        try {
            const sessions = await this.getSessions();
            const newSession: FocusSession = {
                ...session,
                id: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            };
            sessions.push(newSession);
            // Keep last 100 sessions
            const trimmed = sessions.slice(-100);
            await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
            return newSession;
        } catch (e) {
            console.error('Failed to save session:', e);
            throw e;
        }
    }

    async getTodayStats(): Promise<{ completed: number; totalMinutes: number }> {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const sessions = await this.getSessions();
            const todaySessions = sessions.filter(s => s.ts.slice(0, 10) === today && s.completed);
            return {
                completed: todaySessions.length,
                totalMinutes: Math.round(todaySessions.reduce((acc, s) => acc + s.actualSeconds, 0) / 60),
            };
        } catch {
            return { completed: 0, totalMinutes: 0 };
        }
    }

    // ==================== TASKS (via Supabase) ====================
    async getTasks(): Promise<Task[]> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('Todo')
                .select('*')
                .eq('userId', user.id)
                .order('createdAt', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to fetch tasks:', e);
            return [];
        }
    }

    async addTask(title: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'Not authenticated' };

            const { error } = await supabase
                .from('Todo')
                .insert({
                    id: `todo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    userId: user.id,
                    title: title.trim(),
                    status: 'PENDING',
                    priority: 'MEDIUM',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });

            if (error) throw error;
            return { success: true };
        } catch (e: any) {
            console.error('Failed to add task:', e);
            return { success: false, error: e.message };
        }
    }

    async toggleTask(id: string, currentStatus: string): Promise<{ success: boolean }> {
        try {
            const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
            const { error } = await supabase
                .from('Todo')
                .update({ status: newStatus, updatedAt: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (e) {
            console.error('Failed to toggle task:', e);
            return { success: false };
        }
    }

    async deleteTask(id: string): Promise<{ success: boolean }> {
        try {
            const { error } = await supabase
                .from('Todo')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (e) {
            console.error('Failed to delete task:', e);
            return { success: false };
        }
    }

    // ==================== STATS ====================
    async logStat(type: string, value: number): Promise<void> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase.from('Stat').insert({
                id: `stat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                userId: user.id,
                type,
                category: 'FOCUS',
                value,
                createdAt: new Date().toISOString(),
            });
        } catch (e) {
            console.error('Failed to log stat:', e);
        }
    }
}

export const FocusService = new FocusServiceClass();
