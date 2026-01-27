
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import CosmicBackground from '@/components/CosmicBackground';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleVerify = async () => {
        if (!code) {
            setMessage({ type: 'error', text: 'Please enter verification code' });
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
                    type: 'SIGNUP'
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

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
