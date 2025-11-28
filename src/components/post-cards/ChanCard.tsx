'use client';

import React, { useState } from 'react';
import { Play, Tv } from 'lucide-react';

type ChanCardProps = {
    chan: {
        id: string;
        channelName: string;
        description?: string | null;
        coverImageUrl?: string | null;
        episodes: string;
    };
};

export default function ChanCard({ chan }: ChanCardProps) {
    const episodes = JSON.parse(chan.episodes || '[]');
    const [selectedEpisode, setSelectedEpisode] = useState(0);

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        {chan.coverImageUrl ? (
                            <img
                                src={chan.coverImageUrl}
                                alt={chan.channelName}
                                className="w-full h-full object-cover rounded-xl"
                            />
                        ) : (
                            <Tv className="w-6 h-6" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{chan.channelName}</h3>
                        {chan.description && (
                            <p className="text-sm text-white/60 truncate">{chan.description}</p>
                        )}
                    </div>
                </div>
            </div>

            {episodes.length > 0 && (
                <div className="p-4">
                    <div className="aspect-video bg-black rounded-xl overflow-hidden mb-3">
                        <video
                            src={episodes[selectedEpisode].url}
                            poster={episodes[selectedEpisode].thumbnail}
                            controls
                            className="w-full h-full"
                        />
                    </div>

                    <h4 className="font-semibold mb-2">{episodes[selectedEpisode].title}</h4>

                    {episodes.length > 1 && (
                        <div className="space-y-2">
                            <p className="text-xs text-white/60 font-medium">More Episodes</p>
                            <div className="grid grid-cols-3 gap-2">
                                {episodes.slice(0, 6).map((episode: any, i: number) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedEpisode(i)}
                                        className={`aspect-video bg-black/20 rounded-lg overflow-hidden border-2 transition-colors ${i === selectedEpisode ? 'border-white' : 'border-transparent'
                                            }`}
                                    >
                                        {episode.thumbnail ? (
                                            <img
                                                src={episode.thumbnail}
                                                alt={episode.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Play className="w-6 h-6" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
