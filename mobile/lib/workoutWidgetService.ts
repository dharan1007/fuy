import { NativeModules, Platform } from 'react-native';

interface WorkoutWidgetModuleInterface {
    updateWidget(
        workoutName: string,
        currentExercise: string,
        progress: number,
        completedSets: number,
        totalSets: number,
        elapsedTime: string,
        setsStatus: string,
        nextSetInfo: string,
        restTime: string,
        isResting: boolean
    ): void;

    showNotification(
        workoutName: string,
        currentExercise: string,
        progress: number,
        completedSets: number,
        totalSets: number,
        elapsedTime: string,
        nextSetInfo: string,
        restTime: string,
        isResting: boolean
    ): void;

    clearWidget(): void;
}

const { WorkoutWidgetModule } = NativeModules;

class WorkoutWidgetServiceClass {
    private module: WorkoutWidgetModuleInterface | null = null;

    constructor() {
        if (Platform.OS === 'android' && WorkoutWidgetModule) {
            this.module = WorkoutWidgetModule as WorkoutWidgetModuleInterface;
        }
    }

    isAvailable(): boolean {
        return this.module !== null;
    }

    updateWidget(
        workoutName: string,
        currentExercise: string,
        progress: number,
        completedSets: number,
        totalSets: number,
        elapsedTime: string,
        setsStatus: string,
        nextSetInfo: string,
        restTime: string,
        isResting: boolean
    ) {
        if (this.module) {
            try {
                this.module.updateWidget(
                    workoutName,
                    currentExercise,
                    progress,
                    completedSets,
                    totalSets,
                    elapsedTime,
                    setsStatus,
                    nextSetInfo,
                    restTime,
                    isResting
                );
            } catch (error) {
                console.warn('Failed to update workout widget:', error);
            }
        }
    }

    showNotification(
        workoutName: string,
        currentExercise: string,
        progress: number,
        completedSets: number,
        totalSets: number,
        elapsedTime: string,
        nextSetInfo: string,
        restTime: string,
        isResting: boolean
    ) {
        if (this.module) {
            try {
                this.module.showNotification(
                    workoutName,
                    currentExercise,
                    progress,
                    completedSets,
                    totalSets,
                    elapsedTime,
                    nextSetInfo,
                    restTime,
                    isResting
                );
            } catch (error) {
                console.warn('Failed to show workout notification:', error);
            }
        }
    }

    clearWidget() {
        if (this.module) {
            try {
                this.module.clearWidget();
            } catch (e) {
                console.error('Failed to clear widget', e);
            }
        }
    }

    addListener(callback: (event: string) => void) {
        if (Platform.OS === 'android') {
            return require('react-native').DeviceEventEmitter.addListener('WorkoutWidgetEvent', callback);
        }
        return { remove: () => { } };
    }
}

export const workoutWidgetService = new WorkoutWidgetServiceClass();
