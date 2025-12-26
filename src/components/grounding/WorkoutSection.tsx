
"use client";

import { useState } from "react";

export default function WorkoutSection() {
    const [workouts, setWorkouts] = useState([
        { id: "1", name: "Push Day", completed: false, date: "2025-12-24" }
    ]);

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            {/* Calendar / Schedule View Placeholder */}
            <div className="bg-black border border-white/20 rounded-3xl p-6 h-[400px]">
                <h3 className="text-xl font-bold text-white mb-4">Schedule</h3>
                <div className="flex items-center justify-center h-full text-white/30">
                    <p>Calendar Visualization Coming Soon</p>
                </div>
            </div>

            {/* Workout List & Controls */}
            <div className="space-y-6">
                <div className="bg-black/50 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Today's Workout</h3>
                    {workouts.map(w => (
                        <div key={w.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                            <div>
                                <h4 className="text-white font-semibold">{w.name}</h4>
                                <p className="text-xs text-white/50">{w.date}</p>
                            </div>
                            <input type="checkbox" className="w-6 h-6 accent-white bg-transparent border-white/30 rounded" />
                        </div>
                    ))}

                    <button className="w-full mt-4 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors">
                        + Add Workout
                    </button>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h4 className="text-white font-semibold mb-2">Gym Pal</h4>
                    <p className="text-sm text-white/50">Find a buddy to train with.</p>
                    <button className="mt-3 px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors">
                        Find Partner
                    </button>
                </div>
            </div>
        </div>
    );
}
