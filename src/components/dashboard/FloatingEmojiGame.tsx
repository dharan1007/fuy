
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, Settings, RefreshCw } from 'lucide-react';

interface FloatingEmoji {
    id: number;
    char: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    isEscaping?: boolean;
    taunt?: string;
    popped?: boolean;
}

const AVAILABLE_EMOJIS = ["😀", "😎", "👻", "👽", "💩", "🤖", "🎃", "🦄", "🍕", "🚀"];
const TAUNTS = ["Too slow!", "Missed me!", "Can't catch me!", "Nope!", "Try harder!", "L bozo"];

export default function FloatingEmojiGame() {
    const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);
    const [availableEmojis, setAvailableEmojis] = useState<string[]>(AVAILABLE_EMOJIS);
    const [selectedEmojis, setSelectedEmojis] = useState<string[]>(["👻", "👽", "🤖", "😎"]);
    const [isPaused, setIsPaused] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>();

    // Spawn initial emojis
    const spawnEmojis = useCallback(() => {
        if (!containerRef.current) return;
        const { width, height } = containerRef.current.getBoundingClientRect();

        const newEmojis = Array.from({ length: 15 }).map((_, i) => ({
            id: Date.now() + i,
            char: selectedEmojis[Math.floor(Math.random() * selectedEmojis.length)],
            x: Math.random() * (width - 50),
            y: Math.random() * (height - 50),
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: 30 + Math.random() * 20,
        }));
        setEmojis(newEmojis);
    }, [selectedEmojis]);

    useEffect(() => {
        spawnEmojis();
    }, [spawnEmojis]);

    // Game Loop
    const update = useCallback(() => {
        if (isPaused) return;

        setEmojis(prev => prev.map(emoji => {
            if (emoji.popped) return emoji;

            let { x, y, vx, vy, isEscaping } = emoji;

            // Move
            x += vx;
            y += vy;

            // Bounce off walls
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                if (x <= 0 || x >= width - emoji.size) vx *= -1;
                if (y <= 0 || y >= height - emoji.size) vy *= -1;
            }

            // Friction for escaping emojis to slow down eventually
            if (isEscaping) {
                vx *= 0.95;
                vy *= 0.95;
                if (Math.abs(vx) < 1 && Math.abs(vy) < 1) {
                    // Return to normal speed logic eventually or just stay calm
                }
            }

            return { ...emoji, x, y, vx, vy };
        }));

        animationRef.current = requestAnimationFrame(update);
    }, [isPaused]);

    useEffect(() => {
        animationRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationRef.current!);
    }, [update]);

    const handleEmojiClick = (id: number) => {
        if (isPaused) return;

        const emoji = emojis.find(e => e.id === id);
        if (!emoji || emoji.popped) return;

        // 20% Chance to escape/bully
        if (!emoji.isEscaping && Math.random() < 0.2) {
            setEmojis(prev => prev.map(e => {
                if (e.id === id) {
                    return {
                        ...e,
                        isEscaping: true,
                        vx: (Math.random() - 0.5) * 15, // Fast burst
                        vy: (Math.random() - 0.5) * 15,
                        taunt: TAUNTS[Math.floor(Math.random() * TAUNTS.length)]
                    };
                }
                return e;
            }));

            // Clear taunt after a bit
            setTimeout(() => {
                setEmojis(prev => prev.map(e => e.id === id ? { ...e, taunt: undefined } : e));
            }, 1500);
            return;
        }

        // Pop logic
        setEmojis(prev => prev.map(e => e.id === id ? { ...e, popped: true } : e));
    };


    return (
        <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-50">
            {/* Controls - Make pointer-events-auto so we can click them */}
            <div className="absolute top-24 right-4 flex gap-2 pointer-events-auto z-50">
                <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="p-2 bg-white/80 backdrop-blur rounded-full shadow hover:bg-white transition-colors"
                    title={isPaused ? "Resume" : "Pause"}
                >
                    {isPaused ? <Play size={16} /> : <Pause size={16} />}
                </button>
                <button
                    onClick={() => spawnEmojis()}
                    className="p-2 bg-white/80 backdrop-blur rounded-full shadow hover:bg-white transition-colors"
                    title="Reset"
                >
                    <RefreshCw size={16} />
                </button>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 bg-white/80 backdrop-blur rounded-full shadow hover:bg-white transition-colors"
                    title="Settings"
                >
                    <Settings size={16} />
                </button>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="absolute top-36 right-4 p-4 bg-white rounded-xl shadow-xl border border-gray-100 w-64 pointer-events-auto z-50 animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-sm">Select Emojis</h3>
                        <button onClick={() => setShowSettings(false)}><X size={14} /></button>
                    </div>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            placeholder="Add emoji..."
                            className="flex-1 border rounded px-2 py-1 text-sm"
                            maxLength={2}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = e.currentTarget.value.trim();
                                    if (val) {
                                        if (!availableEmojis.includes(val)) {
                                            setAvailableEmojis(prev => [...prev, val]);
                                        }
                                        if (!selectedEmojis.includes(val)) {
                                            setSelectedEmojis(prev => [...prev, val]);
                                        }
                                        e.currentTarget.value = '';
                                    }
                                }
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                        {availableEmojis.map(char => (
                            <button
                                key={char}
                                onClick={() => {
                                    if (selectedEmojis.includes(char)) {
                                        if (selectedEmojis.length > 1) setSelectedEmojis(prev => prev.filter(c => c !== char));
                                    } else {
                                        setSelectedEmojis(prev => [...prev, char]);
                                    }
                                }}
                                className={`p-2 rounded text-lg hover:bg-gray-100 ${selectedEmojis.includes(char) ? 'bg-blue-100 ring-1 ring-blue-500' : ''}`}
                            >
                                {char}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Emojis - Only show when not paused (vanish on pause) */}
            {!isPaused && emojis.map(emoji => !emoji.popped && (
                <div
                    key={emoji.id}
                    onClick={() => handleEmojiClick(emoji.id)}
                    className="absolute cursor-pointer pointer-events-auto select-none transition-transform active:scale-95"
                    style={{
                        transform: `translate(${emoji.x}px, ${emoji.y}px)`,
                        fontSize: `${emoji.size}px`,
                        transition: emoji.isEscaping ? 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none'
                    }}
                >
                    {emoji.char}
                    {emoji.taunt && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-red-600 bg-white/90 px-2 py-1 rounded shadow whitespace-nowrap pointer-events-none animate-bounce">
                            {emoji.taunt}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
