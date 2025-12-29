"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import ScrollStarfield from "@/components/ScrollStarfield";

// Force black background for starfield
function StarfieldBackground() {
    useEffect(() => {
        const originalBg = document.body.style.background;
        document.body.style.background = '#000000';
        return () => {
            document.body.style.background = originalBg;
        };
    }, []);
    return <ScrollStarfield />;
}

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        // Handle Implicit Flow (Hash Fragment)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const errorDescHash = hashParams.get("error_description");

        // Handle PKCE Flow (Query Params) - Fallback/Legacy
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");
        const errorDescQuery = searchParams.get("error_description");

        const errorMsg = errorDescHash || errorDescQuery || errorParam;

        if (errorMsg) {
            setStatus("error");
            setErrorMessage(errorMsg);
            return;
        }

        const verify = async () => {
            // 1. Try Implicit Flow (Access Token)
            if (accessToken && refreshToken) {
                try {
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (error) {
                        console.error("Implicit verification failed:", error);
                        setStatus("error");
                        setErrorMessage(error.message);
                    } else {
                        console.log("Implicit verification success:", data.user?.email);
                        setStatus("success");
                        setTimeout(() => router.push("/profile/setup"), 1500);
                    }
                } catch (err: any) {
                    setStatus("error");
                    setErrorMessage(err.message);
                }
                return;
            }

            // 2. Try PKCE Flow (Code)
            if (code) {
                try {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) {
                        setStatus("error");
                        setErrorMessage(error.message);
                    } else {
                        setStatus("success");
                        setTimeout(() => router.push("/profile/setup"), 1500);
                    }
                } catch (err: any) {
                    setStatus("error");
                    setErrorMessage(err.message);
                }
                return;
            }

            // 3. No credentials found
            setStatus("error");
            setErrorMessage("No verification credentials found. Please try signing up again.");
        };

        verify();
    }, [searchParams, router]);

    return (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <div className="max-w-md w-full bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

                {status === "verifying" && (
                    <div className="space-y-6">
                        <div className="relative w-16 h-16 mx-auto">
                            <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-blue-500/30 border-l-transparent rounded-full animate-spin" />
                            <div className="absolute inset-2 border-4 border-t-transparent border-r-purple-500 border-b-transparent border-l-purple-500/30 rounded-full animate-spin-reverse" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Verifying...</h1>
                        <p className="text-zinc-400">Please wait while we secure your session.</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50">
                            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Success!</h1>
                        <p className="text-zinc-400">Redirecting to profile setup...</p>
                    </div>
                )}

                {status === "error" && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/50">
                            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Verification Failed</h1>
                        <p className="text-red-400 bg-red-500/10 p-3 rounded-lg text-sm font-mono border border-red-500/20 break-words">
                            {errorMessage}
                        </p>
                        <div className="text-xs text-left w-full bg-black/50 p-2 rounded border border-white/5 overflow-hidden">
                            <p className="mb-1 text-zinc-500">Debug Info:</p>
                            <code className="block break-all text-zinc-600">
                                Cookies: {typeof document !== 'undefined' ? document.cookie : 'N/A'}
                            </code>
                        </div>
                        <button
                            onClick={() => router.push("/join")}
                            className="px-6 py-2 bg-white text-black font-medium rounded-full hover:bg-zinc-200 transition-colors"
                        >
                            Back to Sign In
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <div className="min-h-screen w-full bg-black text-white overflow-hidden relative selection:bg-blue-500/30">
            <StarfieldBackground />
            <Suspense fallback={<div className="text-white text-center pt-20">Loading...</div>}>
                <VerifyContent />
            </Suspense>
        </div>
    );
}
