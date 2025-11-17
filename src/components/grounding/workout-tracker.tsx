"use client";

import React, { useState, useEffect } from "react";
import clsx from "clsx";
import WorkoutPlanManager from "./workout-plan";

type TrackerTab = "metrics" | "plans";

interface UserMetrics {
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: "male" | "female";
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active";
}

interface CalorieGoal {
  type: "maintain" | "lose_slow" | "lose_moderate" | "lose_aggressive" | "bulk_lean" | "bulk_muscle" | "lean_muscle" | "athletic";
  deficit?: number; // calories per day
  surplus?: number; // calories per day
}

interface BodyMetrics {
  bmi: number;
  bmr: number;
  tdee: number;
  goalCalories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
}

export default function WorkoutTracker() {
  const [activeTab, setActiveTab] = useState<TrackerTab>("metrics");
  const [metrics, setMetrics] = useState<UserMetrics>({
    height: 180,
    weight: 75,
    age: 25,
    gender: "male",
    activityLevel: "moderately_active",
  });

  const [goal, setGoal] = useState<CalorieGoal>({ type: "maintain" });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);

  // Calculate BMI
  const calculateBMI = (heightCm: number, weightKg: number) => {
    const heightM = heightCm / 100;
    return Number((weightKg / (heightM * heightM)).toFixed(1));
  };

  // Calculate BMR using Mifflin-St Jeor equation
  const calculateBMR = (heightCm: number, weightKg: number, age: number, gender: "male" | "female") => {
    if (gender === "male") {
      return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5);
    } else {
      return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161);
    }
  };

  // Calculate TDEE based on activity level
  const calculateTDEE = (bmr: number, activityLevel: string) => {
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extra_active: 1.9,
    };
    return Math.round(bmr * (multipliers[activityLevel] || 1.55));
  };

  // Calculate macro split based on goal
  const calculateMacros = (calories: number, goalType: string) => {
    let proteinPercent = 0.3;
    let carbsPercent = 0.4;
    let fatsPercent = 0.3;

    switch (goalType) {
      case "lose_slow":
      case "lose_moderate":
      case "lose_aggressive":
        proteinPercent = 0.35; // Higher protein for muscle preservation
        carbsPercent = 0.35;
        fatsPercent = 0.3;
        break;
      case "bulk_muscle":
      case "lean_muscle":
        proteinPercent = 0.3;
        carbsPercent = 0.45;
        fatsPercent = 0.25;
        break;
      case "athletic":
        proteinPercent = 0.25;
        carbsPercent = 0.5;
        fatsPercent = 0.25;
        break;
    }

    return {
      protein: Math.round((calories * proteinPercent) / 4),
      carbs: Math.round((calories * carbsPercent) / 4),
      fats: Math.round((calories * fatsPercent) / 9),
    };
  };

  // Update calculations whenever metrics or goal changes
  useEffect(() => {
    const bmi = calculateBMI(metrics.height, metrics.weight);
    const bmr = calculateBMR(metrics.height, metrics.weight, metrics.age, metrics.gender);
    const tdee = calculateTDEE(bmr, metrics.activityLevel);

    let goalCalories = tdee;
    if (goal.type === "maintain") {
      goalCalories = tdee;
    } else if (goal.type === "lose_slow") {
      goalCalories = tdee - 250;
    } else if (goal.type === "lose_moderate") {
      goalCalories = tdee - 500;
    } else if (goal.type === "lose_aggressive") {
      goalCalories = tdee - 750;
    } else if (goal.type === "bulk_lean") {
      goalCalories = tdee + 250;
    } else if (goal.type === "bulk_muscle") {
      goalCalories = tdee + 500;
    } else if (goal.type === "lean_muscle") {
      goalCalories = tdee;
    } else if (goal.type === "athletic") {
      goalCalories = tdee + 300;
    }

    const macros = calculateMacros(goalCalories, goal.type);

    setBodyMetrics({
      bmi,
      bmr,
      tdee,
      goalCalories,
      proteinG: macros.protein,
      carbsG: macros.carbs,
      fatsG: macros.fats,
    });
  }, [metrics, goal]);

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: "Underweight", color: "text-blue-600" };
    if (bmi < 25) return { label: "Normal", color: "text-green-600" };
    if (bmi < 30) return { label: "Overweight", color: "text-yellow-600" };
    return { label: "Obese", color: "text-red-600" };
  };

  const getCalorieDifference = () => {
    if (!bodyMetrics) return 0;
    return bodyMetrics.goalCalories - bodyMetrics.tdee;
  };

  const getWeightChangeInfo = () => {
    const caloriesDiff = getCalorieDifference();
    const weeklyChange = (caloriesDiff * 7) / 7700; // 7700 calories = 1kg
    const monthlyChange = weeklyChange * 4.3;
    const yearlyChange = weeklyChange * 52;

    return { weeklyChange, monthlyChange, yearlyChange };
  };

  const bmiCategory = bodyMetrics ? getBMICategory(bodyMetrics.bmi) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Workout & Fitness Tracker</h2>

        {/* Tabs */}
        <div className="flex gap-3 border-b border-gray-200 pb-4">
          <button
            onClick={() => setActiveTab("metrics")}
            className={clsx(
              "px-6 py-2.5 rounded-lg font-medium transition-all",
              activeTab === "metrics"
                ? "bg-black text-white"
                : "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"
            )}
          >
            Fitness Metrics
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={clsx(
              "px-6 py-2.5 rounded-lg font-medium transition-all",
              activeTab === "plans"
                ? "bg-black text-white"
                : "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"
            )}
          >
            Workout Plans
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "metrics" ? (
        <>
      {/* Metrics Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Metrics */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Metrics</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
            <input
              type="number"
              value={metrics.height}
              onChange={(e) => setMetrics({ ...metrics, height: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
            <input
              type="number"
              value={metrics.weight}
              onChange={(e) => setMetrics({ ...metrics, weight: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
              <input
                type="number"
                value={metrics.age}
                onChange={(e) => setMetrics({ ...metrics, age: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={metrics.gender}
                onChange={(e) => setMetrics({ ...metrics, gender: e.target.value as "male" | "female" })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activity Level</label>
            <select
              value={metrics.activityLevel}
              onChange={(e) => setMetrics({ ...metrics, activityLevel: e.target.value as UserMetrics["activityLevel"] })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            >
              <option value="sedentary">Sedentary (little to no exercise)</option>
              <option value="lightly_active">Lightly active (1-3 days/week)</option>
              <option value="moderately_active">Moderately active (3-5 days/week)</option>
              <option value="very_active">Very active (6-7 days/week)</option>
              <option value="extra_active">Extra active (2x per day / very intense)</option>
            </select>
          </div>
        </div>

        {/* Goals */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Goal</h3>

          <div className="space-y-3">
            {[
              { value: "maintain", label: "Maintain Weight" },
              { value: "lose_slow", label: "Lose Weight (0.25kg/week)" },
              { value: "lose_moderate", label: "Lose Weight (0.5kg/week)" },
              { value: "lose_aggressive", label: "Lose Weight (0.75kg/week)" },
              { value: "bulk_lean", label: "Lean Bulk (+0.25kg/week)" },
              { value: "bulk_muscle", label: "Muscle Bulk (+0.5kg/week)" },
              { value: "lean_muscle", label: "Lean Muscle (Maintenance)" },
              { value: "athletic", label: "Athletic Build" },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="goal"
                  value={option.value}
                  checked={goal.type === option.value}
                  onChange={(e) => setGoal({ type: e.target.value as CalorieGoal["type"] })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {bodyMetrics && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* BMI Card */}
            <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6">
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">BMI</h4>
              <div className={clsx("text-4xl font-bold mb-2", bmiCategory?.color)}>
                {bodyMetrics.bmi}
              </div>
              <p className={clsx("text-sm font-medium", bmiCategory?.color)}>
                {bmiCategory?.label}
              </p>
              <p className="text-xs text-gray-500 mt-2">Body Mass Index</p>
            </div>

            {/* BMR Card */}
            <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6">
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">BMR</h4>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {bodyMetrics.bmr}
              </div>
              <p className="text-xs text-gray-500">Calories at rest daily</p>
              <p className="text-xs text-gray-500 mt-2">Basal Metabolic Rate</p>
            </div>

            {/* TDEE Card */}
            <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6">
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">TDEE</h4>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {bodyMetrics.tdee}
              </div>
              <p className="text-xs text-gray-500">Daily energy expenditure</p>
              <p className="text-xs text-gray-500 mt-2">Total Daily Energy Expenditure</p>
            </div>
          </div>

          {/* Goal Calories & Weight Change */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">Goal Calories</h4>
              <div className="text-5xl font-bold text-gray-900">
                {bodyMetrics.goalCalories}
              </div>
              <p className="text-sm text-gray-600">
                {getCalorieDifference() > 0
                  ? `+${getCalorieDifference()} calories from TDEE`
                  : `${getCalorieDifference()} calories from TDEE`}
              </p>
            </div>

            {(() => {
              const { weeklyChange, monthlyChange, yearlyChange } = getWeightChangeInfo();
              return (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Projected Weight Change</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">
                      <span className="font-semibold">Weekly:</span> {weeklyChange > 0 ? "+" : ""}{weeklyChange.toFixed(2)} kg
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Monthly:</span> {monthlyChange > 0 ? "+" : ""}{monthlyChange.toFixed(1)} kg
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Yearly:</span> {yearlyChange > 0 ? "+" : ""}{yearlyChange.toFixed(0)} kg
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Macro Breakdown */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
            <h4 className="text-lg font-semibold text-gray-900">Macronutrient Breakdown</h4>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">{bodyMetrics.proteinG}g</div>
                <p className="text-sm text-gray-600">Protein</p>
                <p className="text-xs text-gray-500">4 cal/g</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">{bodyMetrics.carbsG}g</div>
                <p className="text-sm text-gray-600">Carbs</p>
                <p className="text-xs text-gray-500">4 cal/g</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">{bodyMetrics.fatsG}g</div>
                <p className="text-sm text-gray-600">Fats</p>
                <p className="text-xs text-gray-500">9 cal/g</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                Total: {bodyMetrics.proteinG * 4 + bodyMetrics.carbsG * 4 + bodyMetrics.fatsG * 9} calories
              </p>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        <WorkoutPlanManager />
      )}
    </div>
  );
}
