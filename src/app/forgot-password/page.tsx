'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import ScrollStarfield from '@/components/ScrollStarfield';
import LoadingSpinner from '@/components/LoadingSpinner';

function ForgotPasswordContent() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send reset code');
            }

            setSuccess(true);
            // Redirect to reset password page after short delay
            setTimeout(() => {
                router.push(`/reset-password?email=${encodeURIComponent(email.toLowerCase().trim())}`);
            }, 1500);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <ScrollStarfield variant="default">
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
                        <p className="text-gray-400">We sent a verification code to {email}</p>
                        <p className="text-gray-500 text-sm mt-4">Redirecting...</p>
                    </div>
                </div>
            </ScrollStarfield>
        );
    }

    return (
        <ScrollStarfield variant="default">
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md relative z-10">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <Link href="/login" className="text-white/50 hover:text-white">
                                <ArrowLeft size={24} />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
                                <p className="text-sm text-gray-400">Enter your email to reset</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400 focus:outline-none"
                                    placeholder="you@example.com"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Sending...' : 'Send Reset Code'}
                            </button>
                        </form>

                        <div className="text-center text-sm text-gray-400">
                            Remember your password?{' '}
                            <Link href="/login" className="text-red-400 hover:text-red-300 font-medium">
                                Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </ScrollStarfield>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <ForgotPasswordContent />
        </Suspense>
    );
}
