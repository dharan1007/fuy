"use client";

import React, { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChevronDown, Users, Zap, Flame, Clock, Target, TrendingUp, Bell, Check, X } from "lucide-react";
import { sendNotification } from "@/lib/notifications";

interface GymInvitation {
  id: string;
  from: string;
  workoutName: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: number;
  duration?: number;
  notes?: string;
  muscleGroup: string;
}

interface WorkoutSession {
  id: string;
  date: string;
  workoutName: string;
  exercises: ExerciseLog[];
  duration: number;
  completed: boolean;
  notes?: string;
  partnerId?: string;
  partnerName?: string;
  caloriesBurned?: number;
  intensity?: number;
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
  weight?: number;
  completed: boolean;
  rpe?: number;
  actualReps?: number;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  frequency: "3x" | "4x" | "5x" | "6x";
  duration: number;
  exercises: Exercise[];
  schedule: Record<string, string>;
  createdAt: string;
}

interface GymPartner {
  id: string;
  name: string;
  height: number;
  weight: number;
  avatar?: string;
  isActive?: boolean;
  currentWorkout?: string;
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
        { id: "1", name: "Bench Press", sets: 4, reps: "6-8", muscleGroup: "Chest" },
        { id: "2", name: "Incline Dumbbell Press", sets: 3, reps: "8-10", muscleGroup: "Chest" },
        { id: "3", name: "Barbell Rows", sets: 4, reps: "6-8", muscleGroup: "Back" },
      ],
      schedule: { Monday: "Push", Wednesday: "Pull", Friday: "Legs" },
      createdAt: new Date().toISOString(),
    },
  ]);

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [planInput, setPlanInput] = useState("");
  const [showGymPatModal, setShowGymPatModal] = useState(false);
  const [gymPartners, setGymPartners] = useState<GymPartner[]>([
    { id: "p1", name: "Alex Johnson", height: 180, weight: 75, isActive: false },
    { id: "p2", name: "Sarah Smith", height: 165, weight: 62, isActive: true },
    { id: "p3", name: "Mike Chen", height: 178, weight: 80, isActive: false },
  ]);
  const [selectedPartner, setSelectedPartner] = useState<GymPartner | null>(null);
  const [invitations, setInvitations] = useState<GymInvitation[]>([
    { id: "inv1", from: "Sarah Smith", workoutName: "Push/Pull/Legs", status: "pending", createdAt: new Date().toISOString() },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [restTimer, setRestTimer] = useState<{ exerciseIdx: number; setIdx: number; timeLeft: number } | null>(null);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  const [newPlan, setNewPlan] = useState<Partial<WorkoutPlan>>({
    name: "",
    description: "",
    frequency: "3x",
    duration: 12,
    exercises: [],
    schedule: {},
  });

  const parseWorkoutPlan = (input: string): Exercise[] => {
    const lines = input.split("\n").filter((line) => line.trim());
    const exercises: Exercise[] = [];
    let currentExercise: { name: string; sets: number; reps: string; weight?: number; muscleGroup: string } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      const exercisePattern =
        /^([^-\d]+?)(?:\s*[-ΓÇô]?\s*)?(\d+)\s*(?:x|sets?)\s*([\d\-x]+)\s*(?:reps?|@)?\s*(\d+(?:\.\d+)?)?(?:\s*(?:kg|lbs?|lb))?/i;
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

  const startWorkout = (plan: WorkoutPlan, partnerId?: string) => {
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
          reps: parseInt(ex.reps.split("-")[0]) || parseInt(ex.reps),
          weight: ex.weight,
          completed: false,
          rpe: 5,
          actualReps: 0,
        })),
      })),
      duration: 0,
      completed: false,
      partnerId,
      partnerName: partnerId ? gymPartners.find((p) => p.id === partnerId)?.name : undefined,
      caloriesBurned: 0,
      intensity: 0,
    };

    setActiveSession(session);
  };

  const completeSet = (exerciseIdx: number, setIdx: number, updated: SetLog) => {
    if (!activeSession) return;
    const updated_session = { ...activeSession };
    updated_session.exercises[exerciseIdx].setLogs[setIdx] = updated;

    const totalSets = updated_session.exercises.reduce((sum, ex) => sum + ex.setLogs.length, 0);
    const completedSets = updated_session.exercises.reduce((sum, ex) => sum + ex.setLogs.filter((s) => s.completed).length, 0);
    updated_session.intensity = Math.round((completedSets / totalSets) * 100);

    setActiveSession(updated_session);

    // Start rest timer if set is completed and not the last set
    if (updated.completed && setIdx < updated_session.exercises[exerciseIdx].setLogs.length - 1) {
      startRestTimer(exerciseIdx, setIdx, updated.rpe || 5);
    }
  };

  const finishWorkout = () => {
    if (!activeSession) return;
    const completedSession = {
      ...activeSession,
      completed: true,
      duration: Math.round(Math.random() * 60 + 30),
      caloriesBurned: Math.round(Math.random() * 300 + 200),
    };
    setSessions([...sessions, completedSession]);
    setActiveSession(null);
  };

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
    const totalCalories = last30Days.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);

    return { totalWorkouts, completionRate, avgDuration, totalCalories };
  };

  const getChartData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split("T")[0];
    });

    return last7Days.map((date) => {
      const daysSessions = sessions.filter((s) => s.date.startsWith(date));
      return {
        date: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        workouts: daysSessions.length,
        calories: daysSessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0),
        duration: daysSessions.reduce((sum, s) => sum + s.duration, 0),
      };
    });
  };

  const getMuscleGroupData = () => {
    const muscleGroups: Record<string, number> = {};
    sessions.forEach((session) => {
      session.exercises.forEach((ex) => {
        muscleGroups[ex.muscleGroup] = (muscleGroups[ex.muscleGroup] || 0) + 1;
      });
    });

    return Object.entries(muscleGroups).map(([name, value]) => ({ name, value }));
  };

  const metrics = getConsistencyMetrics();

  const COLORS = ["#000000", "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

  // Handle gym invitation
  const handleInvitationResponse = (invitationId: string, accepted: boolean) => {
    setInvitations((prev) =>
      prev.map((inv) =>
        inv.id === invitationId ? { ...inv, status: accepted ? "accepted" : "rejected" } : inv
      )
    );

    const invitation = invitations.find((inv) => inv.id === invitationId);
    if (invitation) {
      sendNotification(
        accepted ? "Invitation Accepted" : "Invitation Rejected",
        `You ${accepted ? "accepted" : "rejected"} ${invitation.from}'s invitation to workout together`,
        "invitation"
      );
    }
  };

  // Start rest timer after set completion
  const startRestTimer = (exerciseIdx: number, setIdx: number, rpe: number) => {
    // Calculate rest time based on RPE and exercise intensity
    const baseRest = 60; // 60 seconds
    const restMultiplier = rpe > 7 ? 1.5 : 1; // More rest for high intensity
    const restSeconds = Math.round(baseRest * restMultiplier);

    setRestTimer({ exerciseIdx, setIdx, timeLeft: restSeconds });

    // Emit to Pomodoro for sync (if integrated)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("workoutRestStarted", {
          detail: { duration: restSeconds, exercise: exerciseIdx, set: setIdx },
        })
      );
    }

    sendNotification("Rest Timer Started", `Take ${restSeconds}s rest before next set`, "reminder");
  };

  // Rest timer effect
  useEffect(() => {
    if (restTimer && restTimer.timeLeft > 0) {
      const interval = setTimeout(() => {
        setRestTimer((prev) => (prev ? { ...prev, timeLeft: prev.timeLeft - 1 } : null));
      }, 1000);

      return () => clearTimeout(interval);
    } else if (restTimer && restTimer.timeLeft === 0) {
      sendNotification("Rest Complete!", "Ready for next set?", "reminder");
      setRestTimer(null);
    }
  }, [restTimer]);

  if (activeSession) {
    return (
      <div className="space-y-6">
        {/* Rest Timer */}
        {restTimer && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white rounded-2xl px-8 py-4 shadow-lg">
            <p className="text-sm font-semibold text-blue-100">Rest Timer</p>
            <p className="text-4xl font-bold">{restTimer.timeLeft}s</p>
          </div>
        )}

        {/* Active Workout Header */}
        <div className="bg-gradient-to-r from-black to-gray-900 text-white rounded-2xl p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-4xl font-bold mb-2">{activeSession.workoutName}</h3>
              {activeSession.partnerName && (
                <p className="text-blue-300 flex items-center gap-2">
                  <Users size={16} /> Working out with {activeSession.partnerName}
                </p>
              )}
            </div>
            <button
              onClick={finishWorkout}
              className="px-8 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all hover:scale-105"
            >
              Finish Workout
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-bold">{activeSession.intensity}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-400 to-blue-500 h-full transition-all duration-500"
                style={{ width: `${activeSession.intensity}%` }}
              />
            </div>
          </div>
        </div>

        {/* Exercise Logs */}
        <div className="space-y-4">
          {activeSession.exercises.map((exercise, exIdx) => (
            <div key={exercise.exerciseId} className="bg-white border border-gray-200 rounded-2xl p-6 overflow-hidden">
              <div className="mb-4">
                <h4 className="text-2xl font-bold text-gray-900">{exercise.exerciseName}</h4>
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <Zap size={14} /> {exercise.muscleGroup}
                </p>
              </div>

              <div className="space-y-3">
                {exercise.setLogs.map((setLog, setIdx) => (
                  <div
                    key={setIdx}
                    className={clsx(
                      "p-4 rounded-xl border-2 transition-all",
                      setLog.completed
                        ? "bg-green-50 border-green-300 shadow-sm"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* Custom Checkbox */}
                      <label
                        className={clsx(
                          "flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all",
                          setLog.completed
                            ? "bg-green-500 border-green-600 shadow-lg shadow-green-200"
                            : "border-gray-300 hover:border-black"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={setLog.completed}
                          onChange={(e) => {
                            const updated = { ...setLog, completed: e.target.checked };
                            completeSet(exIdx, setIdx, updated);
                          }}
                          className="hidden"
                        />
                        {setLog.completed && <span className="text-white font-bold">Γ£ô</span>}
                      </label>

                      {/* Set Details */}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Set {setLog.setNumber}</div>
                        <div className="text-sm text-gray-600">
                          {setLog.actualReps || setLog.reps} reps
                          {setLog.weight && ` @ ${setLog.weight}kg`}
                        </div>
                      </div>

                      {/* RPE Slider */}
                      {setLog.completed && (
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-600">Difficulty:</span>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={setLog.rpe || 5}
                            onChange={(e) => {
                              const updated = { ...setLog, rpe: parseInt(e.target.value) };
                              completeSet(exIdx, setIdx, updated);
                            }}
                            className="w-24 cursor-pointer accent-green-500"
                          />
                          <span className="text-sm font-bold text-gray-900">{setLog.rpe}/10</span>
                        </div>
                      )}
                    </div>

                    {/* Weight Input */}
                    {!setLog.completed && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <label className="text-xs font-medium text-gray-600">Weight (kg)</label>
                        <input
                          type="number"
                          placeholder="Optional"
                          defaultValue={setLog.weight || ""}
                          onChange={(e) => {
                            const updated = { ...setLog, weight: e.target.value ? parseFloat(e.target.value) : undefined };
                            completeSet(exIdx, setIdx, updated);
                          }}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                        />
                      </div>
                    )}
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
      <div className="border-b border-gray-200 pb-6 flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2">Workout Plans</h2>
          <p className="text-gray-600">Create, manage, and track your workout routines with real-time partner collaboration</p>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
          >
            <Bell size={20} className="text-gray-900" />
            {invitations.filter((inv) => inv.status === "pending").length > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {invitations.filter((inv) => inv.status === "pending").length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
              <div className="p-4 border-b border-gray-200 font-semibold text-gray-900">
                Gym Invitations
              </div>

              {invitations.filter((inv) => inv.status === "pending").length > 0 ? (
                <div className="space-y-2 p-4">
                  {invitations
                    .filter((inv) => inv.status === "pending")
                    .map((inv) => (
                      <div key={inv.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                        <div>
                          <p className="font-semibold text-gray-900">{inv.from}</p>
                          <p className="text-sm text-gray-600">Invited you to: {inv.workoutName}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleInvitationResponse(inv.id, true);
                              setShowNotifications(false);
                            }}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                          >
                            <Check size={16} /> Accept
                          </button>
                          <button
                            onClick={() => {
                              handleInvitationResponse(inv.id, false);
                              setShowNotifications(false);
                            }}
                            className="flex-1 px-3 py-2 bg-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-400 transition-all flex items-center justify-center gap-2"
                          >
                            <X size={16} /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-600">
                  <p>No pending invitations</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-blue-900">Workouts</h4>
            <Zap size={20} className="text-blue-600" />
          </div>
          <div className="text-4xl font-bold text-blue-900">{metrics.totalWorkouts}</div>
          <p className="text-xs text-blue-700 mt-2">Last 30 days</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-green-900">Completion</h4>
            <Target size={20} className="text-green-600" />
          </div>
          <div className="text-4xl font-bold text-green-900">{metrics.completionRate}%</div>
          <p className="text-xs text-green-700 mt-2">Sessions finished</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-orange-900">Duration</h4>
            <Clock size={20} className="text-orange-600" />
          </div>
          <div className="text-4xl font-bold text-orange-900">{metrics.avgDuration}m</div>
          <p className="text-xs text-orange-700 mt-2">Average workout</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-red-900">Calories</h4>
            <Flame size={20} className="text-red-600" />
          </div>
          <div className="text-4xl font-bold text-red-900">{metrics.totalCalories}</div>
          <p className="text-xs text-red-700 mt-2">Total burned</p>
        </div>
      </div>

      {/* Charts Section */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity Chart */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={20} /> Weekly Activity
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                <Legend />
                <Bar dataKey="workouts" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="duration" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Muscle Group Distribution */}
          {getMuscleGroupData().length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Muscle Groups Targeted</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getMuscleGroupData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getMuscleGroupData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Gym Pat Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={24} /> Gym Partners
            </h3>
            <p className="text-gray-600 mt-1">Invite friends and workout together in real-time</p>
          </div>
          <button
            onClick={() => setShowGymPatModal(true)}
            className="px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-black/90 transition-all hover:scale-105"
          >
            + Find Gym Pat
          </button>
        </div>

        {/* Active Partners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gymPartners.filter((p) => p.isActive).length > 0 ? (
            gymPartners
              .filter((p) => p.isActive)
              .map((partner) => (
                <div key={partner.id} className="bg-white rounded-xl p-4 border-2 border-green-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{partner.name}</p>
                      <p className="text-xs text-green-600 font-medium">ΓùÅ Currently working out</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Height: {partner.height}cm | Weight: {partner.weight}kg</p>
                    {partner.currentWorkout && (
                      <p className="text-blue-600 font-medium">Doing: {partner.currentWorkout}</p>
                    )}
                  </div>
                </div>
              ))
          ) : (
            <p className="text-gray-600 col-span-full text-center py-4">No active partners right now</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setShowNewPlanForm(!showNewPlanForm)}
          className="px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-black/90 transition-all hover:scale-105"
        >
          {showNewPlanForm ? "Cancel" : "+ New Workout Plan"}
        </button>
      </div>

      {/* New Plan Form */}
      {showNewPlanForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Plan Name</label>
            <input
              type="text"
              placeholder="e.g., Push/Pull/Legs"
              value={newPlan.name || ""}
              onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              placeholder="Describe your workout plan"
              value={newPlan.description || ""}
              onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Paste Exercises</label>
            <textarea
              placeholder="Bench Press - 4x6-8&#10;Incline Press - 3x8-10&#10;Rows - 4x6-8"
              value={planInput}
              onChange={(e) => setPlanInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
              rows={4}
            />
          </div>

          <button
            onClick={() => {
              const exercises = parseWorkoutPlan(planInput);
              const plan: WorkoutPlan = {
                id: `plan-${Date.now()}`,
                name: newPlan.name || "New Plan",
                description: newPlan.description || "",
                frequency: newPlan.frequency || "3x",
                duration: newPlan.duration || 12,
                exercises: exercises.length > 0 ? exercises : [],
                schedule: {},
                createdAt: new Date().toISOString(),
              };
              if (exercises.length > 0) {
                setWorkoutPlans([...workoutPlans, plan]);
                setNewPlan({ name: "", description: "", frequency: "3x", duration: 12, exercises: [], schedule: {} });
                setPlanInput("");
                setShowNewPlanForm(false);
              }
            }}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all"
          >
            Create Plan
          </button>
        </div>
      )}

      {/* Workout Plans */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-900">Your Plans</h3>
        {workoutPlans.map((plan) => (
          <div key={plan.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
                <p className="text-gray-600">{plan.description}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {plan.frequency} per week
                  </span>
                  <span className="flex items-center gap-1">
                    <Target size={14} /> {plan.exercises.length} exercises
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startWorkout(plan)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
                >
                  Start
                </button>
                <button
                  onClick={() => {
                    setSelectedPartner(gymPartners[0]);
                    setShowGymPatModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <Users size={16} /> Invite Partner
                </button>
              </div>
            </div>

            {/* Exercises List */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-3">Exercises:</h5>
              <div className="space-y-2">
                {plan.exercises.map((ex) => (
                  <div key={ex.id} className="text-sm text-gray-700 flex justify-between">
                    <span>
                      {ex.name} - {ex.sets}x{ex.reps}
                    </span>
                    <span className="text-gray-600">{ex.muscleGroup}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">Recent Workouts</h3>
          <div className="space-y-2">
            {sessions.slice(-5).reverse().map((session) => (
              <div key={session.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{session.workoutName}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(session.date).toLocaleDateString()} ΓÇó {session.duration} min
                      {session.caloriesBurned && ` ΓÇó ${session.caloriesBurned} cal`}
                    </p>
                    {session.partnerName && (
                      <p className="text-sm text-blue-600 font-medium mt-1">Completed with {session.partnerName}</p>
                    )}
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-semibold ${session.completed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {session.completed ? "Completed" : "In Progress"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gym Pat Modal */}
      {showGymPatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Find Gym Partners</h3>

            <div className="space-y-4 mb-8">
              {gymPartners.map((partner) => (
                <div
                  key={partner.id}
                  className={clsx(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all",
                    selectedPartner?.id === partner.id
                      ? "border-black bg-black/5"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setSelectedPartner(partner)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
                      <div>
                        <p className="font-semibold text-gray-900">{partner.name}</p>
                        <p className="text-sm text-gray-600">
                          Height: {partner.height}cm | Weight: {partner.weight}kg
                        </p>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg ${partner.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {partner.isActive ? "ΓùÅ Active" : "Offline"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (selectedPartner) {
                    alert(`Invitation sent to ${selectedPartner.name}!`);
                    setShowGymPatModal(false);
                    setSelectedPartner(null);
                  }
                }}
                disabled={!selectedPartner}
                className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Invite to Workout
              </button>
              <button
                onClick={() => {
                  setShowGymPatModal(false);
                  setSelectedPartner(null);
                }}
                className="px-6 py-3 border border-gray-300 text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
