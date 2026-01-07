"use client";

import { useFormStatus } from "react-dom";
import { loginAdmin } from "../actions";
import { useState, useEffect } from "react";
import ScrollStarfield from "@/components/ScrollStarfield";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
        >
            {pending ? "Verifying..." : "Access Dashboard"}
        </button>
    );
}

export default function AdminLogin() {
    const [error, setError] = useState<string | null>(null);

    // Force black background for starfield
    useEffect(() => {
        const originalBg = document.body.style.background;
        document.body.style.background = '#000000';
        return () => {
            document.body.style.background = originalBg;
        };
    }, []);

    async function clientAction(formData: FormData) {
        const res = await loginAdmin(formData);
        if (res?.error) {
            setError(res.error);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <ScrollStarfield />
            <div className="w-full max-w-md relative z-10">
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-bold mb-2 text-white">Admin Access</h1>
                        <p className="text-neutral-300 text-sm">Restricted area. Authorized personnel only.</p>
                    </div>

                    <form action={clientAction} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium text-neutral-200">
                                Security Password
                            </label>
                            <input
                                type="password"
                                name="password"
                                id="password"
                                required
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-neutral-400"
                                placeholder="••••••••••••"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <SubmitButton />

                        <div className="text-center">
                            <a href="/" className="text-neutral-400 hover:text-white text-sm transition-colors">
                                Return to Home
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
