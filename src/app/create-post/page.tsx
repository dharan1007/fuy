'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, BookOpen, Search, Smartphone, Film, Music, Tv, PieChart, Image as ImageIcon, FileEdit } from 'lucide-react';
import Link from 'next/link';
import ScrollStarfield from '@/components/ScrollStarfield';
import DraftsList from '@/components/DraftsList';

// Import form components
import SimpleForm from '@/components/post-forms/SimpleForm';
import ChapterForm from '@/components/post-forms/ChapterForm';
import XrayForm from '@/components/post-forms/XrayForm';
import LillForm from '@/components/post-forms/LillForm';
import FillForm from '@/components/post-forms/FillForm';
import AudForm from '@/components/post-forms/AudForm';
import ChanForm from '@/components/post-forms/ChanForm';
import PullUpDownForm from '@/components/post-forms/PullUpDownForm';

type PostType = 'SIMPLE' | 'CHAPTER' | 'XRAY' | 'LILL' | 'FILL' | 'AUD' | 'CHAN' | 'PULLUPDOWN' | null;

const POST_TYPES = [
    {
        type: 'SIMPLE' as const,
        name: 'Simple',
        description: 'Photos & Videos (Max 8)',
        icon: <ImageIcon size={32} />,
        gradient: 'from-pink-500 to-rose-500',
    },
    {
        type: 'CHAPTER' as const,
        name: 'Chapters',
        description: 'Multi-media collections with linked stories',
        icon: <BookOpen size={32} />,
        gradient: 'from-purple-500 to-pink-500',
    },
    {
        type: 'XRAY' as const,
        name: 'Xrays',
        description: 'Interactive scratch-to-reveal posts',
        icon: <Search size={32} />,
        gradient: 'from-blue-500 to-cyan-500',
    },
    {
        type: 'LILL' as const,
        name: 'Lills',
        description: 'Short vertical videos (max 60s)',
        icon: <Smartphone size={32} />,
        gradient: 'from-green-500 to-emerald-500',
    },
    {
        type: 'FILL' as const,
        name: 'Fills',
        description: 'Long-form horizontal videos',
        icon: <Film size={32} />,
        gradient: 'from-red-500 to-rose-500',
    },
    {
        type: 'AUD' as const,
        name: 'Auds',
        description: 'Audio files with waveform',
        icon: <Music size={32} />,
        gradient: 'from-indigo-500 to-purple-500',
    },
    {
        type: 'CHAN' as const,
        name: 'Chans',
        description: 'Channels with episodes & schedules',
        icon: <Tv size={32} />,
        gradient: 'from-yellow-500 to-orange-500',
    },
    {
        type: 'PULLUPDOWN' as const,
        name: 'PUDS',
        description: 'Voting polls with two options',
        icon: <PieChart size={32} />,
        gradient: 'from-teal-500 to-green-500',
    },
];

export default function CreatePostPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [selectedType, setSelectedType] = useState<PostType>(null);
    const [showDrafts, setShowDrafts] = useState(false);
    const [draftPost, setDraftPost] = useState<any>(null);

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

    const handleDraftSelect = (draft: any) => {
        setDraftPost(draft);
        // Map draft type to PostType if necessary, assuming it matches
        setSelectedType(draft.postType as PostType);
        setShowDrafts(false);
    };

    const handleBack = () => {
        setSelectedType(null);
        setDraftPost(null);
    };

    const renderForm = () => {
        const props = { onBack: handleBack };
        // Only passing initialData to PUD for now as requested, others can ignore or be updated later
        const pProps = { ...props, initialData: draftPost };

        switch (selectedType) {
            case 'SIMPLE':
                return <SimpleForm {...props} />;
            case 'CHAPTER':
                return <ChapterForm {...props} />;
            case 'XRAY':
                return <XrayForm {...props} />;
            case 'LILL':
                return <LillForm {...props} />;
            case 'FILL':
                return <FillForm {...props} />;
            case 'AUD':
                return <AudForm {...props} />;
            case 'CHAN':
                return <ChanForm {...props} />;
            case 'PULLUPDOWN':
                return <PullUpDownForm {...pProps} />;
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
                            onClick={handleBack}
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

                    {/* Drafts Button */}
                    <button
                        onClick={() => setShowDrafts(true)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                        title="Drafts"
                    >
                        <FileEdit className="w-6 h-6" />
                    </button>
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
                                        <div className="text-white/80 group-hover:text-white transition-colors mb-3">
                                            {postType.icon}
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{postType.name}</h3>
                                        <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                                            {postType.description}
                                        </p>
                                    </div>

                                    {/* Arrow indicator */}
                                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowLeft className="w-6 h-6 rotate-180" />
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

            {/* Drafts Modal */}
            {showDrafts && (
                <DraftsList
                    onClose={() => setShowDrafts(false)}
                    onSelectDraft={handleDraftSelect}
                />
            )}
        </div>
    );
}
