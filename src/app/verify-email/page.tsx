
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import CosmicBackground from '@/components/CosmicBackground';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [showPasswordToggle, setShowPasswordToggle] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        // Try to retrieve password from session storage (set during signup)
        const storedPassword = sessionStorage.getItem('signup_password');
        if (storedPassword) {
            setPassword(storedPassword);
        } else {
            // If not found (e.g. direct link or clear cache), show input
            setShowPasswordInput(true);
        }
    }, []);

    const handleVerify = async () => {
        if (!code) {
            setMessage({ type: 'error', text: 'Please enter verification code' });
            return;
        }

        if (showPasswordInput && !password) {
            setMessage({ type: 'error', text: 'Please enter your password to complete registration' });
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    code,
                    type: 'SIGNUP',
                    password: password // Include password
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            // Cleanup session storage on success
            sessionStorage.removeItem('signup_password');

            setMessage({ type: 'success', text: 'Email verified! Redirecting...' });

            // Redirect to profile setup
            setTimeout(() => {
                router.push('/onboarding');
            }, 1000);

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <CosmicBackground>
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="w-full max-w-md border border-white/10 bg-white/5 backdrop-blur-xl rounded-xl p-6 text-white shadow-2xl">
                    <div className="mb-6">
                        <Link href="/signup" className="mb-4 inline-flex items-center text-white/50 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5 mr-2" /> Back
                        </Link>
                        <h1 className="text-2xl font-bold text-center mt-2">Verify Email</h1>
                        <p className="text-center text-white/40 mt-1">Enter code sent to {email}</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <input
                                type="text"
                                placeholder="000000"
                                value={code}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-center text-3xl tracking-[0.5em] h-16 focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/10"
                                maxLength={6}
                            />
                        </div>

                        {showPasswordInput && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-400">
                                    Set Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswordToggle ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg text-white px-4 h-12 focus:outline-none focus:border-white/30 transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordToggle(!showPasswordToggle)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {showPasswordToggle ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="text-xs text-yellow-500/80">
                                    Password re-entry required for security.
                                </p>
                            </div>
                        )}

                        {message && (
                            <div className={`text-center text-sm p-3 rounded-lg ${message.type === 'error' ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            onClick={handleVerify}
                            disabled={loading}
                            className="w-full bg-white text-black font-bold h-12 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Verifying...' : 'Verify Email'}
                        </button>
                    </div>
                </div>
            </div>
        </CosmicBackground>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black text-white">Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}
