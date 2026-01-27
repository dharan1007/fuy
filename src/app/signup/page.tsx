"use client";

import { signIn, useSession } from "@/hooks/use-session";
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
    captchaAnswer: "",
    _gotcha: "", // Honeypot
  });
  const [captchaData, setCaptchaData] = useState<{ image: string, token: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Creating your account...");

  const { data: session, status: sessionStatus } = useSession();

  const refreshCaptcha = async () => {
    try {
      const res = await fetch("/api/auth/captcha");
      if (res.ok) {
        const data = await res.json();
        setCaptchaData(data);
      }
    } catch (e) {
      console.error("Failed to load captcha", e);
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.push("/");
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    const originalBg = document.body.style.background;
    document.body.style.background = '#000000';
    refreshCaptcha();
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

    if (!formData.captchaAnswer) {
      setError("Please enter the security code");
      return;
    }

    setLoading(true);
    setLoadingMessage("Verifying security...");

    const normalizedEmail = formData.email.toLowerCase().trim();

    try {
      // 1. Create Account via Server API (Verify CAPTCHA)
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: normalizedEmail,
          password: formData.password,
          captchaAnswer: formData.captchaAnswer,
          captchaToken: captchaData?.token,
          _gotcha: formData._gotcha
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }

      // 2. Account created successfully. Redirect to email verification.
      setLoadingMessage("Redirecting to verification...");
      router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);

    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
      refreshCaptcha(); // Refresh on error so token timestamp stays fresh/valid for next try
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

      const { loginUrl } = await verifyRes.json();

      // Auto sign in by navigating to the magic link
      setLoadingMessage("Securing your session...");
      if (loginUrl) {
        window.location.href = loginUrl;
      } else {
        setError("Account created but failed to generate sign-in link. Please try logging in manually.");
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

              {/* Honeypot Field (Hidden) */}
              <div style={{ display: 'none', position: 'absolute', left: '-9999px' }}>
                <label htmlFor="_gotcha">Do not fill this field</label>
                <input
                  type="text"
                  id="_gotcha"
                  name="_gotcha"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData._gotcha}
                  onChange={(e) => setFormData({ ...formData, _gotcha: e.target.value })}
                />
              </div>

              {/* CAPTCHA Section */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-200">
                  Security Check
                </label>
                <div className="bg-black/30 border border-white/10 rounded-lg p-3 flex flex-col gap-3">
                  {captchaData ? (
                    <div className="relative w-full h-20 bg-[#111] rounded overflow-hidden select-none flex items-center justify-center">
                      <img src={captchaData.image} alt="Security Code" className="w-full h-full object-contain pointer-events-none" />
                      <button
                        type="button"
                        onClick={refreshCaptcha}
                        className="absolute right-2 top-2 text-white/50 hover:text-white p-1 rounded-full bg-black/50"
                        title="Refresh Image"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-20 bg-white/5 animate-pulse rounded"></div>
                  )}
                  <input
                    type="text"
                    required
                    value={formData.captchaAnswer}
                    onChange={(e) => setFormData({ ...formData, captchaAnswer: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 focus:outline-none font-mono tracking-widest text-center uppercase"
                    placeholder="ENTER CODE"
                    autoComplete="off"
                  />
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
                onClick={handlePasskeySignup}
                disabled={loading}
                className="w-full border border-white/20 hover:bg-white/10 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Sign up with Passkey
              </button>
            </div>

            <div className="text-center text-sm text-gray-300">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ScrollStarfield >
  );
}
