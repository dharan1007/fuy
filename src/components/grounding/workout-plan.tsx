"use client";

import React, { useState, useEffect } from "react";
import clsx from "clsx";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string; // "8-10" or "5x5" or "10-12 reps"
  weight?: number;
  duration?: number; // minutes for cardio
  notes?: string;
  muscleGroup: string;
}

interface WorkoutSession {
  id: string;
  date: string;
  workoutName: string;
  exercises: ExerciseLog[];
  duration: number; // minutes
  completed: boolean;
  notes?: string;
}

interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  setLogs: SetLog[];
}

interface SetLog {
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
  rpe?: number; // Rate of Perceived Exertion 1-10
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  frequency: "3x" | "4x" | "5x" | "6x"; // per week
  duration: number; // weeks
  exercises: Exercise[];
  schedule: Record<string, string>; // day -> "Push" | "Pull" | "Legs"
  createdAt: string;
}

export default function WorkoutPlanManager() {
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([
    {
      id: "1",
      name: "Push/Pull/Legs",
      description: "Classic 3-day split for muscle gain",
      frequency: "3x",
      duration: 12,
      exercises: [
        { id: "1", name: "Bench Press", sets: 4, reps: "6-8", weight: 100, muscleGroup: "Chest" },
        { id: "2", name: "Incline Dumbbell Press", sets: 3, reps: "8-10", weight: 35, muscleGroup: "Chest" },
        { id: "3", name: "Barbell Rows", sets: 4, reps: "6-8", weight: 120, muscleGroup: "Back" },
      ],
      schedule: { Monday: "Push", Wednesday: "Pull", Friday: "Legs" },
      createdAt: new Date().toISOString(),
    },
  ]);

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [planInput, setPlanInput] = useState("");
  const [newPlan, setNewPlan] = useState<Partial<WorkoutPlan>>({
    name: "",
    description: "",
    frequency: "3x",
    duration: 12,
    exercises: [],
    schedule: {},
  });

  // Parse workout plan from text input
  const parseWorkoutPlan = (input: string): Exercise[] => {
    const lines = input.split("\n").filter((line) => line.trim());
    const exercises: Exercise[] = [];
    let currentExercise: { name: string; sets: number; reps: string; weight?: number; muscleGroup: string } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Match patterns like "Bench Press - 4x6-8 @ 100kg" or "Bench Press 4 sets 6-8 reps 100 lbs"
      const exercisePattern =
        /^([^-\d]+?)(?:\s*[-–]?\s*)?(\d+)\s*(?:x|sets?)\s*([\d\-x]+)\s*(?:reps?|@)?\s*(\d+(?:\.\d+)?)?(?:\s*(?:kg|lbs?|lb))?/i;
      const match = trimmed.match(exercisePattern);

      if (match) {
        if (currentExercise) {
          exercises.push({
            id: `ex-${exercises.length}`,
            name: currentExercise.name,
            sets: currentExercise.sets,
            reps: currentExercise.reps,
            weight: currentExercise.weight,
            muscleGroup: currentExercise.muscleGroup,
          });
        }

        currentExercise = {
          name: match[1].trim(),
          sets: parseInt(match[2]),
          reps: match[3],
          weight: match[4] ? parseFloat(match[4]) : undefined,
          muscleGroup: "Other",
        };
      }
    }

    if (currentExercise) {
      exercises.push({
        id: `ex-${exercises.length}`,
        name: currentExercise.name,
        sets: currentExercise.sets,
        reps: currentExercise.reps,
        weight: currentExercise.weight,
        muscleGroup: currentExercise.muscleGroup,
      });
    }

    return exercises;
  };

  const startWorkout = (plan: WorkoutPlan) => {
    const session: WorkoutSession = {
      id: `session-${Date.now()}`,
      date: new Date().toISOString(),
      workoutName: plan.name,
      exercises: plan.exercises.map((ex) => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroup: ex.muscleGroup,
        setLogs: Array.from({ length: ex.sets }, (_, i) => ({
          setNumber: i + 1,
          reps: parseInt(ex.reps.split("-")[1] || ex.reps.split("x")[1] || "10"),
          weight: ex.weight || 0,
          completed: false,
          rpe: 5,
        })),
      })),
      duration: 0,
      completed: false,
    };
    setActiveSession(session);
  };

  const completeSet = (exerciseIdx: number, setIdx: number, log: SetLog) => {
    if (!activeSession) return;
    const updated = { ...activeSession };
    updated.exercises[exerciseIdx].setLogs[setIdx] = { ...log, completed: true };
    setActiveSession(updated);
  };

  const finishWorkout = () => {
    if (!activeSession) return;
    const completed = {
      ...activeSession,
      completed: true,
      duration: Math.round((Date.now() - new Date(activeSession.date).getTime()) / 60000),
    };
    setSessions([...sessions, completed]);
    setActiveSession(null);
  };

  const addCustomPlan = () => {
    if (!newPlan.name) return;

    const exercises = planInput ? parseWorkoutPlan(planInput) : (newPlan.exercises || []);

    const plan: WorkoutPlan = {
      id: `plan-${Date.now()}`,
      name: newPlan.name!,
      description: newPlan.description || "",
      frequency: newPlan.frequency || "3x",
      duration: newPlan.duration || 12,
      exercises,
      schedule: newPlan.schedule || {},
      createdAt: new Date().toISOString(),
    };

    setWorkoutPlans([...workoutPlans, plan]);
    setShowNewPlanForm(false);
    setPlanInput("");
    setNewPlan({ name: "", description: "", frequency: "3x", duration: 12, exercises: [], schedule: {} });
  };

  // Calculate consistency metrics
  const getConsistencyMetrics = () => {
    const last30Days = sessions.filter((s) => {
      const sessionDate = new Date(s.date);
      const now = new Date();
      const daysDiff = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    });

    const totalWorkouts = last30Days.length;
    const completionRate = last30Days.length > 0 ? Math.round((last30Days.filter((s) => s.completed).length / totalWorkouts) * 100) : 0;
    const avgDuration = last30Days.length > 0 ? Math.round(last30Days.reduce((sum, s) => sum + s.duration, 0) / last30Days.length) : 0;

    return { totalWorkouts, completionRate, avgDuration };
  };

  const metrics = getConsistencyMetrics();

  if (activeSession) {
    return (
      <div className="space-y-6">
        {/* Active Workout Session */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-3xl font-bold text-gray-900">{activeSession.workoutName}</h3>
            <button
              onClick={finishWorkout}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Finish Workout
            </button>
          </div>
          <p className="text-gray-600">
            Completed: {activeSession.exercises.reduce((sum, ex) => sum + ex.setLogs.filter((s) => s.completed).length, 0)} /{" "}
            {activeSession.exercises.reduce((sum, ex) => sum + ex.setLogs.length, 0)} sets
          </p>
        </div>

        {/* Exercise Logs */}
        <div className="space-y-6">
          {activeSession.exercises.map((exercise, exIdx) => (
            <div key={exercise.exerciseId} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <div>
                <h4 className="text-xl font-semibold text-gray-900">{exercise.exerciseName}</h4>
                <p className="text-sm text-gray-600">{exercise.muscleGroup}</p>
              </div>

              <div className="space-y-3">
                {exercise.setLogs.map((setLog, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Set {setLog.setNumber}: {setLog.reps} reps @ {setLog.weight}kg
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={setLog.completed}
                            onChange={(e) => {
                              const updated = { ...setLog, completed: e.target.checked };
                              completeSet(exIdx, setIdx, updated);
                            }}
                            className="w-5 h-5"
                          />
                          <span className="text-sm text-gray-700">Completed</span>
                        </label>

                        {setLog.completed && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">RPE:</label>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={setLog.rpe || 5}
                              onChange={(e) => {
                                const updated = { ...setLog, rpe: parseInt(e.target.value) };
                                completeSet(exIdx, setIdx, updated);
                              }}
                              className="w-32"
                            />
                            <span className="text-sm font-medium text-gray-700">{setLog.rpe}/10</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Workout Plans</h2>
        <p className="text-gray-600">Create, manage, and track your workout routines</p>
      </div>

      {/* Consistency Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Last 30 Days</h4>
          <div className="text-4xl font-bold text-gray-900">{metrics.totalWorkouts}</div>
          <p className="text-xs text-gray-600 mt-2">Workouts Completed</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Completion Rate</h4>
          <div className="text-4xl font-bold text-gray-900">{metrics.completionRate}%</div>
          <p className="text-xs text-gray-600 mt-2">Sessions Finished</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Avg Duration</h4>
          <div className="text-4xl font-bold text-gray-900">{metrics.avgDuration}min</div>
          <p className="text-xs text-gray-600 mt-2">Per Workout</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setShowNewPlanForm(!showNewPlanForm)}
          className="px-6 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-black/90 transition-colors"
        >
          {showNewPlanForm ? "Cancel" : "+ New Workout Plan"}
        </button>
      </div>

      {/* New Plan Form */}
      {showNewPlanForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plan Name</label>
            <input
              type="text"
              placeholder="e.g., Push/Pull/Legs"
              value={newPlan.name || ""}
              onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input
              type="text"
              placeholder="e.g., 3-day split for muscle gain"
              value={newPlan.description || ""}
              onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Workout Exercises (paste or type)</label>
            <textarea
              placeholder="Examples:&#10;Bench Press - 4x6-8 @ 100kg&#10;Incline Dumbbell Press - 3x8-10 @ 35kg&#10;Barbell Rows - 4x6-8 @ 120kg&#10;&#10;Or any format and we'll parse it!"
              value={planInput}
              onChange={(e) => setPlanInput(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <select
                value={newPlan.frequency || "3x"}
                onChange={(e) => setNewPlan({ ...newPlan, frequency: e.target.value as WorkoutPlan["frequency"] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
              >
                <option value="3x">3 days/week</option>
                <option value="4x">4 days/week</option>
                <option value="5x">5 days/week</option>
                <option value="6x">6 days/week</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (weeks)</label>
              <input
                type="number"
                min="1"
                max="52"
                value={newPlan.duration || 12}
                onChange={(e) => setNewPlan({ ...newPlan, duration: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>
          </div>

          <button
            onClick={addCustomPlan}
            className="w-full px-4 py-3 bg-black text-white rounded-lg font-medium hover:bg-black/90 transition-colors"
          >
            Create Workout Plan
          </button>
        </div>
      )}

      {/* Existing Plans */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-900">Available Workout Plans</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workoutPlans.map((plan) => (
            <div key={plan.id} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <div>
                <h4 className="text-xl font-semibold text-gray-900">{plan.name}</h4>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Frequency:</span> {plan.frequency} per week
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Duration:</span> {plan.duration} weeks
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Exercises:</span> {plan.exercises.length}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h5 className="text-sm font-semibold text-gray-900 mb-2">Exercises:</h5>
                <ul className="space-y-1 text-xs text-gray-600">
                  {plan.exercises.slice(0, 3).map((ex) => (
                    <li key={ex.id}>
                      • {ex.name} - {ex.sets}x{ex.reps} {ex.weight ? `@ ${ex.weight}kg` : ""}
                    </li>
                  ))}
                  {plan.exercises.length > 3 && <li className="italic">+ {plan.exercises.length - 3} more</li>}
                </ul>
              </div>

              <button
                onClick={() => startWorkout(plan)}
                className="w-full px-4 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-black/90 transition-colors"
              >
                Start Workout
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Past Sessions */}
      {sessions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">Workout History</h3>

          <div className="space-y-3">
            {sessions
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 10)
              .map((session) => (
                <div key={session.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{session.workoutName}</p>
                      <p className="text-xs text-gray-600">{new Date(session.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{session.duration} min</p>
                      <span
                        className={clsx(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          session.completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        )}
                      >
                        {session.completed ? "Completed" : "Incomplete"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-600">
                    {session.exercises.reduce((sum, ex) => sum + ex.setLogs.filter((s) => s.completed).length, 0)} /{" "}
                    {session.exercises.reduce((sum, ex) => sum + ex.setLogs.length, 0)} sets completed
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
