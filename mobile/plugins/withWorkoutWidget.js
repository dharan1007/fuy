const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withWorkoutWidget = (config) => {
    // 1. Add widget receiver and service to AndroidManifest
    config = withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;
        const application = androidManifest.manifest.application[0];

        // Add widget provider receiver
        if (!application.receiver) {
            application.receiver = [];
        }

        const hasWidgetReceiver = application.receiver.some(
            r => r.$['android:name'] === '.widget.WorkoutWidgetProvider'
        );

        if (!hasWidgetReceiver) {
            application.receiver.push({
                $: {
                    'android:name': '.widget.WorkoutWidgetProvider',
                    'android:exported': 'true',
                    'android:label': 'FUY Workout Widget',
                },
                'intent-filter': [
                    {
                        action: [
                            { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
                            { $: { 'android:name': 'com.fuy.app.WORKOUT_UPDATE' } },
                        ],
                    },
                ],
                'meta-data': [
                    {
                        $: {
                            'android:name': 'android.appwidget.provider',
                            'android:resource': '@xml/workout_widget_info',
                        },
                    },
                ],
            });
        }

        return config;
    });

    // 2. Create widget resources using dangerous mod
    config = withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const androidResPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
            const androidJavaPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'fuy', 'app', 'widget');

            // Create directories
            const xmlDir = path.join(androidResPath, 'xml');
            const layoutDir = path.join(androidResPath, 'layout');

            if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir, { recursive: true });
            if (!fs.existsSync(layoutDir)) fs.mkdirSync(layoutDir, { recursive: true });
            if (!fs.existsSync(androidJavaPath)) fs.mkdirSync(androidJavaPath, { recursive: true });

            // Widget info XML
            const widgetInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:minResizeWidth="110dp"
    android:minResizeHeight="40dp"
    android:maxResizeWidth="530dp"
    android:maxResizeHeight="400dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:initialLayout="@layout/workout_widget_layout"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen|keyguard"
    android:widgetFeatures="reconfigurable"
    android:previewLayout="@layout/workout_widget_layout"
    android:description="@string/widget_description" />`;

            fs.writeFileSync(path.join(xmlDir, 'workout_widget_info.xml'), widgetInfoXml);

            // Widget layout XML - Dark themed card style
            const widgetLayoutXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="12dp"
    android:background="@drawable/widget_background">

    <!-- Header -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">
        
        <TextView
            android:id="@+id/workout_title"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="No Active Workout"
            android:textColor="#FFFFFF"
            android:textSize="16sp"
            android:textStyle="bold"
            android:maxLines="1"
            android:ellipsize="end" />
        
        <TextView
            android:id="@+id/workout_timer"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="00:00"
            android:textColor="#888888"
            android:textSize="12sp"
            android:fontFamily="monospace" />
    </LinearLayout>

    <!-- Progress Bar -->
    <ProgressBar
        android:id="@+id/workout_progress"
        style="@android:style/Widget.ProgressBar.Horizontal"
        android:layout_width="match_parent"
        android:layout_height="6dp"
        android:layout_marginTop="8dp"
        android:layout_marginBottom="8dp"
        android:max="100"
        android:progress="0"
        android:progressTint="#FFFFFF"
        android:progressBackgroundTint="#333333" />

    <!-- Current Exercise -->
    <TextView
        android:id="@+id/current_exercise"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Tap to start workout"
        android:textColor="#CCCCCC"
        android:textSize="14sp"
        android:maxLines="1"
        android:ellipsize="end" />

    <!-- Sets Container -->
    <LinearLayout
        android:id="@+id/sets_container"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:orientation="horizontal"
        android:gravity="center_vertical" />

    <!-- Stats Row -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:orientation="horizontal"
        android:gravity="center_vertical">
        
        <TextView
            android:id="@+id/sets_completed"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="0/0 sets"
            android:textColor="#888888"
            android:textSize="11sp" />
        
        <TextView
            android:id="@+id/progress_percent"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="0%"
            android:textColor="#FFFFFF"
            android:textSize="12sp"
            android:textStyle="bold" />
    </LinearLayout>
</LinearLayout>`;

            fs.writeFileSync(path.join(layoutDir, 'workout_widget_layout.xml'), widgetLayoutXml);

            // Widget background drawable
            const drawableDir = path.join(androidResPath, 'drawable');
            if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });

            const widgetBackgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#1A1A1A" />
    <corners android:radius="16dp" />
    <stroke
        android:width="1dp"
        android:color="#333333" />
