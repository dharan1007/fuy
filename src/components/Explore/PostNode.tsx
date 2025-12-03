import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';

interface PostNodeProps {
    post: any; // Using any for flexibility with the existing Post type
    position: [number, number, number];
    onClick: (post: any) => void;
}

export function PostNode({ post, position, onClick }: PostNodeProps) {
    const [hovered, setHovered] = useState(false);

    return (
        <group position={position}>
            <mesh visible={true}>
                <sphereGeometry args={[0.1]} />
                <meshBasicMaterial color="red" transparent opacity={0.5} />
            </mesh>
            <Html
                transform
                scale={0.5}
                style={{
                    transition: 'all 0.2s',
                    opacity: 1,
                    transform: `scale(${hovered ? 1.2 : 1})`,
                }}
            >
                <div
                    className="w-40 h-52 bg-black/40 backdrop-blur-md rounded-xl border border-white/20 cursor-pointer hover:border-white/60 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 group relative"
                    onClick={() => onClick(post)}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    {/* Media Preview */}
                    <div className="h-32 w-full bg-gray-900 relative overflow-hidden rounded-t-xl">
                        {post.media && post.media.length > 0 ? (
                            post.media[0].type === 'IMAGE' ? (
                                <img
                                    src={post.media[0].url}
                                    alt="Post"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <video
                                    src={post.media[0].url}
                                    className="w-full h-full object-cover"
                                />
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                                📄
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />
                    </div>

                    {/* Mini Content */}
                    <div className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            {post.user?.profile?.avatarUrl ? (
                                <img
                                    src={post.user.profile.avatarUrl}
                                    className="w-5 h-5 rounded-full border border-white/30"
                                    alt="Avatar"
                                />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-600 border border-white/30" />
                            )}
                            <span className="text-[10px] text-white/90 font-medium truncate">
                                {post.user?.profile?.displayName || post.user?.name || 'User'}
                            </span>
                        </div>
                        <p className="text-[9px] text-white/70 line-clamp-2 leading-tight">
                            {post.content}
                        </p>

                        <div className="flex gap-2 mt-2">
                            <button
                                className="px-2 py-1 rounded bg-green-500/20 border border-green-500/30 text-[8px] font-bold text-green-400 hover:bg-green-500/30 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('W post:', post.id);
                                }}
                            >
                                W {post.likes?.length || 0}
                            </button>
                            <button
                                className="px-2 py-1 rounded bg-red-500/20 border border-red-500/30 text-[8px] font-bold text-red-400 hover:bg-red-500/30 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('L post:', post.id);
                                }}
                            >
                                L
                            </button>
                            <button
                                className="px-2 py-1 rounded bg-blue-500/20 border border-blue-500/30 text-[8px] font-bold text-blue-400 hover:bg-blue-500/30 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('CAP post:', post.id);
                                }}
                            >
                                CAP
                            </button>
                        </div>

                        {/* Camera / Video Reaction Button */}
                        <div className="absolute bottom-2 right-2">
                            <button
                                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm border border-white/20"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Open camera for reaction');
                                }}
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Floating Reaction Bubbles */}
                    <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-1 pointer-events-none">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="w-6 h-6 rounded-full border-2 border-black bg-gray-800 overflow-hidden animate-bounce"
                                style={{ animationDelay: `${i * 0.2}s` }}
                            >
                                <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.id}-${i}`}
                                    alt="Reaction"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </Html>
        </group>
    );
}
