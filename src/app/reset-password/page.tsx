'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Key, Eye, EyeOff, CheckCircle } from 'lucide-react';
import ScrollStarfield from '@/components/ScrollStarfield';
import LoadingSpinner from '@/components/LoadingSpinner';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'verify' | 'reset' | 'success'>('verify');

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, type: 'RECOVERY' }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid code');
            }

            setStep('reset');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            setStep('success');
            setTimeout(() => {
                router.push('/login?message=Password reset successful. Please sign in.');
            }, 2000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <ScrollStarfield variant="default">
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
                        <p className="text-gray-400">Redirecting to login...</p>
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
                            <Link href="/forgot-password" className="text-white/50 hover:text-white">
                                <ArrowLeft size={24} />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-white">
                                    {step === 'verify' ? 'Enter Code' : 'New Password'}
                                </h1>
                                <p className="text-sm text-gray-400">
                                    {step === 'verify' ? `Code sent to ${email}` : 'Create your new password'}
                                </p>
                            </div>
                        </div>

                        {step === 'verify' && (
                            <form onSubmit={handleVerify} className="space-y-4">
                                <div>
                                    <label htmlFor="code" className="block text-sm font-medium text-gray-200 mb-1">
                                        Verification Code
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            id="code"
                                            type="text"
                                            required
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400 focus:outline-none font-mono text-center tracking-widest text-lg"
                                            placeholder="000000"
                                            maxLength={6}
                                        />
                                    </div>
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
                                    {loading ? 'Verifying...' : 'Verify Code'}
                                </button>
                            </form>
                        )}

                        {step === 'reset' && (
                            <form onSubmit={handleReset} className="space-y-4">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400 focus:outline-none pr-10"
                                            placeholder="At least 8 characters"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-1">
                                        Confirm Password
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400 focus:outline-none"
                                        placeholder="Confirm your password"
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
                                    {loading ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </ScrollStarfield>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <ResetPasswordContent />
        </Suspense>
    );
}
