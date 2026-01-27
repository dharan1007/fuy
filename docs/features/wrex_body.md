# Wrex (Grounding Body) Feature Documentation

## 1. Feature Overview
**Feature Name:** Wrex Body (Grounding)
**File Location:** `mobile/app/grounding.tsx`
**Primary Purpose:** A comprehensive health and fitness dashboard that visualizes the user's physical state, tracks workouts, manages diet, and monitors activity levels. It serves as the "Grounding" center for the user's physical "avatar" in the real world.

## 2. Visual Interface & Design
The screen uses a dark/monochrome aesthetic consistent with the "Fuy" design language.

### A. Layout Structure
- **Header:**
  - Title: "WREX BODY"
  - Subtitle: "Grounding"
  - Right Action: Settings/Menu icon (Three dots).
- **3D Body Visualization (The Core):**
  - A central visual element representing the human body.
  - Interactive nodes or regions allowing users to tap and log specific issues (soreness, injury) on body parts.
  - Rotatable/Zoomable canvas (implied by 3D nature).
- **Navigation Tabs:**
  - `DASHBOARD`: General overview.
  - `WORKOUT`: Exercise logs and routines.
  - `HEALTH`: Biometrics and vitals.
  - `ACTIVITY`: Steps, movement, and energy expenditure.
- **Content Area:** Scrollable view changing based on the selected tab.

### B. Typography & Colors
- **Fonts:** System fonts with specific weights (`fontCondensed` for numbers, `fontSerif` for headings, `fontMono` for labels).
- **Colors:**
  - Background: `MONO.black` / `MONO.gray900` (Dark Mode).
  - Accents: White text for high contrast.
  - Functional Colors:
    - Green (`#22c55e`): Success/Good metrics.
    - Red (`#ef4444`): Warnings/High heart rate/Issues.
    - Blue (`#3b82f6`): Neutral/Information.
    - Amber (`#f59e0b`): Caution/Moderate levels.

## 3. Tab Detailed Breakdown

### Tab 1: Dashboard
**Purpose:** High-level summary of the user's current status.
- **Key Metrics Display:**
  - **Recovery Score:** Percentage value (e.g., "85%") indicating readiness to train.
  - **Sleep Tracking:** Hours slept vs. goal.
  - **Hydration:** Water intake visualization.
- **Quick Actions:** Buttons to "Log Workout", "Add Meal", "Check-in".

### Tab 2: Workout
**Purpose:** Management of physical training.
- **Routine List:** List of active workout plans.
- **Session Logger:** Input fields for exercises, sets, reps, and weights.
- **History:** Calendar view or list of past workouts.
- **Progress Graphs:** Line charts showing strength increases or volume over time.

### Tab 3: Health
**Purpose:** Deep dive into biometric data.
- **Vitals Metrics:**
  - **BMR (Basal Metabolic Rate):** Calculated based on weight, height, age.
  - **BMI (Body Mass Index):** Auto-calculated from height/weight inputs.
  - **Heart Rate:** Resting and active heart variable.
- **Macronutrients:**
  - Breakdown of Protein, Carbs, and Fats targets vs. actuals.
  - Visualized as progress bars or donut charts.
- **Body Measurements:** Inputs for chest, waist, hips, arms, etc.

### Tab 4: Activity
**Purpose:** Daily movement tracking.
- **Steps:** Step counter synced (potentially with HealthKit/Google Fit in future).
- **Calories Burned:** Active vs. Resting energy.
- **Zone Minutes:** Time spent in different heart rate zones.

## 4. User Interactions & Logic

### A. calculating Biometrics
The component includes logic to automatically calculate health metrics when the user updates their profile data.
```typescript
// Pseudo-logic for BMR Calculation (Mifflin-St Jeor Equation)
const calculateBMR = (weight, height, age, gender) => {
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  return gender === 'male' ? bmr + 5 : bmr - 161;
}
```
**Inputs:**
- Weight (kg/lbs)
- Height (cm/ft)
- Age (years)
- Gender

### B. Interactive Body Map
- **Interaction:** Tap on specific body part (e.g., Left Knee).
- **Feedback:** "Add Note" modal appears.
- **Action:** User logs "Soreness - Level 5".
- **Visual Update:** The knee area highlights in Red/Orange to indicate status.

### C. Data Persistence
- **API Endpoints:**
  - `GET /api/wrex/summary`: Fetches dashboard stats.
  - `POST /api/wrex/workout`: Saves a new session.
  - `PUT /api/wrex/biometrics`: Updates weight/height.
- **Supabase Integration:**
  - Tables: `WorkoutSession`, `BiometricLog`, `HealthCondition`, `DietPlan`.

## 5. Technical Implementation Details

### Dependencies
- `react-native-safe-area-context` for layout.
- `lucide-react-native` for icons (`Activity`, `Heart`, `Dumbbell`, `Scale`).
- `expo-linear-gradient` for visual depth.
- `victory-native` (likely) for charts/graphs.

### State Management
- `activeTab`: String ('dashboard' | 'workout' | 'health' | 'activity').
- `biometrics`: Object storing weight, height, etc.
- `dailyStats`: Object storing steps, calories.
- `bodyNotes`: Array of notes attached to body coordinates.

### Components
1.  **`MetricCard`**: Reusable component for displaying a single stat (Label + Value + Trend).
2.  **`TabSelector`**: Custom pill-shaped tab switcher.
3.  **`BodyCanvas`**: The container for the 3D/2D body visualization.
4.  **`LogModal`**: Popup for entering data.

## 6. Edge Cases & Error Handling
- **Missing Data:** If user height/weight is not set, BMR/BMI displays "--" or prompts "Complete Profile".
- **Network Failure:** Offline mode caches the workout log locally (`AsyncStorage`) and syncs when online.
- **Zero State:** "No workouts logged yet" message with a clear CTA to start.

## 7. Future Roadmap (Inferred)
- **Wearable Integration:** Direct sync with Apple Watch/Oura Ring.
- **AI Coach:** "Wrex AI" suggesting workouts based on recovery score.
- **Social Challenge:** Competing with 'Bonds' on step counts.
