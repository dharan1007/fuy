"use client";

import { signIn } from "@/hooks/use-session";
import { supabase } from "@/lib/supabase-client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ScrollStarfield from "@/components/ScrollStarfield";
import { startRegistration } from "@simplewebauthn/browser";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Creating your account...");
  const [success, setSuccess] = useState(false);

  // Force black background for starfield
  useEffect(() => {
    const originalBg = document.body.style.background;
    document.body.style.background = '#000000';
    return () => {
      document.body.style.background = originalBg;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.name || !formData.email) {
      setError("Name and email are required");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setLoadingMessage("Creating your account...");

    try {
      // Create supabase account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase(),
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            displayName: formData.name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Check if session exists (auto-confirm enabled) or if email confirmation is required
        if (data.session) {
          // User is signed in
          setLoadingMessage("Signing you in...");
          router.push("/profile/setup");
        } else {
          // Email confirmation required
          // We can redirect to a "check email" page or show a success state
          // For now, let's reuse the loading/error state to show success message or simple alert
          setLoading(false);
          // Use a specific "success" blocking state if desired, or just alert?
          // Let's replace the form with a success message similar to JoinPage
          setError(""); // Clear error
          // We'll treat this state as "sent"
          // But this component logic structure is a bit rigid. 
          // Let's just alert for now or redirect to join/verify?
          // Actually, simplest is to redirect to login with a message?
          // Or better:
          alert("Account created! Please check your email to confirm.");
          router.push("/join");
        }
      }

    } catch (err: any) {
      console.error("Signup error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handlePasskeySignup() {
    // Validate email and name first
    if (!formData.name || !formData.email) {
      setError("Please enter your name and email to sign up with a passkey");
      return;
    }

    setError("");
    setLoading(true);
    setLoadingMessage("Preparing passkey registration...");

    try {
      // Get registration options
      const optionsRes = await fetch("/api/webauthn/generate-signup-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          name: formData.name,
        }),
      });

      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        setError(data.error || "Failed to start passkey registration");
        setLoading(false);
        return;
      }

      const options = await optionsRes.json();
      const challenge = optionsRes.headers.get("x-webauthn-challenge") || "";
      const email = optionsRes.headers.get("x-signup-email") || "";
      const name = optionsRes.headers.get("x-signup-name") || "";

      // Start passkey registration
      setLoadingMessage("Complete passkey registration on your device...");
      const attestation = await startRegistration(options);

      // Verify registration and create account
      setLoadingMessage("Creating your account...");
      const verifyRes = await fetch("/api/webauthn/verify-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webauthn-challenge": challenge,
          "x-signup-email": email,
          "x-signup-name": name,
        },
        body: JSON.stringify(attestation),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        setError(data.error || "Failed to verify passkey");
        setLoading(false);
        return;
      }

      const { loginToken } = await verifyRes.json();

      // Auto sign in with the login token
      setLoadingMessage("Signing you in...");
      const signInRes = await signIn("credentials", {
        loginToken,
        redirect: false,
      });

      if (signInRes?.ok) {
        await new Promise(resolve => setTimeout(resolve, 300));
        router.push("/profile/setup");
      } else {
        setError("Account created but failed to sign in. Please try logging in.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Passkey signup error:", err);
      setError(err?.message || "Passkey registration failed. Please try again.");
      setLoading(false);
    }
  }

  // Show loading spinner while creating account and signing in
  if (loading) {
    return <LoadingSpinner variant="auth" message={loadingMessage} estimatedTime={3} />;
  }

  return (
    <ScrollStarfield variant="default">
      <div className="min-h-screen flex items-center justify-center p-4">
        {/* Main Content */}
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Create Account</h1>
              <p className="mt-2 text-sm text-gray-300">
                Join Fuy and start your journey
              </p>
            </div>

            {success ? (
              <div className="space-y-6 text-center py-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Check your email</h3>
                  <p className="text-gray-300">
                    We've sent a confirmation link to <span className="text-white font-medium">{formData.email}</span>.
                  </p>
                  <p className="text-sm text-gray-400 mt-4">
                    Click the link in the email to sign in and activate your account.
                  </p>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-gray-400 mb-4">Didn't receive it?</p>
                  <button
                    onClick={() => { setSuccess(false); setLoading(false); }}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-1">
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 focus:outline-none"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 focus:outline-none"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 focus:outline-none pr-10"
                        placeholder="At least 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none flex items-center justify-center h-8 w-8"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 focus:outline-none pr-10"
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none flex items-center justify-center h-8 w-8"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                  >
                    {loading ? "Creating account..." : "Sign Up"}
                  </button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-black/50 text-gray-400 backdrop-blur-sm">Or continue with</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => router.push("/join")}
                    className="w-full border border-white/20 hover:bg-white/10 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >

                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Magic Link
                  </button>

                  <button
                    onClick={handlePasskeySignup}
                    disabled={loading}
                    className="w-full border border-white/20 hover:bg-white/10 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Passkey
                  </button>
                </div>

                <div className="text-center text-sm text-gray-300">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                    Sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ScrollStarfield>
  );
}
