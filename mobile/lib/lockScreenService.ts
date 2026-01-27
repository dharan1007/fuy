import notifee, { AndroidImportance, AndroidStyle, EventType, AndroidColor, AndroidVisibility } from '@notifee/react-native';
import { workoutWidgetService } from './workoutWidgetService';

export interface NotificationSet {
    setNumber: number;
    completed: boolean;
    reps: string | number;
    weight?: number;
}

export interface NotificationExercise {
    name: string;
    sets: NotificationSet[];
}

type UpdateListener = (exerciseName: string, setNumber: number) => void;

class LockScreenService {
    private isTracking = false;
    private channelId = 'workout-service';
    private workoutStartTime: number = 0;
    private currentExercises: NotificationExercise[] = [];
    private listeners: UpdateListener[] = [];

    async setup() {
        // Request permissions
        await notifee.requestPermission();

        // Create a channel (required for Android)
        await notifee.createChannel({
            id: this.channelId,
            name: 'Workout Tracking',
            lights: false,
            vibration: false,
            importance: AndroidImportance.HIGH,
        });

        // Register foreground service handler
        notifee.registerForegroundService((notification) => {
            return new Promise(() => {
                // Keep the service running
            });
        });

        // Handle notification actions
        notifee.onForegroundEvent(({ type, detail }) => {
            if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'finish') {
                this.stopTracking();
            }
        });

        notifee.onBackgroundEvent(async ({ type, detail }) => {
            if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'finish') {
                await this.stopTracking();
            }
        });

        // Listen for Widget Events
        workoutWidgetService.addListener(this.handleWidgetEvent.bind(this));
    }

    addUpdateListener(listener: UpdateListener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private async handleWidgetEvent(event: string) {
        if (!this.isTracking) return;

        if (event === 'mark_set') {
            await this.markNextSet();
        } else if (event === 'skip_rest') {
            // Notify subscribers (WorkoutView) to skip rest
            this.listeners.forEach(l => l("SKIP_REST", -1));
        }
    }

    private async markNextSet() {
        // Find first incomplete set
        const exercise = this.currentExercises.find(ex => ex.sets.some(s => !s.completed));
        if (exercise) {
            const set = exercise.sets.find(s => !s.completed);
            if (set) {
                // Optimistic update local display
                set.completed = true;
                this.updateProgress(this.currentExercises[0]?.name || "", this.currentExercises); // Workout name lost? need to store it

                // Notify subscribers (WorkoutView)
                this.listeners.forEach(l => l(exercise.name, set.setNumber));
            }
        }
    }

    async startTracking(workoutName: string, exercises: NotificationExercise[]) {
        if (this.isTracking) return;
        this.isTracking = true;
        this.workoutStartTime = Date.now();
        this.currentExercises = exercises;
        await this.displayNotification(workoutName, exercises);
    }

    // ... rest of file (updateProgress needs to match signature)


    async updateProgress(workoutName: string, exercises: NotificationExercise[], restTime: string = "", isResting: boolean = false) {
        if (!this.isTracking) return;
        await this.displayNotification(workoutName, exercises, restTime, isResting);
    }

    private formatTime(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    private async displayNotification(workoutName: string, exercises: NotificationExercise[], restTime: string = "", isResting: boolean = false) {
        // Calculate Workout Progress (Overall)
        let totalWorkoutSets = 0;
        let completedWorkoutSets = 0;
        exercises.forEach(ex => {
            totalWorkoutSets += ex.sets.length;
            completedWorkoutSets += ex.sets.filter(s => s.completed).length;
        });
        const progress = totalWorkoutSets > 0 ? Math.round((completedWorkoutSets / totalWorkoutSets) * 100) : 0;

        // Find current exercise (first with incomplete sets, or last one if all done)
        const currentExerciseObj = exercises.find(ex => ex.sets.some(s => !s.completed)) || exercises[exercises.length - 1];
        const currentExerciseName = currentExerciseObj ? currentExerciseObj.name : 'Workout Complete';

        // Calculate Current Exercise Sets for Boxes
        let currentTotalSets = 0;
        let currentCompletedSets = 0;
        if (currentExerciseObj) {
            currentTotalSets = currentExerciseObj.sets.length;
            currentCompletedSets = currentExerciseObj.sets.filter(s => s.completed).length;
        }

        // Calculate Next Exercise Info
        let nextSetInfo = "Finish";
        const currentIndex = exercises.findIndex(ex => ex.name === currentExerciseName);
        if (currentIndex !== -1 && currentIndex < exercises.length - 1) {
            nextSetInfo = exercises[currentIndex + 1].name;
        }

        // Elapsed time
        const elapsed = this.formatTime(Date.now() - this.workoutStartTime);

        // Update Native Notification (Expanded Custom View)
        workoutWidgetService.showNotification(
            workoutName,
            currentExerciseName,
            progress,
            currentCompletedSets, // Pass Exercise specific counts
            currentTotalSets,     // Pass Exercise specific counts
            elapsed,
            nextSetInfo,
            restTime,
            isResting
        );

        // Update Home Screen Widget
        const setsStatus = exercises.map(ex =>
            ex.sets.map(s => s.completed ? 'X' : 'O').join('')
        ).join('|');

        workoutWidgetService.updateWidget(
            workoutName,
            currentExerciseName,
            progress,
            currentCompletedSets,
            currentTotalSets,
            elapsed,
            setsStatus,
            nextSetInfo,
            restTime,
            isResting
        );

        // Minimal Foreground Service Notification (handled by notifee to keep service alive)
        // We update this infrequently or keep it minimal so it doesn't conflict visually
        await notifee.displayNotification({
            id: 'workout-session',
            title: 'Workout Tracking Active',
            body: isResting ? `Resting: ${restTime}` : `Current: ${currentExerciseName}`,
            android: {
                channelId: this.channelId,
                asForegroundService: true,
                ongoing: true,
                smallIcon: 'ic_launcher',
                color: '#4CAF50',
                progress: {
                    max: 100,
                    current: progress,
                },
                visibility: AndroidVisibility.SECRET,
                importance: AndroidImportance.MIN,
                // We use a minimal style here because the Native Notification provides the rich UI
                style: {
                    type: AndroidStyle.INBOX,
                    lines: [
                        `Time: ${elapsed}`,
                        `Progress: ${progress}%`
                    ]
                },
                actions: [
                    {
                        title: 'Finish',
                        pressAction: { id: 'finish' },
                    }
                ]
            },
        });
    }

    async stopTracking() {
        this.isTracking = false;
        this.workoutStartTime = 0;
        await notifee.stopForegroundService();
        workoutWidgetService.clearWidget();
    }
}

export const lockScreenService = new LockScreenService();
