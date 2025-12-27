"use client";

import { useState } from "react";
import HopinDashboard from "@/components/HopinDashboard";
import AppHeader from "@/components/AppHeader";
import StarfieldBackground from "@/components/LandingPage/StarfieldBackground";
import CreatePlanModal from "@/components/CreatePlanModal";
import { Plus } from "lucide-react";

export default function HopinDashboardPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    return (
        <div className="fixed inset-0 w-full h-full bg-black text-white flex flex-col font-sans overflow-hidden">
            <StarfieldBackground />

            <div className="relative z-20 flex-shrink-0">
                <AppHeader title="Hopin Dashboard" showBackButton />
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-0 w-full">
                <div className="max-w-6xl mx-auto w-full p-4 md:p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-bold">My Hopin Plans</h1>
                            <p className="text-neutral-400">Manage your hosted plans and check requests.</p>
                        </div>
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-neutral-200 transition-colors"
                        >
                            <Plus size={18} />
                            Create Plan
                        </button>
                    </div>

                    <HopinDashboard />
                </div>
            </div>

            <CreatePlanModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
        </div>
    );
}
