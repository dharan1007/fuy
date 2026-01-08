'use client';

import React, { useState, useEffect } from 'react';
import { Play, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FillSlide {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    author: string;
    authorAvatar?: string;
    duration?: string;
    views?: string;
    tags?: string[];
}

interface FillsHeroProps {
    fills: any[]; // Using any for flexibility with DotData, typically expects DotData structure
    onPlay: (fill: any) => void;
}

export default function FillsHero({ fills, onPlay }: FillsHeroProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-advance
    useEffect(() => {
        if (fills.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % fills.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [fills.length]);

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % fills.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + fills.length) % fills.length);

    if (!fills || fills.length === 0) return null;

    const currentFill = fills[currentIndex];

    return (
        <div className="relative w-full aspect-[16/9] md:aspect-[21/9] lg:h-[60vh] overflow-hidden rounded-2xl mb-8 group border border-white/10 mx-5 sm:mx-0">
            <AnimatePresence mode='wait'>
                <motion.div
                    key={currentFill.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                >
                    {/* Background Image/Video */}
                    <div className="absolute inset-0">
                        {currentFill.mediaType === 'video' ? (
                            <video
                                src={currentFill.mediaUrl}
                                className="w-full h-full object-cover"
                                autoPlay
                                muted
                                loop
                                playsInline
                                poster={currentFill.coverUrl}
                            />
                        ) : (
                            <img
                                src={currentFill.mediaUrl}
                                alt={currentFill.description}
                                className="w-full h-full object-cover"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="absolute inset-0 flex items-center p-8 md:p-16">
                        <div className="max-w-2xl space-y-6">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center gap-3"
                            >
                                <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-red-600/20">
                                    Trending Fill
                                </span>
                                {currentFill.category && (
                                    <span className="text-white/70 text-xs font-medium px-2 py-0.5 border border-white/20 rounded-full uppercase tracking-wider">
                                        {currentFill.category}
                                    </span>
                                )}
                            </motion.div>

                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-lg line-clamp-2"
                            >
                                {currentFill.description || "Untitled Masterpiece"}
                            </motion.h2>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="flex items-center gap-4 text-white/80"
                            >
                                <div className="flex items-center gap-2">
                                    <img
                                        src={currentFill.avatar || "/placeholder-user.jpg"}
                                        alt={currentFill.username}
                                        className="w-8 h-8 rounded-full border border-white/30"
                                    />
                                    <span className="font-medium text-white">{currentFill.username}</span>
                                </div>
                                <span className="w-1 h-1 bg-white/50 rounded-full" />
                                <span>{currentFill.likes} W's</span>
                                <span className="w-1 h-1 bg-white/50 rounded-full" />
                                <span>{currentFill.views || '0'} views</span>
                            </motion.div>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="flex items-center gap-4 pt-4"
                            >
                                <button
                                    onClick={() => onPlay(currentFill)}
                                    className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-red-600/30 group/btn"
                                >
                                    <div className="w-8 h-8 bg-white text-red-600 rounded-full flex items-center justify-center">
                                        <Play size={16} fill="currentColor" className="ml-0.5" />
                                    </div>
                                    Watch Now
                                </button>
                                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-3.5 rounded-full font-semibold transition-all border border-white/10">
                                    <Info size={20} />
                                    Details
                                </button>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons - Visible on Hover */}
            <div className="absolute right-8 bottom-8 flex gap-3 z-20">
                <button
                    onClick={prevSlide}
                    className="p-3 bg-black/50 hover:bg-white text-white hover:text-black border border-white/20 rounded-full transition-all backdrop-blur-md"
                >
                    <ChevronLeft size={20} />
                </button>
                <button
                    onClick={nextSlide}
                    className="p-3 bg-black/50 hover:bg-white text-white hover:text-black border border-white/20 rounded-full transition-all backdrop-blur-md"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Slide Indicators */}
            <div className="absolute bottom-8 left-8 md:left-16 flex gap-2 z-20">
                {fills.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`transition-all duration-300 rounded-full ${idx === currentIndex
                            ? 'w-8 h-2 bg-red-500'
                            : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                            }
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
