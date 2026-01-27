# Focus Mode Feature Documentation

## 1. Feature Overview
**Feature Name:** Focus (Productivity)
**File Location:** `mobile/app/focus.tsx`
**Primary Purpose:** A built-in productivity suite combining a Pomodoro-style timer, task management, and session analysis. It allows users to engage in "Deep Work" sessions directly within the app, discouraging context switching.

## 2. Visual Interface & Design

### A. Navigation & Layout
- **Safe Area:** Optimized for notch devices.
- **Header:**
    - Small Subtitle: "PRODUCTIVITY".
    - Main Title: "Focus".
- **Tab Switcher:** Three distinct views:
    1.  `TIMER`
    2.  `TASKS`
    3.  `ANALYSIS`

### B. View 1: Timer (The Core)
- **Phase Selector:** Buttons to toggle between `FOCUS` (Work), `SHORT` (Break), `LONG` (Break).
- **The Circle:**
    - Large 64px font countdown (e.g., "25:00").
    - Status Text: "RUNNING" or "PAUSED".
    - Visual Border: Indicated active state.
- **Controls:**
    - Large central Play/Pause button.
    - Smaller Reset button.
- **Intention Input:** A text field asking "What will you focus on?" which ties the session to a goal.
- **Stats Row:** Mini-dashboard showing "Today's Sessions" and "Total Minutes".
- **Cycle Indicator:** Visual dots representing how many Pomodoro cycles completed before a Long Break (e.g., 4 dots).

### C. View 2: Tasks
- **Input:** "Add a task..." field with a Plus button.
- **List:** Vertical scroll of to-do items.
    - **Item:** Checkbox (circle), Title, Delete icon.
    - **Interaction:** Tapping toggles strikethrough/completion.

### D. View 3: Analysis
- **Summary Cards:** "Last 7 Days" stats (Sessions, Minutes, Avg Quality).
- **Recent Sessions List:** History log.
    - Shows Intention (e.g., "Study Physics").
    - Star Rating (1-5).
    - Duration.

## 3. Review Logic (The "Quality" Metric)
When a session ends (timer hits 0), a **Review Modal** appears:
1.  **Prompt:** "How was your focus?"
2.  **Input:** 5-star rating system.
3.  **Action:** "Save Session".
This data feeds into the Analysis tab, allowing users to track not just *time* but *quality* of work.

## 4. Technical Implementation

### A. Timer Logic
- **`setInterval`:** Runs every 1000ms.
- **State:** `seconds` (integer).
- **Ref:** `timerRef` manages the interval ID to prevent leaks.
- **Background Execution:** (Note: React Native timers may pause in background; real production apps often use background tasks or timestamp comparison. This implementation seems simple/foreground focused).

### B. Data Persistence (Service Layer)
Relies on `FocusService` (imported utility):
- `getSettings()`: loads preferences (e.g., 25 vs 50 min work blocks).
- `saveSession()`: Persists the completed block to Supabase/AsyncStorage.
- `getTasks()`: Fetches the to-do list.

### C. Vibration & Toast
- **Feedback:** Uses `Vibration.vibrate([500, 200, 500])` pattern to alert user when time is up.
- **Toast:** Custom inline `Toast` component for success/error messages (e.g., "Task added").

## 5. Configuration (Settings)
Default settings defined in state:
```typescript
{
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesUntilLong: 4,
    targetPerDay: 4
}
```
Currently handled in local state/service, potentially editable in a detailed settings menu.

## 6. User Flows
1.  **Start a Session:**
    - User opens Focus.
    - Types Intention: "Coding Fuy App".
    - Hits Play.
    - Timer counts down.
2.  **During Session:**
    - User can switch to "Tasks" tab to check off items without stopping timer.
3.  **Completion:**
    - Timer ends -> Phone vibrates.
    - User rates focus "4 Stars".
    - App logs data -> Updates "Today" stats.
    - App suggests "Short Break".

## 7. Edge Cases
- **App Backgrounding:** If user leaves app, timer might pause (simple implementation limitation).
- **Screen Sleep:** `expo-keep-awake` might be needed (not seen in imports, potential improvement).
