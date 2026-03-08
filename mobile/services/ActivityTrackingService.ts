import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// --- Types ---

export interface GPSPoint {
    latitude: number;
    longitude: number;
    altitude: number | null;
    timestamp: number;
    speed: number | null; // m/s from GPS hardware
}

export type ActivityType = 'run' | 'walk' | 'cycle' | 'gym' | 'custom';
export type ActivityStatus = 'tracking' | 'paused' | 'finished';
export type PrivacyLevel = 'public' | 'friends' | 'private';

export interface ActivitySession {
    id: string;
    userId: string;
    activityType: ActivityType;
    startTime: number;
    endTime: number | null;
    distance: number;         // meters
    duration: number;         // seconds (active tracking time, excludes pauses)
    avgPace: number;          // min/km (0 if no distance)
    avgSpeed: number;         // km/h
    calories: number;
    elevationGain: number;    // meters
    points: GPSPoint[];
    status: ActivityStatus;
    taggedUsers: string[];
    privacyLevel: PrivacyLevel;
}

// MET values for calorie estimation
const MET_VALUES: Record<ActivityType, number> = {
    run: 9.8,
    walk: 3.5,
    cycle: 7.5,
    gym: 6.0,
    custom: 5.0,
};

const STORAGE_KEY = 'wrex_active_session';
const HISTORY_KEY = 'wrex_activity_history';
const GPS_INTERVAL_MS = 2000;          // 2 seconds
const GPS_DISTANCE_INTERVAL_M = 1;    // 1 meter minimum move to fire callback
const NOTIFICATION_CHANNEL_ID = 'activity_tracking';
const NOTIFICATION_ID = 'wrex_activity';

// --- Haversine distance (meters) ---
function haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// --- Service ---

type TrackingListener = (session: ActivitySession) => void;

class ActivityTrackingService {
    private session: ActivitySession | null = null;
    private locationSubscription: Location.LocationSubscription | null = null;
    private listeners: Set<TrackingListener> = new Set();
    private pausedAt: number | null = null;
    private totalPausedDuration: number = 0;
    private timerInterval: ReturnType<typeof setInterval> | null = null;
    private notificationInterval: ReturnType<typeof setInterval> | null = null;
    private notificationSetup = false;

    // --- Listeners ---
    addListener(fn: TrackingListener): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private notify() {
        if (this.session) {
            this.listeners.forEach(fn => fn({ ...this.session! }));
        }
    }

    getSession(): ActivitySession | null {
        return this.session ? { ...this.session } : null;
    }

