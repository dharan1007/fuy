
"use client";

import { useEffect, useState } from "react";

type HealthData = {
    conditions: any[];
    profile: {
        height?: number;
        weight?: number;
        dob?: string;
        gender?: string;
    } | null;
};

export default function HealthSection() {
    const [data, setData] = useState<HealthData | null>(null);
    const [bmi, setBmi] = useState<number | null>(null);
    const [goal, setGoal] = useState<"maintain" | "lose" | "gain">("maintain");

    useEffect(() => {
        fetch("/api/grounding/health")
            .then(res => res.json())
            .then(d => {
                setData(d);
                if (d.profile?.height && d.profile?.weight) {
                    const hM = d.profile.height / 100;
                    setBmi(d.profile.weight / (hM * hM));
                }
            })
            .catch(console.error);
    }, []);

    const getBmiLabel = (v: number) => {
        if (v < 18.5) return { text: "Underweight", color: "text-blue-400" };
        if (v < 25) return { text: "Normal", color: "text-green-400" };
        if (v < 30) return { text: "Overweight", color: "text-yellow-400" };
        return { text: "Obese", color: "text-red-400" };
    };

    const bmiInfo = bmi ? getBmiLabel(bmi) : null;

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            {/* Metrics Card */}
            <div className="bg-black border border-white/20 rounded-3xl p-6 relative overflow-hidden">
                <h3 className="text-xl font-bold text-white mb-6">Metrics & Analysis</h3>

                <div className="flex gap-4 mb-8">
                    <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                        <div className="text-xs text-white/50 uppercase tracking-widest mb-1">Height</div>
                        <div className="text-2xl font-mono text-white">
                            {data?.profile?.height ? `${data.profile.height} cm` : "--"}
                        </div>
                    </div>
                    <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                        <div className="text-xs text-white/50 uppercase tracking-widest mb-1">Weight</div>
                        <div className="text-2xl font-mono text-white">
                            {data?.profile?.weight ? `${data.profile.weight} kg` : "--"}
                        </div>
                    </div>
                </div>

                {bmi ? (
                    <div className="text-center bg-white/5 border border-white/10 rounded-2xl p-6">
                        <div className="text-xs text-white/50 uppercase tracking-widest mb-1">BMI Score</div>
                        <div className="text-5xl font-bold text-white mb-2">{bmi.toFixed(1)}</div>
                        <div className={`text-lg font-medium ${bmiInfo?.color}`}>{bmiInfo?.text}</div>
                    </div>
                ) : (
                    <div className="text-center text-white/30 py-8">
                        Update your profile to see key metrics.
                    </div>
                )}
            </div>

            {/* Goals & History */}
            <div className="space-y-6">
                <div className="bg-black/50 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Goals</h3>
                    <div className="flex gap-2 p-1 bg-white/10 rounded-xl mb-4">
                        {(["lose", "maintain", "gain"] as const).map(g => (
                            <button
                                key={g}
                                onClick={() => setGoal(g)}
                                className={`flex-1 py-3 text-sm font-semibold rounded-lg capitalize transition-all ${goal === g
                                        ? "bg-white text-black shadow-lg"
                                        : "text-white/50 hover:text-white"
                                    }`}
                            >
                                {g} Weight
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h4 className="text-white font-semibold mb-3">Health Conditions</h4>
                    {data?.conditions?.length ? (
                        <ul className="space-y-2">
                            {data.conditions.map((c: any) => (
                                <li key={c.id} className="text-sm text-white/70 flex justify-between">
                                    <span>{c.name}</span>
                                    <span className="opacity-50">{new Date(c.date).toLocaleDateString()}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-white/30">No recorded conditions.</p>
                    )}
                    <button className="mt-4 text-xs text-white/50 hover:text-white underline">
                        + Add Record
                    </button>
                </div>
            </div>
        </div>
    );
}
