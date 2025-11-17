"use client";

import React, { useState } from "react";
import clsx from "clsx";

interface HealthCondition {
  id: string;
  type: "injury" | "illness" | "allergy" | "medication";
  name: string;
  date: string;
  notes: string;
  resolved: boolean;
}

interface FitnessGoal {
  type: string;
  createdAt: string;
}

interface NutrientRecommendation {
  nutrient: string;
  category: string;
  dailyValue: string;
  sources: string[];
  benefits: string;
  deficiencyRisks: string;
}

export default function HealthTracker() {
  const [healthHistory, setHealthHistory] = useState<HealthCondition[]>([
    {
      id: "1",
      type: "injury",
      name: "Lower back strain",
      date: "2024-08-15",
      notes: "Muscle strain from deadlifting. Resolved with rest and stretching.",
      resolved: true,
    },
  ]);

  const [newCondition, setNewCondition] = useState<Partial<HealthCondition>>({
    type: "injury",
    name: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    resolved: false,
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FitnessGoal>({
    type: "bulk_muscle",
    createdAt: new Date().toISOString(),
  });

  // Nutrient recommendations based on fitness goal
  const getNutrientRecommendations = (goalType: string): NutrientRecommendation[] => {
    const baseRecommendations: NutrientRecommendation[] = [
      {
        nutrient: "Protein",
        category: "Macronutrient",
        dailyValue: "1.6-2.2g per kg body weight",
        sources: ["Chicken", "Fish", "Eggs", "Greek yogurt", "Lean beef", "Legumes"],
        benefits: "Essential for muscle repair and recovery, supports immune function",
        deficiencyRisks: "Muscle weakness, slow recovery, weakened immunity",
      },
      {
        nutrient: "Carbohydrates",
        category: "Macronutrient",
        dailyValue: "3-7g per kg body weight",
        sources: ["Oats", "Rice", "Sweet potatoes", "Whole wheat", "Fruits", "Vegetables"],
        benefits: "Primary energy source for training, supports glycogen replenishment",
        deficiencyRisks: "Energy depletion, poor workout performance, fatigue",
      },
      {
        nutrient: "Healthy Fats",
        category: "Macronutrient",
        dailyValue: "0.5-1.5g per kg body weight",
        sources: ["Olive oil", "Avocado", "Nuts", "Fatty fish", "Seeds"],
        benefits: "Hormone production, nutrient absorption, inflammation reduction",
        deficiencyRisks: "Hormonal imbalances, dry skin, poor nutrient absorption",
      },
      {
        nutrient: "Vitamin D",
        category: "Micronutrient",
        dailyValue: "2000-4000 IU daily",
        sources: ["Fatty fish", "Egg yolks", "Sunlight exposure", "Fortified milk", "Supplements"],
        benefits: "Bone health, calcium absorption, immune function, mood regulation",
        deficiencyRisks: "Weak bones, poor calcium absorption, seasonal mood disorders",
      },
      {
        nutrient: "Iron",
        category: "Micronutrient",
        dailyValue: "8mg (M) / 18mg (F) daily",
        sources: ["Red meat", "Spinach", "Lentils", "Fortified cereals", "Tofu"],
        benefits: "Oxygen transport in blood, energy production, immune support",
        deficiencyRisks: "Anemia, fatigue, weakened immunity, poor workout recovery",
      },
      {
        nutrient: "Magnesium",
        category: "Micronutrient",
        dailyValue: "400-420mg (M) / 310-320mg (F)",
        sources: ["Almonds", "Spinach", "Pumpkin seeds", "Dark chocolate", "Avocado"],
        benefits: "Muscle function, energy production, sleep quality, stress reduction",
        deficiencyRisks: "Muscle cramps, insomnia, increased stress, weak recovery",
      },
      {
        nutrient: "Calcium",
        category: "Micronutrient",
        dailyValue: "1000-1200mg daily",
        sources: ["Dairy", "Leafy greens", "Fortified milk", "Almonds", "Tofu"],
        benefits: "Strong bones, muscle contraction, nerve function",
        deficiencyRisks: "Weak bones, muscle spasms, poor bone density",
      },
      {
        nutrient: "Zinc",
        category: "Micronutrient",
        dailyValue: "11mg (M) / 8mg (F) daily",
        sources: ["Oysters", "Beef", "Pumpkin seeds", "Chickpeas", "Cashews"],
        benefits: "Immune function, protein synthesis, testosterone production",
        deficiencyRisks: "Weakened immunity, slow wound healing, poor recovery",
      },
    ];

    if (
      goalType === "lose_slow" ||
      goalType === "lose_moderate" ||
      goalType === "lose_aggressive"
    ) {
      return baseRecommendations.map((r) => {
        if (r.nutrient === "Protein") {
          return {
            ...r,
            dailyValue: "2.0-2.4g per kg body weight (higher for muscle preservation)",
          };
        }
        return r;
      });
    }

    if (goalType === "bulk_muscle" || goalType === "lean_muscle") {
      return baseRecommendations.map((r) => {
        if (r.nutrient === "Protein") {
          return {
            ...r,
            dailyValue: "2.0-2.4g per kg body weight (max muscle growth)",
          };
        }
        if (r.nutrient === "Carbohydrates") {
          return {
            ...r,
            dailyValue: "5-10g per kg body weight (maximize training capacity)",
          };
        }
        return r;
      });
    }

    return baseRecommendations;
  };

  const addCondition = () => {
    if (newCondition.name && newCondition.type) {
      const condition: HealthCondition = {
        id: Date.now().toString(),
        type: newCondition.type as HealthCondition["type"],
        name: newCondition.name,
        date: newCondition.date || new Date().toISOString().split("T")[0],
        notes: newCondition.notes || "",
        resolved: newCondition.resolved || false,
      };
      setHealthHistory([...healthHistory, condition]);
      setNewCondition({ type: "injury", name: "", date: new Date().toISOString().split("T")[0], notes: "", resolved: false });
      setShowAddForm(false);
    }
  };

  const removeCondition = (id: string) => {
    setHealthHistory(healthHistory.filter((c) => c.id !== id));
  };

  const toggleConditionResolved = (id: string) => {
    setHealthHistory(
      healthHistory.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))
    );
  };

  const nutrients = getNutrientRecommendations(selectedGoal.type);
  const activeConditions = healthHistory.filter((c) => !c.resolved);
  const resolvedConditions = healthHistory.filter((c) => c.resolved);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Health & Nutrition Tracker</h2>
        <p className="text-gray-600">Track your health history and get personalized nutrition recommendations</p>
      </div>

      {/* Goal Selection */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Fitness Goal</h3>
        <div className="flex items-center gap-4">
          <select
            value={selectedGoal.type}
            onChange={(e) => setSelectedGoal({ ...selectedGoal, type: e.target.value })}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
          >
            <option value="maintain">Maintain Weight</option>
            <option value="lose_slow">Lose Weight (Slow)</option>
            <option value="lose_moderate">Lose Weight (Moderate)</option>
            <option value="lose_aggressive">Lose Weight (Aggressive)</option>
            <option value="bulk_lean">Lean Bulk</option>
            <option value="bulk_muscle">Muscle Bulk</option>
            <option value="lean_muscle">Lean Muscle</option>
            <option value="athletic">Athletic Build</option>
          </select>
          <p className="text-sm text-gray-600 min-w-fit">Set goal in Workout Tracker</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Health History */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Health History</h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 text-sm font-medium bg-black text-white rounded-lg hover:bg-black/90 transition-colors"
              >
                {showAddForm ? "Cancel" : "+ Add Entry"}
              </button>
            </div>

            {showAddForm && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 space-y-3">
                <select
                  value={newCondition.type}
                  onChange={(e) =>
                    setNewCondition({
                      ...newCondition,
                      type: e.target.value as HealthCondition["type"],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="injury">Injury</option>
                  <option value="illness">Illness</option>
                  <option value="allergy">Allergy</option>
                  <option value="medication">Medication</option>
                </select>

                <input
                  type="text"
                  placeholder="Name/Description"
                  value={newCondition.name || ""}
                  onChange={(e) => setNewCondition({ ...newCondition, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />

                <input
                  type="date"
                  value={newCondition.date || ""}
                  onChange={(e) => setNewCondition({ ...newCondition, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />

                <textarea
                  placeholder="Notes..."
                  value={newCondition.notes || ""}
                  onChange={(e) => setNewCondition({ ...newCondition, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                />

                <button
                  onClick={addCondition}
                  className="w-full px-3 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-medium"
                >
                  Add Entry
                </button>
              </div>
            )}

            {/* Active Conditions */}
            {activeConditions.length > 0 && (
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Active</h4>
                {activeConditions.map((condition) => (
                  <div key={condition.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{condition.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(condition.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={clsx(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        condition.type === "injury"
                          ? "bg-red-200 text-red-700"
                          : condition.type === "illness"
                          ? "bg-orange-200 text-orange-700"
                          : condition.type === "allergy"
                          ? "bg-yellow-200 text-yellow-700"
                          : "bg-purple-200 text-purple-700"
                      )}>
                        {condition.type.charAt(0).toUpperCase() + condition.type.slice(1)}
                      </span>
                    </div>
                    {condition.notes && (
                      <p className="text-sm text-gray-700 mb-3">{condition.notes}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleConditionResolved(condition.id)}
                        className="flex-1 px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                      >
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => removeCondition(condition.id)}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Resolved Conditions */}
            {resolvedConditions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Resolved</h4>
                {resolvedConditions.map((condition) => (
                  <div
                    key={condition.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 opacity-75"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-600 line-through">{condition.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(condition.date).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeCondition(condition.id)}
                        className="px-2 py-1 text-xs bg-gray-300 text-gray-700 hover:bg-gray-400 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sleep & Lifestyle Guidance */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Sleep Guidance</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Recommended Sleep Duration</p>
                <p className="text-lg font-bold text-gray-700 mt-1">7-9 hours per night</p>
                <p className="text-xs text-gray-600 mt-2">
                  Essential for muscle recovery, hormonal balance, and mental clarity
                </p>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <p className="text-sm font-medium text-gray-900 mb-2">Sleep Tips</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• Maintain consistent sleep/wake schedule</li>
                  <li>• Keep bedroom cool and dark</li>
                  <li>• Avoid screens 1 hour before bed</li>
                  <li>• Avoid caffeine 6+ hours before sleep</li>
                  <li>• Exercise during the day (not before bed)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Lifestyle Recommendations</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-medium text-gray-900 mb-1">Stress Management</p>
                <p className="text-xs">
                  Practice daily meditation or deep breathing. High stress reduces recovery and increases cortisol.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">Hydration</p>
                <p className="text-xs">
                  Drink 2.5-3.5L water daily. Increase intake on training days.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">Activity Level</p>
                <p className="text-xs">
                  Maintain consistent training. Add 10k steps daily for optimal health.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nutrient Recommendations */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900">Personalized Nutrient Recommendations</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {nutrients.map((nutrient, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{nutrient.nutrient}</h4>
                  <p className="text-xs text-gray-500">{nutrient.category}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Daily Value</p>
                <p className="text-sm text-gray-600">{nutrient.dailyValue}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Food Sources</p>
                <div className="flex flex-wrap gap-1">
                  {nutrient.sources.map((source, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      {source}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Benefits</p>
                <p className="text-xs text-gray-600">{nutrient.benefits}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-1 text-red-600">Deficiency Risks</p>
                <p className="text-xs text-gray-600">{nutrient.deficiencyRisks}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
