// src/app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import StarfieldBackground from "@/components/LandingPage/StarfieldBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else if (res?.ok) {
        // Short delay to ensure session is established, then redirect
        await new Promise(resolve => setTimeout(resolve, 300));
        router.push("/");
      } else {
        setError("Failed to sign in. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // Show loading spinner while authenticating
  if (loading) {
    return <LoadingSpinner variant="auth" message="Signing in..." estimatedTime={2} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <StarfieldBackground />
      <div className="w-full max-w-md relative z-10">
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Welcome Back</h1>
            <p className="mt-2 text-sm text-gray-300">
              Sign in to continue to Fuy
            </p>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black/80 text-gray-300">Or continue with</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => router.push("/passkeys")}
              className="w-full border border-white/20 hover:bg-white/10 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Use Passkey
            </button>
          </div>

          <div className="text-center text-sm text-gray-300">
            Don't have an account?{" "}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
