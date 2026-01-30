'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, Loader2, Image as ImageIcon, Music } from 'lucide-react';
import { uploadFileClientSide } from '@/lib/upload-helper';
import { useCreatePost } from '@/context/CreatePostContext';
import AudioTrackManager from '@/components/audio/AudioTrackManager';

interface AudioTrack {
    id: string;
    audioAssetId: string;
    title: string;
    audioUrl: string;
    waveformData: number[];
    duration: number;
    startTime: number;
    endTime: number;
    volume: number;
    attributionText: string;
    coverImageUrl?: string;
}

type LillFormProps = {
    onBack?: () => void;
    initialData?: any;
};

export default function LillForm({ onBack: propOnBack, initialData }: LillFormProps) {
    const { onBack: contextOnBack, initialData: contextInitialData } = useCreatePost() || {};
    const onBack = propOnBack || contextOnBack || (() => { });
    const data = initialData || contextInitialData;
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Creating lill...');
    const [error, setError] = useState('');

    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);

    // Audio state
    const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
    const [videoVolume, setVideoVolume] = useState(1.0);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [showAudioSection, setShowAudioSection] = useState(false);

    // Load pre-selected audio from URL params (from "Use This Audio" button)
    useEffect(() => {
        const audioId = searchParams.get('audioId');
        if (audioId) {
            fetchAndAddAudio(audioId);
            setShowAudioSection(true);
        }
    }, [searchParams]);

    const fetchAndAddAudio = async (audioId: string) => {
        try {
            const res = await fetch(`/api/audio/${audioId}`);
            if (!res.ok) return;
            const data = await res.json();
            const audio = data.audioAsset;

            const newTrack: AudioTrack = {
                id: `track-${Date.now()}`,
                audioAssetId: audio.id,
                title: audio.title || 'Untitled Audio',
                audioUrl: audio.audioUrl,
                waveformData: audio.waveformData || [],
                duration: audio.duration,
                startTime: 0,
                endTime: Math.min(audio.duration, 60),
                volume: 1.0,
                attributionText: audio.attributionText,
                coverImageUrl: audio.coverImageUrl,
            };

            setAudioTracks([newTrack]);
        } catch (error) {
            console.error('Error fetching audio:', error);
        }
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setVideoFile(file);

            // Get video duration
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                setDuration(Math.floor(video.duration));
                URL.revokeObjectURL(video.src);
            };
            video.src = URL.createObjectURL(file);
        }
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent | React.MouseEvent, status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED') => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!videoFile) {
                throw new Error('Please select a video');
            }

            if (duration > 60) {
                throw new Error('Lills must be 60 seconds or less');
            }

            setLoadingMessage("Uploading video...");
            const publicUrl = await uploadFileClientSide(videoFile, 'VIDEO');

            let coverUrl = null;
            if (coverFile) {
                setLoadingMessage("Uploading cover image...");
                coverUrl = await uploadFileClientSide(coverFile, 'IMAGE');
            }

            setLoadingMessage("Creating lill...");

            // Prepare audio usage data
            const audioUsageData = audioTracks.map((track, index) => ({
                audioAssetId: track.audioAssetId,
                startTime: track.startTime,
                endTime: track.endTime,
                volume: track.volume,
                trackOrder: index,
                videoVolume: videoVolume,
                isMuted: isVideoMuted,
            }));

            // Create lill post
            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postType: 'LILL',
                    content,
                    visibility,
                    media: [{ url: publicUrl, type: 'VIDEO' }],
                    duration,
                    coverImageUrl: coverUrl,
                    status,
                    // Audio data
                    audioUsages: audioUsageData,
                    videoVolume: isVideoMuted ? 0 : videoVolume,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create lill');
            }

            router.push('/');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4">Create Lill (Short Video)</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Caption</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Add a caption..."
                            rows={3}
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Video (Max 60 seconds)
                        </label>
                        {videoFile ? (
                            <div className="space-y-2">
                                <div className="p-3 bg-black/20 border border-white/10 rounded-lg">
                                    <p className="text-sm">{videoFile.name}</p>
                                    <p className="text-xs text-white/60 mt-1">Duration: {duration}s</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setVideoFile(null)}
                                    className="text-sm text-red-400 hover:text-red-300"
                                >
                                    Remove video
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center justify-center gap-2 p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 cursor-pointer transition-colors">
                                <Upload className="w-6 h-6" />
                                <span>Upload Video</span>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleVideoChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    {/* Cover Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Cover Image (Optional - For Thumbnail)
                        </label>
                        {coverPreview ? (
                            <div className="space-y-2">
                                <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10">
                                    <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                                    className="text-sm text-red-400 hover:text-red-300"
                                >
                                    Remove cover
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 cursor-pointer transition-colors">
                                <ImageIcon className="w-5 h-5" />
                                <span className="text-sm">Add Cover Image</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    {/* Audio Section Toggle */}
                    {!showAudioSection ? (
                        <button
                            type="button"
                            onClick={() => setShowAudioSection(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                        >
                            <Music size={18} />
                            Add Audio Track
                        </button>
                    ) : (
                        <div className="border-t border-white/10 pt-4">
                            <AudioTrackManager
                                tracks={audioTracks}
                                onTracksChange={setAudioTracks}
                                videoVolume={videoVolume}
                                isVideoMuted={isVideoMuted}
                                onVideoVolumeChange={setVideoVolume}
                                onVideoMuteToggle={() => setIsVideoMuted(!isVideoMuted)}
                                maxDuration={60}
                                maxTracks={3}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Visibility</label>
                        <select
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value)}
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white"
                        >
                            <option value="PUBLIC">Public</option>
                            <option value="FRIENDS">Friends Only</option>
                            <option value="PRIVATE">Private</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={loading}
                        className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, 'DRAFT')}
                        disabled={loading || !videoFile}
                        className="flex-1 py-3 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-xl font-bold hover:bg-yellow-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Draft'}
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !videoFile}
                        className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <><Loader2 className="animate-spin" size={20} /> {loadingMessage}</> : 'Create Lill'}
                    </button>
                </div>
            </div>
        </form>
    );
}
