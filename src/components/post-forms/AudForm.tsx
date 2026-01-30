'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, Music, Image as ImageIcon } from 'lucide-react';
import { uploadFileClientSide } from '@/lib/upload-helper';
import { useCreatePost } from '@/context/CreatePostContext';
import AudioWaveform from '@/components/audio/AudioWaveform';
import { generateWaveformFromFile, formatDuration } from '@/lib/audio-processing';
import { generateFingerprint, generateFingerprintChunks } from '@/lib/audio-fingerprint';

type AudFormProps = {
    onBack?: () => void;
    initialData?: any;
};

export default function AudForm({ onBack: propOnBack, initialData }: AudFormProps) {
    const { onBack: contextOnBack, initialData: contextInitialData } = useCreatePost() || {};
    const onBack = propOnBack || contextOnBack || (() => { });
    const data = initialData || contextInitialData;
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Creating audio post...');
    const [error, setError] = useState('');

    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [genre, setGenre] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [isReusable, setIsReusable] = useState(true);

    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const [processingAudio, setProcessingAudio] = useState(false);

    const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAudioFile(file);
            setProcessingAudio(true);

            try {
                // Generate waveform data
                const waveform = await generateWaveformFromFile(file, 100);
                setWaveformData(waveform.peaks);
                setDuration(waveform.duration);
            } catch (err) {
                console.error('Error processing audio:', err);
                // Fallback to basic duration detection
                const audio = document.createElement('audio');
                audio.preload = 'metadata';
                audio.onloadedmetadata = () => {
                    setDuration(audio.duration);
                    URL.revokeObjectURL(audio.src);
                };
                audio.src = URL.createObjectURL(file);
            } finally {
                setProcessingAudio(false);
            }
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
            if (!audioFile) {
                throw new Error('Please select an audio file');
            }

            setLoadingMessage("Uploading audio...");
            const audioUrl = await uploadFileClientSide(audioFile, 'AUDIO');

            let coverUrl = null;
            if (coverFile) {
                setLoadingMessage("Uploading cover image...");
                coverUrl = await uploadFileClientSide(coverFile, 'IMAGE');
            }

            setLoadingMessage("Processing audio fingerprint...");

            // Generate fingerprint for the audio
            let fingerprintChunks: Array<{
                spectrogramHash: string;
                frequencyPeaks: string;
                chromaFeatures: string | null;
                mfccData: string | null;
                tempoSignature: number | null;
                keySignature: string | null;
                chunkIndex: number;
                chunkDuration: number;
            }> = [];
            try {
                // Convert File to ArrayBuffer for fingerprinting
                const arrayBuffer = await audioFile.arrayBuffer();
                const fingerprint = await generateFingerprint(arrayBuffer);
                fingerprintChunks = generateFingerprintChunks(fingerprint);
            } catch (err) {
                console.error('Error generating fingerprint:', err);
                // Continue without fingerprint if it fails
            }

            setLoadingMessage("Creating audio post...");

            // Create audio asset first
            const audioAssetRes = await fetch('/api/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audioUrl,
                    title: title || null,
                    duration: Math.floor(duration),
                    waveformData,
                    coverImageUrl: coverUrl,
                    genre: genre || null,
                    isReusable,
                    fingerprintChunks: fingerprintChunks.map((chunk, index) => ({
                        spectrogramHash: chunk.spectrogramHash,
                        frequencyPeaks: chunk.frequencyPeaks,
                        chromaFeatures: chunk.chromaFeatures,
                        mfccData: chunk.mfccData,
                        tempoSignature: chunk.tempoSignature,
                        keySignature: chunk.keySignature,
                        chunkIndex: index,
                        chunkDuration: 5,
                    })),
                }),
            });

            if (!audioAssetRes.ok) {
                const data = await audioAssetRes.json();
                throw new Error(data.error || 'Failed to create audio asset');
            }

            const { audioAsset } = await audioAssetRes.json();

            // Create the post linked to the audio asset
            const postRes = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postType: 'AUD',
                    content,
                    visibility,
                    media: [{ url: audioUrl, type: 'AUDIO' }],
                    duration: Math.floor(duration),
                    coverImageUrl: coverUrl,
                    waveformData: JSON.stringify(waveformData),
                    artist: artist || null,
                    title: title || null,
                    genre: genre || null,
                    status,
                    originalAudioAssetId: audioAsset.id,
                }),
            });

            if (!postRes.ok) {
                const data = await postRes.json();
                throw new Error(data.error || 'Failed to create audio post');
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
                <h3 className="text-xl font-bold mb-4">Create Audio Post</h3>

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Name your audio..."
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Add a description..."
                            rows={2}
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40 resize-none"
                        />
                    </div>

                    {/* Artist & Genre Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Artist (Optional)</label>
                            <input
                                type="text"
                                value={artist}
                                onChange={(e) => setArtist(e.target.value)}
                                placeholder="Artist name"
                                className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Genre (Optional)</label>
                            <select
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                                className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white"
                            >
                                <option value="">Select genre</option>
                                <option value="Pop">Pop</option>
                                <option value="Hip-Hop">Hip-Hop</option>
                                <option value="Electronic">Electronic</option>
                                <option value="Rock">Rock</option>
                                <option value="R&B">R&B</option>
                                <option value="Jazz">Jazz</option>
                                <option value="Classical">Classical</option>
                                <option value="Country">Country</option>
                                <option value="Ambient">Ambient</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Audio Upload */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Audio File</label>
                        {audioFile ? (
                            <div className="space-y-3">
                                <div className="p-4 bg-black/20 border border-white/10 rounded-xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                            <Music size={18} className="text-white/60" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm truncate">{audioFile.name}</p>
                                            <p className="text-xs text-white/60">
                                                {processingAudio ? 'Processing...' : formatDuration(duration)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Waveform Preview */}
                                    {waveformData.length > 0 && (
                                        <AudioWaveform
                                            waveformData={waveformData}
                                            duration={duration}
                                            height={48}
                                            activeColor="rgba(255,255,255,0.5)"
                                            inactiveColor="rgba(255,255,255,0.2)"
                                        />
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAudioFile(null);
                                        setWaveformData([]);
                                        setDuration(0);
                                    }}
                                    className="text-sm text-red-400 hover:text-red-300"
                                >
                                    Remove audio
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center justify-center gap-2 p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 cursor-pointer transition-colors">
                                <Upload className="w-6 h-6" />
                                <span>Upload Audio</span>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleAudioChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    {/* Cover Image */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Cover Art (Optional)
                        </label>
                        {coverPreview ? (
                            <div className="space-y-2">
                                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/10">
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
                            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 cursor-pointer transition-colors w-32 h-32">
                                <ImageIcon className="w-5 h-5" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    {/* Reusability Toggle */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div>
                            <p className="text-sm font-medium">Allow others to use this audio</p>
                            <p className="text-xs text-white/50 mt-0.5">
                                Other users can add this audio to their posts
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsReusable(!isReusable)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${isReusable ? 'bg-emerald-500' : 'bg-white/20'
                                }`}
                        >
                            <span
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isReusable ? 'left-7' : 'left-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Visibility */}
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
                        disabled={loading || !audioFile || processingAudio}
                        className="flex-1 py-3 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-xl font-bold hover:bg-yellow-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Draft'}
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !audioFile || processingAudio}
                        className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <><Loader2 className="animate-spin" size={20} /> {loadingMessage}</> : 'Create Audio'}
                    </button>
                </div>
            </div>
        </form>
    );
}
