
"use client";

import { useState } from "react";

export default function DietSection() {
    // Simple mock state for demonstration. 
    // In a real app, this would be computed based on profile goals.
    const [activePlan, setActivePlan] = useState("Balanced");

    return (
        <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
            <div className="bg-black border border-white/20 rounded-3xl p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    Nutrition Plan
                    <span className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded ml-auto">
                        Based on your goal
                    </span>
                </h3>

                {/* Macro Split Visualization (Mock) */}
                <div className="flex gap-4 mb-8">
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-xs text-white/70">
                            <span>Protein</span>
                            <span>150g</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 w-[35%]" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-xs text-white/70">
                            <span>Carbs</span>
                            <span>200g</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 w-[45%]" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-xs text-white/70">
                            <span>Fats</span>
                            <span>60g</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 w-[20%]" />
                        </div>
                    </div>
                </div>

                {/* Doctor Consult Warning */}
                <div className="bg-red-900/10 border border-red-500/30 rounded-xl p-4 mb-6 flex gap-4 items-start">
                    <span className="text-2xl">🩺</span>
                    <div>
                        <h4 className="text-sm font-bold text-red-200">Medical Disclaimer</h4>
                        <p className="text-xs text-red-200/70 mt-1">
                            Always consult a physician before starting any extreme diet plan.
                            These recommendations are estimates based on general metabolic formulas.
                        </p>
                    </div>
                </div>

                {/* Meal Suggestion Table (Mock) */}
                <h4 className="text-white font-semibold mb-3">Recommended Foods</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-white/80">
                        <thead className="bg-white/10 text-white">
                            <tr>
                                <th className="p-3 rounded-l-lg">Food Item</th>
                                <th className="p-3">Qty</th>
                                <th className="p-3">Benefits</th>
                                <th className="p-3 rounded-r-lg">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <tr>
                                <td className="p-3">Chicken Breast</td>
                                <td className="p-3">200g</td>
                                <td className="p-3 text-green-300">High lean protein</td>
                                <td className="p-3 text-white/50">Grill or bake.</td>
                            </tr>
                            <tr>
                                <td className="p-3">Brown Rice</td>
                                <td className="p-3">1 cup</td>
                                <td className="p-3 text-blue-300">Complex carbs</td>
                                <td className="p-3 text-white/50">Good pre-workout.</td>
                            </tr>
                            <tr>
                                <td className="p-3">Spinach</td>
                                <td className="p-3">Unlimited</td>
                                <td className="p-3 text-yellow-300">Iron & Vitamins</td>
                                <td className="p-3 text-white/50">Deficiency may cause fatigue.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sidebar Actions */}
            <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h4 className="text-white font-semibold mb-2">Generate Plan</h4>
                    <p className="text-sm text-white/50 mb-4">Create a new routine or diet cycle.</p>
                    <button className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors">
                        Auto-Generate
                    </button>
                    <button className="w-full mt-3 py-3 bg-transparent border border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-colors">
                        Generate Workout for Diet
                    </button>
                </div>
            </div>
        </div>
    );
}
