"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CharmCard from './CharmCard';
import { PersonaType } from '@/lib/ai-service';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sentiment?: string; // Color code
}

interface AIChatbotProps {
    className?: string;
    style?: React.CSSProperties;
}

export default function AIChatbot({ className, style }: AIChatbotProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [charm, setCharm] = useState<{ title: string; quote: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- Advanced AI State ---
    const [persona, setPersona] = useState<PersonaType>('friend');
    const [currentMood, setCurrentMood] = useState<string>('#3b82f6'); // Default blue
    const [showSettings, setShowSettings] = useState(false);
    const [autoRead, setAutoRead] = useState(false);

    // --- Persistence ---
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('fuy.dbot.v1');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.messages) setMessages(parsed.messages);
                    if (parsed.sessionId) setSessionId(parsed.sessionId);
                    if (parsed.persona) setPersona(parsed.persona);
                    if (parsed.currentMood) setCurrentMood(parsed.currentMood);
                    if (parsed.autoRead) setAutoRead(parsed.autoRead);
                } catch (e) {
                    console.error('Failed to load dbot state', e);
                }
            } else {
                // Initial greeting if no history
                setMessages([{
                    id: 'init',
                    role: 'assistant',
                    content: "Hello. I am dbot. I'm here to listen, understand, and help you find clarity. How are you feeling right now?",
                }]);
            }
        }
    }, []);

    useEffect(() => {
        if (messages.length > 0 || sessionId) {
            localStorage.setItem('fuy.dbot.v1', JSON.stringify({
                messages,
                sessionId,
                persona,
                currentMood,
                autoRead
            }));
        }
    }, [messages, sessionId, persona, currentMood, autoRead]);

    // --- Voice Mode State ---
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [podcastMode, setPodcastMode] = useState(false);
    const [micError, setMicError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);
    const synthesisRef = useRef<SpeechSynthesis | null>(null);



    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Initialize Speech API
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event: any) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                    }
                    if (finalTranscript) {
                        setInput(finalTranscript);
                        sendMessage(finalTranscript);
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech error", event.error);
                    setIsListening(false);
                    setMicError('Microphone error. Please check permissions.');
                    setTimeout(() => setMicError(null), 5000);
                };

                recognition.onend = () => setIsListening(false);
                recognitionRef.current = recognition;
            }
            synthesisRef.current = window.speechSynthesis;
        }
    }, []);

    const speak = (text: string) => {
        if (!synthesisRef.current) return;
        synthesisRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;

        // Voice Selection (Feminine Priority)
        const voices = synthesisRef.current.getVoices();
        const preferredVoice = voices.find(v =>
            v.name.includes('Zira') ||
            v.name.includes('Google US English') ||
            v.name.includes('Samantha') ||
            v.name.toLowerCase().includes('female')
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            if (podcastMode && recognitionRef.current) setTimeout(() => startListening(), 500);
        };
        synthesisRef.current.speak(utterance);
    };

    const startListening = async () => {
        if (recognitionRef.current && !isListening && !isSpeaking) {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                setMicError('Microphone access denied.');
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
            setPodcastMode(false);
        }
    };

    const togglePodcastMode = () => {
        if (podcastMode) {
            setPodcastMode(false);
            stopListening();
            synthesisRef.current?.cancel();
        } else {
            setPodcastMode(true);
            startListening();
        }
    };

    const sendMessage = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: textToSend };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.content, sessionId, persona }),
            });

            const data = await res.json();

            if (data.sessionId) setSessionId(data.sessionId);
            if (data.sentiment?.color) setCurrentMood(data.sentiment.color);

            const aiMsg: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: data.response,
                sentiment: data.sentiment?.color
            };
            setMessages((prev) => [...prev, aiMsg]);

            if (podcastMode || autoRead || textOverride) speak(data.response);
            if (data.charm) setCharm(data.charm);

        } catch (error) {
            console.error(error);
            setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: "I'm having trouble connecting. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`relative flex flex-col transition-all duration-500 overflow-hidden ${className || 'w-full h-[700px] max-w-5xl mx-auto rounded-3xl border border-white/10 shadow-2xl'}`}
            style={{
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(20px)',
                boxShadow: `0 0 100px ${currentMood}20`, // Dynamic mood glow
                ...style
            }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-4">
                    {/* Mood Orb */}
                    <div className="relative w-4 h-4">
                        <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: currentMood, filter: 'blur(4px)' }}></div>
                        <div className="relative w-full h-full rounded-full border border-white/20" style={{ background: currentMood }}></div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-white font-medium tracking-wide">dbot</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">{persona} Mode</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Persona Selector */}
                    <select
                        value={persona}
                        onChange={(e) => setPersona(e.target.value as PersonaType)}
                        className="bg-black/20 border border-white/10 rounded-full px-3 py-1 text-xs text-white/80 focus:outline-none hover:bg-white/5 transition-colors"
                    >
                        <option value="friend">Best Friend</option>
                        <option value="therapist">Therapist</option>
                        <option value="coach">Coach</option>
                        <option value="mystic">Mystic</option>
                    </select>

                    <div className="w-px h-4 bg-white/10 mx-1"></div>

                    <button
                        onClick={togglePodcastMode}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${podcastMode
                            ? 'bg-red-500/20 text-red-200 border border-red-500/30'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        {podcastMode ? '🎙️ Live' : 'Voice'}
                    </button>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 rounded-full hover:bg-white/10 text-white/60 transition-colors"
                    >
                        ⚙️
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="absolute top-16 right-6 z-20 bg-black/90 border border-white/10 rounded-xl p-4 w-64 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-xs font-bold text-white/40 uppercase mb-3">Settings</h3>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between text-sm text-white/80 cursor-pointer">
                            <span>Auto-Read Responses</span>
                            <input
                                type="checkbox"
                                checked={autoRead}
                                onChange={(e) => setAutoRead(e.target.checked)}
                                className="accent-blue-500"
                            />
                        </label>
                        <button
                            onClick={() => router.push('/journal')}
                            className="w-full text-left text-sm text-white/60 hover:text-white py-1 transition-colors"
                        >
                            Open Canvas
                        </button>
                        <button
                            onClick={() => router.push('/hopin')}
                            className="w-full text-left text-sm text-white/60 hover:text-white py-1 transition-colors"
                        >
                            Open Hopin
                        </button>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-6 py-4 rounded-2xl text-sm leading-relaxed shadow-sm backdrop-blur-md border transition-all duration-300 ${msg.role === 'user'
                            ? 'bg-white/10 text-white border-white/10 rounded-br-none'
                            : 'bg-black/40 text-neutral-200 border-white/5 rounded-bl-none'
                            }`}
                            style={msg.role === 'assistant' && msg.sentiment ? { borderLeft: `3px solid ${msg.sentiment}` } : {}}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* Thinking Process Visualization */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="px-5 py-3 rounded-2xl bg-black/40 border border-white/5 rounded-bl-none flex flex-col gap-2">
                            <div className="flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                            <span className="text-[10px] text-white/30 animate-pulse">
                                {Math.random() > 0.5 ? 'Analyzing sentiment...' : 'Consulting knowledge base...'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-white/5">
                <div className="relative flex items-center gap-2">
                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`p-3 rounded-full transition-all ${isListening
                            ? 'bg-red-500/20 text-red-400 animate-pulse'
                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                            }`}
                    >
                        🎤
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder={podcastMode ? "Listening..." : `Message ${persona}...`}
                        className="w-full bg-black/20 border border-white/10 rounded-full px-6 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-black/40 transition-all"
                        disabled={isLoading || podcastMode}
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 transition-colors"
                    >
                        ➤
                    </button>
                </div>
                <div className="text-center mt-2 flex justify-center gap-4">
                    <span className="text-[10px] text-white/20">dbot v2.0 (Qwen 0.5B)</span>
                    <span className="text-[10px] text-white/20">•</span>
                    <span className="text-[10px] text-white/20">Offline Ready</span>
                </div>
            </div>

            {/* Error Notification */}
            {micError && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
                    <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl border border-red-400/50 text-sm font-medium">
                        {micError}
                    </div>
                </div>
            )}

            {/* Charm Card Modal */}
            {charm && <CharmCard title={charm.title} quote={charm.quote} onClose={() => setCharm(null)} />}
        </div>
    );
}
