"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import CharmCard from './CharmCard';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function AIChatbot() {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [charm, setCharm] = useState<{ title: string; quote: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: 'init',
                    role: 'assistant',
                    content: "Hello. I am dbot. I'm here to listen, understand, and help you find clarity. How are you feeling right now?",
                },
            ]);
        }
    }, [messages.length]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.content, sessionId }),
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.sessionId) {
                setSessionId(data.sessionId);
            }

            const aiMsg: Message = { id: Date.now().toString(), role: 'assistant', content: data.response };
            setMessages((prev) => [...prev, aiMsg]);

            if (data.charm) {
                setCharm(data.charm);
            }

        } catch (error) {
            console.error(error);
            setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), role: 'assistant', content: "I'm having trouble connecting right now. Please try again gently." },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full h-[600px] max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col"
            style={{
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(20px)',
            }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    <span className="text-white/90 font-medium tracking-wide">dbot</span>
                </div>
                <div className="text-xs text-white/40 uppercase tracking-widest">AI Companion</div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm backdrop-blur-md border ${msg.role === 'user'
                                    ? 'bg-white/10 text-white border-white/10 rounded-br-none'
                                    : 'bg-black/40 text-neutral-200 border-white/5 rounded-bl-none'
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="px-5 py-3 rounded-2xl bg-black/40 border border-white/5 rounded-bl-none flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-white/5">
                <div className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type your thoughts..."
                        className="w-full bg-black/20 border border-white/10 rounded-full px-6 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-black/40 transition-all"
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
                <div className="text-center mt-2">
                    <span className="text-[10px] text-white/20">dbot learns from our conversations to help you better.</span>
                </div>
            </div>

            {/* Charm Card Modal */}
            {charm && (
                <CharmCard
                    title={charm.title}
                    quote={charm.quote}
                    onClose={() => setCharm(null)}
                />
            )}
        </div>
    );
}