    // --- Notification Setup ---
    private async setupNotificationChannel() {
        if (this.notificationSetup) return;
        this.notificationSetup = true;
        try {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
                    name: 'Activity Tracking',
                    importance: Notifications.AndroidImportance.LOW,
                    sound: null,
                    vibrationPattern: null,
                    enableLights: false,
                    showBadge: false,
                });
            }
        } catch (e) {
            console.warn('[ActivityTracker] Failed to setup notification channel:', e);
        }
    }

    private async showTrackingNotification() {
        if (!this.session) return;
        try {
            await this.setupNotificationChannel();
            const distKm = (this.session.distance / 1000).toFixed(2);
            const speed = ActivityTrackingService.formatSpeed(this.session.avgSpeed);
            const duration = ActivityTrackingService.formatDuration(this.session.duration);
            const type = ActivityTrackingService.getActivityLabel(this.session.activityType);

            await Notifications.scheduleNotificationAsync({
                identifier: NOTIFICATION_ID,
                content: {
                    title: `${type} in progress`,
                    body: `${distKm} km · ${duration} · ${speed} km/h`,
                    data: { type: 'activity_tracking' },
                    sticky: true,
                    autoDismiss: false,
                    ...(Platform.OS === 'android' && {
                        channelId: NOTIFICATION_CHANNEL_ID,
                        priority: Notifications.AndroidNotificationPriority.LOW,
                        ongoing: true,
                    }),
                },
                trigger: null, // Show immediately
            });
        } catch (e) {
            console.warn('[ActivityTracker] Failed to show notification:', e);
        }
    }

    private async dismissTrackingNotification() {
        try {
            await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
        } catch (e) {
            // Ignore
        }
    }

    // --- Start ---
    async start(activityType: ActivityType, userId: string): Promise<boolean> {
        // Request foreground permission first
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') return false;

        // Request background permission for lock screen tracking
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
            console.warn('[ActivityTracker] Background location not granted. Tracking may stop when screen locks.');
        }

        // Request notification permission for lock screen display
        const { status: notifStatus } = await Notifications.requestPermissionsAsync();
        if (notifStatus !== 'granted') {
            console.warn('[ActivityTracker] Notification permission not granted. Lock screen widget unavailable.');
        }

        const id = `activity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        this.session = {
            id,
            userId,
            activityType,
            startTime: Date.now(),
            endTime: null,
            distance: 0,
            duration: 0,
            avgPace: 0,
            avgSpeed: 0,
            calories: 0,
            elevationGain: 0,
            points: [],
            status: 'tracking',
            taggedUsers: [],
            privacyLevel: 'public',
        };

        this.totalPausedDuration = 0;
        this.pausedAt = null;

        // Start location tracking with minimal jitter filtering
        this.locationSubscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: GPS_INTERVAL_MS,
                distanceInterval: GPS_DISTANCE_INTERVAL_M,
            },
            (location) => this.onLocationUpdate(location)
        );

        // Duration timer (every second)
        this.timerInterval = setInterval(() => {
            if (this.session && this.session.status === 'tracking') {
                const now = Date.now();
                this.session.duration = Math.floor(
                    (now - this.session.startTime - this.totalPausedDuration) / 1000
                );
                this.updateDerivedMetrics();
                this.notify();
            }
        }, 1000);

        // Update notification every 5 seconds to keep lock screen widget fresh
        this.notificationInterval = setInterval(() => {
            this.showTrackingNotification();
        }, 5000);

        // Show initial notification
        await this.showTrackingNotification();

        await this.persistSession();
        this.notify();
        return true;
    }

    // --- Location update ---
    private onLocationUpdate(location: Location.LocationObject) {
        if (!this.session || this.session.status !== 'tracking') return;

        const point: GPSPoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            timestamp: location.timestamp,
            speed: location.coords.speed,
        };

        // Calculate distance from last point using haversine
        if (this.session.points.length > 0) {
            const last = this.session.points[this.session.points.length - 1];
            const dist = haversineDistance(
                last.latitude, last.longitude,
                point.latitude, point.longitude
            );

            // Reject only extreme GPS teleportation (> 150m in one interval at any realistic speed)
            // Previous filter of dist < 1 was too aggressive and caused dist = 0.04 km
            if (dist > 0 && dist < 150) {
                this.session.distance += dist;

                // Elevation gain
                if (point.altitude !== null && last.altitude !== null) {
                    const elevChange = point.altitude - last.altitude;
                    if (elevChange > 0) {
                        this.session.elevationGain += elevChange;
                    }
                }
            }
        }

        this.session.points.push(point);
        this.updateDerivedMetrics();
        this.notify();

        // Persist every 10 points
        if (this.session.points.length % 10 === 0) {
            this.persistSession();
        }
    }

    // --- Derived metrics ---
    private updateDerivedMetrics() {
        if (!this.session) return;

        const distKm = this.session.distance / 1000;
        const durationSec = this.session.duration;
        const durationMin = durationSec / 60;
        const durationHrs = durationSec / 3600;

        // Average speed (km/h) — primary metric for display
        this.session.avgSpeed = durationHrs > 0 ? distKm / durationHrs : 0;

        // Average pace (min/km) — only meaningful when moving
        // Use hardware GPS speed if available and more accurate
        if (distKm > 0.01 && durationMin > 0) {
            this.session.avgPace = durationMin / distKm;
        } else if (this.session.avgSpeed > 0.5) {
            // Fallback: calculate pace from speed
            this.session.avgPace = 60 / this.session.avgSpeed;
        } else {
            this.session.avgPace = 0;
        }

        // Calories (MET-based: calories = MET * weight_kg * hours)
        // Use 70kg as default; MET formula is standardized
        const weightKg = 70;
        const met = MET_VALUES[this.session.activityType];
        if (durationHrs > 0) {
            this.session.calories = Math.round(met * weightKg * durationHrs);
        }
    }

    // --- Pause / Resume ---
    pause() {
        if (!this.session || this.session.status !== 'tracking') return;
        this.session.status = 'paused';
        this.pausedAt = Date.now();
        this.locationSubscription?.remove();
        this.locationSubscription = null;

        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
            this.notificationInterval = null;
        }

        this.notify();
        this.persistSession();
    }

    async resume() {
        if (!this.session || this.session.status !== 'paused') return;

        if (this.pausedAt) {
            this.totalPausedDuration += Date.now() - this.pausedAt;
            this.pausedAt = null;
        }

        this.session.status = 'tracking';

        this.locationSubscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: GPS_INTERVAL_MS,
                distanceInterval: GPS_DISTANCE_INTERVAL_M,
            },
            (location) => this.onLocationUpdate(location)
        );

        // Restart notification updates
        this.notificationInterval = setInterval(() => {
            this.showTrackingNotification();
        }, 5000);

        await this.showTrackingNotification();
        this.notify();
    }

    // --- Finish ---
    async finish(): Promise<ActivitySession | null> {
        if (!this.session) return null;

        if (this.pausedAt) {
            this.totalPausedDuration += Date.now() - this.pausedAt;
            this.pausedAt = null;
        }

        this.session.status = 'finished';
        this.session.endTime = Date.now();
        this.session.duration = Math.floor(
            (this.session.endTime - this.session.startTime - this.totalPausedDuration) / 1000
        );
        this.updateDerivedMetrics();

        this.locationSubscription?.remove();
        this.locationSubscription = null;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
            this.notificationInterval = null;
        }

        await this.dismissTrackingNotification();

        const finished = { ...this.session };
        await this.saveToHistory(finished);
        await AsyncStorage.removeItem(STORAGE_KEY);
        this.session = null;
        this.notify();

        return finished;
    }

    // --- Discard ---
    async discard() {
        this.locationSubscription?.remove();
        this.locationSubscription = null;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
            this.notificationInterval = null;
        }

        await this.dismissTrackingNotification();

        this.session = null;
        this.pausedAt = null;
        this.totalPausedDuration = 0;
        await AsyncStorage.removeItem(STORAGE_KEY);
        this.notify();
    }

    // --- Persistence ---
    private async persistSession() {
        if (!this.session) return;
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
        } catch (e) {
            console.error('Failed to persist session:', e);
        }
    }

    async restoreSession(): Promise<boolean> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (data) {
                this.session = JSON.parse(data);
                if (this.session && this.session.status !== 'finished') {
                    this.notify();
                    return true;
                }
            }
        } catch (e) {
            console.error('Failed to restore session:', e);
        }
        return false;
    }

    // --- History ---
    private async saveToHistory(session: ActivitySession) {
        try {
            const raw = await AsyncStorage.getItem(HISTORY_KEY);
            const history: ActivitySession[] = raw ? JSON.parse(raw) : [];
            history.unshift(session);
            if (history.length > 100) history.length = 100;
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.error('Failed to save to history:', e);
        }
    }

    async getHistory(): Promise<ActivitySession[]> {
        try {
            const raw = await AsyncStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to load history:', e);
            return [];
        }
    }

    async deleteActivity(id: string) {
        try {
            const raw = await AsyncStorage.getItem(HISTORY_KEY);
            const history: ActivitySession[] = raw ? JSON.parse(raw) : [];
            const updated = history.filter(a => a.id !== id);
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to delete activity:', e);
        }
    }

    // --- Utilities ---
    static formatDuration(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    static formatDistance(meters: number): string {
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(2)} km`;
    }

    /** Format pace as MM'SS" per km. Returns '--:--' if no pace yet. */
    static formatPace(minPerKm: number): string {
        if (!minPerKm || !isFinite(minPerKm) || minPerKm <= 0 || minPerKm > 60) return '--:--';
        const mins = Math.floor(minPerKm);
        const secs = Math.round((minPerKm - mins) * 60);
        if (secs === 60) return `${mins + 1}:00`;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /** Format speed in km/h with 1 decimal. */
    static formatSpeed(kmh: number): string {
        if (!kmh || !isFinite(kmh) || kmh < 0) return '0.0';
        return kmh.toFixed(1);
    }

    static getActivityIcon(type: ActivityType): string {
        const icons: Record<ActivityType, string> = {
            run: 'run',
            walk: 'walk',
            cycle: 'bike',
            gym: 'dumbbell',
            custom: 'activity',
        };
        return icons[type];
    }

    static getActivityLabel(type: ActivityType): string {
        const labels: Record<ActivityType, string> = {
            run: 'Run',
            walk: 'Walk',
            cycle: 'Cycle',
            gym: 'Gym',
            custom: 'Activity',
        };
        return labels[type];
    }
}

export const activityTracker = new ActivityTrackingService();
export default ActivityTrackingService;
