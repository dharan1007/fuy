"use client";

import { useRouter } from "next/navigation";
import AIChatbot from "@/components/AIChatbot";

export default function ChatbotPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 overflow-hidden bg-black">

            {/* Background Elements (Stars/Gradient) */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black"></div>
                {/* Simple starfield effect */}
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
            </div>

            {/* Header / Back Button */}
            <header className="absolute top-6 left-6 z-20">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all backdrop-blur-md"
                >
                    <span>←</span>
                    <span className="text-sm font-medium">Dashboard</span>
                </button>
            </header>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-4xl animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-2">
                        Cognitive Space
                    </h1>
                    <p className="text-white/40 text-sm md:text-base">
                        A quiet place to think, feel, and grow.
                    </p>
                </div>

                <AIChatbot />
            </div>
        </main>
    );
}
