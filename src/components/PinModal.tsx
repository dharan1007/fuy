'use client';

import React, { useState } from 'react';
import { useEncryption } from '../context/EncryptionContext';
import { Lock, ShieldCheck, AlertTriangle, Loader } from 'lucide-react';

interface PinModalProps {
    visible: boolean;
    mode: 'setup' | 'unlock';
    onClose?: () => void;
}

export default function PinModal({ visible, mode, onClose }: PinModalProps) {
    const { setupWallet, unlockWallet } = useEncryption();
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    if (!visible) return null;

    const handleAction = async () => {
        setError('');
        if (pin.length < 6) {
            setError('PIN must be at least 6 digits');
            return;
        }

        setBusy(true);
        try {
            if (mode === 'setup') {
                if (pin !== confirmPin) {
                    setError('PINs do not match');
                    setBusy(false);
                    return;
                }
                const success = await setupWallet(pin);
                if (!success) setError('Setup failed.');
                else if (onClose) onClose();
            } else {
                const success = await unlockWallet(pin);
                if (!success) setError('Incorrect PIN');
                else if (onClose) onClose();
            }
        } catch (e) {
            setError('An error occurred');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 w-full max-w-sm p-8 rounded-3xl border border-zinc-800 flex flex-col items-center shadow-2xl">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                    {mode === 'setup' ? <ShieldCheck size={32} color="#10b981" /> : <Lock size={32} color="#fff" />}
                </div>

                <h2 className="text-white text-2xl font-bold mb-2">
                    {mode === 'setup' ? 'Secure Chat Setup' : 'Unlock Secure Chat'}
                </h2>

                <p className="text-zinc-400 text-center mb-6 text-sm">
                    {mode === 'setup'
                        ? 'Create a 6-digit Global PIN. This single lock secures all your messages across every device.'
                        : 'Enter your Global PIN to unlock all encrypted messages.'}
                </p>

                {mode === 'setup' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl mb-6 flex items-start gap-3 w-full">
                        <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-yellow-500 text-xs">
                            Warning: If you forget this PIN, your chat history cannot be recovered. We do not store it.
                        </p>
                    </div>
                )}

                <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 6-digit PIN"
                    maxLength={6}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-center text-xl font-mono mb-3 focus:outline-none focus:border-zinc-600 transition-colors"
                />

                {mode === 'setup' && (
                    <input
                        type="password"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        placeholder="Confirm PIN"
                        maxLength={6}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-center text-xl font-mono mb-4 focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                )}

                {error && <p className="text-red-500 mb-4 text-sm font-medium">{error}</p>}

                <button
                    onClick={handleAction}
                    disabled={busy}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${busy ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200 active:scale-95'
                        }`}
                >
                    {busy ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader className="animate-spin" size={20} />
                            <span>Processing...</span>
                        </div>
                    ) : (mode === 'setup' ? 'Set Global Lock' : 'Unlock Chats')}
                </button>
            </div>
        </div>
    );
}
