'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ScrollStarfield from '@/components/ScrollStarfield';

// Import form components (we'll create these next)
import ChapterForm from '@/components/post-forms/ChapterForm';
import XrayForm from '@/components/post-forms/XrayForm';
import BTSForm from '@/components/post-forms/BTSForm';
import LillForm from '@/components/post-forms/LillForm';
import FillForm from '@/components/post-forms/FillForm';
import AudForm from '@/components/post-forms/AudForm';
import ChanForm from '@/components/post-forms/ChanForm';
import PullUpDownForm from '@/components/post-forms/PullUpDownForm';

type PostType = 'CHAPTER' | 'XRAY' | 'BTS' | 'LILL' | 'FILL' | 'AUD' | 'CHAN' | 'PULLUPDOWN' | null;

const POST_TYPES = [
    {
        type: 'CHAPTER' as const,
        name: 'Chapters',
        description: 'Multi-media collections with linked stories',
        icon: '📚',
        gradient: 'from-purple-500 to-pink-500',
    },
    {
        type: 'XRAY' as const,
        name: 'Xrays',
        description: 'Interactive scratch-to-reveal posts',
        icon: '🔍',
        gradient: 'from-blue-500 to-cyan-500',
    },
    {
        type: 'BTS' as const,
        name: 'BTS',
        description: 'Behind-the-scenes credits & tools',
        icon: '🎬',
        gradient: 'from-orange-500 to-red-500',
    },
    {
        type: 'LILL' as const,
        name: 'Lills',
        description: 'Short vertical videos (max 60s)',
        icon: '📱',
        gradient: 'from-green-500 to-emerald-500',
    },
    {
        type: 'FILL' as const,
        name: 'Fills',
        description: 'Long-form horizontal videos',
        icon: '🎥',
        gradient: 'from-red-500 to-rose-500',
    },
    {
        type: 'AUD' as const,
        name: 'Auds',
        description: 'Audio files with waveform',
        icon: '🎵',
        gradient: 'from-indigo-500 to-purple-500',
    },
    {
        type: 'CHAN' as const,
        name: 'Chans',
        description: 'Channels with episodes & schedules',
        icon: '📺',
        gradient: 'from-yellow-500 to-orange-500',
    },
    {
        type: 'PULLUPDOWN' as const,
        name: 'Pull Up/Down',
        description: 'Voting polls with two options',
        icon: '📊',
        gradient: 'from-teal-500 to-green-500',
    },
];

export default function CreatePostPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [selectedType, setSelectedType] = useState<PostType>(null);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        router.push('/');
        return null;
    }

    const renderForm = () => {
        switch (selectedType) {
            case 'CHAPTER':
                return <ChapterForm onBack={() => setSelectedType(null)} />;
            case 'XRAY':
                return <XrayForm onBack={() => setSelectedType(null)} />;
            case 'BTS':
                return <BTSForm onBack={() => setSelectedType(null)} />;
            case 'LILL':
                return <LillForm onBack={() => setSelectedType(null)} />;
            case 'FILL':
                return <FillForm onBack={() => setSelectedType(null)} />;
            case 'AUD':
                return <AudForm onBack={() => setSelectedType(null)} />;
            case 'CHAN':
                return <ChanForm onBack={() => setSelectedType(null)} />;
            case 'PULLUPDOWN':
                return <PullUpDownForm onBack={() => setSelectedType(null)} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
            <ScrollStarfield />

            {/* Header */}
            <header className="sticky top-0 z-50 px-4 py-4 bg-black/50 backdrop-blur-md border-b border-white/10">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    {selectedType ? (
                        <button
                            onClick={() => setSelectedType(null)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    ) : (
                        <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                    )}
                    <h1 className="text-lg font-bold">
                        {selectedType ? POST_TYPES.find(t => t.type === selectedType)?.name : 'Create Post'}
                    </h1>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </header>

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 relative z-10">
                {!selectedType ? (
                    <div>
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                Choose Your Post Type
                            </h2>
                            <p className="text-white/60">Select a format to share your content</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {POST_TYPES.map((postType) => (
                                <button
                                    key={postType.type}
                                    onClick={() => setSelectedType(postType.type)}
                                    className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-white/20 text-left overflow-hidden"
                                >
                                    {/* Gradient background on hover */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${postType.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                                    <div className="relative z-10">
                                        <div className="text-4xl mb-3">{postType.icon}</div>
                                        <h3 className="text-xl font-bold mb-2">{postType.name}</h3>
                                        <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                                            {postType.description}
                                        </p>
                                    </div>

                                    {/* Arrow indicator */}
                                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto">
                        {renderForm()}
                    </div>
                )}
            </main>
        </div>
    );
}