</shape>`;

            fs.writeFileSync(path.join(drawableDir, 'widget_background.xml'), widgetBackgroundXml);

            // Kotlin Widget Provider
            const widgetProviderKt = `package com.fuy.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.fuy.app.R
import com.fuy.app.MainActivity

class WorkoutWidgetProvider : AppWidgetProvider() {
    
    companion object {
        const val ACTION_WORKOUT_UPDATE = "com.fuy.app.WORKOUT_UPDATE"
        const val EXTRA_WORKOUT_NAME = "workout_name"
        const val EXTRA_CURRENT_EXERCISE = "current_exercise"
        const val EXTRA_PROGRESS = "progress"
        const val EXTRA_COMPLETED_SETS = "completed_sets"
        const val EXTRA_TOTAL_SETS = "total_sets"
        const val EXTRA_ELAPSED_TIME = "elapsed_time"
        const val EXTRA_SETS_STATUS = "sets_status"
        
        fun updateWidget(context: Context, workoutName: String, currentExercise: String, 
                        progress: Int, completedSets: Int, totalSets: Int, 
                        elapsedTime: String, setsStatus: String) {
            val intent = Intent(context, WorkoutWidgetProvider::class.java).apply {
                action = ACTION_WORKOUT_UPDATE
                putExtra(EXTRA_WORKOUT_NAME, workoutName)
                putExtra(EXTRA_CURRENT_EXERCISE, currentExercise)
                putExtra(EXTRA_PROGRESS, progress)
                putExtra(EXTRA_COMPLETED_SETS, completedSets)
                putExtra(EXTRA_TOTAL_SETS, totalSets)
                putExtra(EXTRA_ELAPSED_TIME, elapsedTime)
                putExtra(EXTRA_SETS_STATUS, setsStatus)
            }
            context.sendBroadcast(intent)
        }
    }
    
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId, null)
        }
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        if (intent.action == ACTION_WORKOUT_UPDATE) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, WorkoutWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            
            for (appWidgetId in appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId, intent)
            }
        }
    }
    
    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, 
                                appWidgetId: Int, intent: Intent?) {
        val views = RemoteViews(context.packageName, R.layout.workout_widget_layout)
        
        // Get data from intent or use defaults
        val workoutName = intent?.getStringExtra(EXTRA_WORKOUT_NAME) ?: "No Active Workout"
        val currentExercise = intent?.getStringExtra(EXTRA_CURRENT_EXERCISE) ?: "Tap to start workout"
        val progress = intent?.getIntExtra(EXTRA_PROGRESS, 0) ?: 0
        val completedSets = intent?.getIntExtra(EXTRA_COMPLETED_SETS, 0) ?: 0
        val totalSets = intent?.getIntExtra(EXTRA_TOTAL_SETS, 0) ?: 0
        val elapsedTime = intent?.getStringExtra(EXTRA_ELAPSED_TIME) ?: "00:00"
        
        // Update views
        views.setTextViewText(R.id.workout_title, workoutName)
        views.setTextViewText(R.id.workout_timer, elapsedTime)
        views.setTextViewText(R.id.current_exercise, currentExercise)
        views.setProgressBar(R.id.workout_progress, 100, progress, false)
        views.setTextViewText(R.id.sets_completed, "\$completedSets/\$totalSets sets")
        views.setTextViewText(R.id.progress_percent, "\$progress%")
        
        // Click to open app
        val openIntent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, openIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    override fun onEnabled(context: Context) {
        // Widget first enabled
    }
    
    override fun onDisabled(context: Context) {
        // Last widget removed
    }
}`;

            fs.writeFileSync(path.join(androidJavaPath, 'WorkoutWidgetProvider.kt'), widgetProviderKt);

            // Add string resource for widget description
            const valuesDir = path.join(androidResPath, 'values');
            const stringsPath = path.join(valuesDir, 'strings.xml');

            if (fs.existsSync(stringsPath)) {
                let stringsContent = fs.readFileSync(stringsPath, 'utf8');
                if (!stringsContent.includes('widget_description')) {
                    stringsContent = stringsContent.replace(
                        '</resources>',
                        '    <string name="widget_description">Track your workout progress</string>\n</resources>'
                    );
                    fs.writeFileSync(stringsPath, stringsContent);
                }
            } else {
                const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">FUY</string>
    <string name="widget_description">Track your workout progress</string>
</resources>`;
                fs.writeFileSync(stringsPath, stringsXml);
            }

            return config;
        },
    ]);

    return config;
};

module.exports = withWorkoutWidget;
