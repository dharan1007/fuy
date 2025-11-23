"use client";

import React, { useRef } from 'react';
import { toPng } from 'html-to-image';

interface CharmCardProps {
    title: string;
    quote: string;
    onClose: () => void;
}

export default function CharmCard({ title, quote, onClose }: CharmCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (cardRef.current) {
            try {
                const dataUrl = await toPng(cardRef.current, { cacheBust: true });
                const link = document.createElement('a');
                link.download = `charm-card-${Date.now()}.png`;
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error('Failed to download charm card', err);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">

                {/* The Card Itself */}
                <div
                    ref={cardRef}
                    className="relative w-[300px] h-[450px] rounded-3xl overflow-hidden flex flex-col items-center justify-center p-8 text-center border border-white/20 shadow-2xl"
                    style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                    }}
                >
                    {/* Decorative noise/texture overlay could go here */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>

                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center mb-4">
                            <span className="text-2xl">✨</span>
                        </div>

                        <h3 className="text-xl font-light tracking-widest text-white uppercase opacity-90">
                            {title}
                        </h3>

                        <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent my-2"></div>

                        <p className="text-lg font-medium text-white leading-relaxed italic opacity-90 font-serif">
                            "{quote}"
                        </p>
                    </div>

                    <div className="absolute bottom-6 text-[10px] tracking-widest text-white/40 uppercase">
                        fuy.ai • dbot
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        onClick={handleDownload}
                        className="px-6 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors shadow-lg"
                    >
                        Save Card
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-full border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
