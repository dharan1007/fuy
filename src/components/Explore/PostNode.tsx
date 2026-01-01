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
                scale={1.0}
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
                    {/* Media Preview / Content Area */}
                    <div className="h-32 w-full bg-gray-900 relative overflow-hidden rounded-t-xl group-hover:scale-105 transition-transform duration-500">
                        {/* PUD Rendering */}
                        {post.postType === 'PULLUPDOWN' || post.feature === 'PULLUPDOWN' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-yellow-400 p-2 text-center">
                                <span className="text-3xl mb-1">📊</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 line-clamp-2">
                                    {post.question || post.content}
                                </span>
                            </div>
                        ) : post.postType === 'CHAN' ? (
                            // Channel Rendering
                            <div className="w-full h-full relative">
                                <img
                                    src={post.media?.[0]?.url || post.chanData?.coverImageUrl}
                                    className="w-full h-full object-cover opacity-90"
                                    alt="Channel"
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[1px]">
                                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center border border-white/20 text-white shadow-lg mb-1">
                                        <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[8px] border-l-white border-b-[4px] border-b-transparent ml-0.5"></div>
                                    </div>
                                    <span className="bg-black/60 px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider backdrop-blur-md">
                                        Channel
                                    </span>
                                </div>
                            </div>
                        ) : post.postType === 'AUD' ? (
                            // Audio Rendering
                            <div className="w-full h-full relative">
                                <img
                                    src={post.audData?.coverImageUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop"}
                                    className="w-full h-full object-cover opacity-80"
                                    alt="Audio Cover"
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[1px]">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-lg">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                        </svg>
                                    </div>
                                    <div className="mt-2 text-center px-2">
                                        <p className="text-[10px] font-bold text-white truncate w-full">{post.audData?.title || "Audio Track"}</p>
                                        <p className="text-[8px] text-white/70 truncate w-full">{post.audData?.artist || post.user?.profile?.displayName}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (post.postType === 'LILL' && !post.media?.length && !post.lillData?.videoUrl) || (post.postType === 'SIMPLE' && !post.media?.length && !post.simpleData?.mediaUrls) ? (
                            // Text Only Rendering (No Media)
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 p-4">
                                <p className="text-xs text-white/90 font-serif italic text-center leading-relaxed line-clamp-5">
                                    "{post.content}"
                                </p>
                            </div>
                        ) : post.postType === 'FILL' ? (
                            // Fill (Video) Rendering
                            <div className="w-full h-full relative bg-black">
                                {post.fillData?.thumbnailUrl ? (
                                    <img src={post.fillData.thumbnailUrl} className="w-full h-full object-cover" alt="Fill" />
                                ) : post.media?.[0]?.url ? (
                                    <video
                                        src={post.media[0].url}
                                        className="w-full h-full object-cover"
                                        muted
                                        preload="none"
                                        poster={post.media[0].thumbnailUrl}
                                        onMouseOver={e => e.currentTarget.play().catch(() => { })}
                                        onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                        <span className="text-2xl">🎬</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-black/60 rounded px-1.5 py-0.5 text-[8px] font-bold text-white border border-white/10">
                                    FILL
                                </div>
                            </div>
                        ) : post.postType === 'CHAPTER' ? (
                            // Chapter Rendering
                            <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] border-b border-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
                                <span className="text-3xl mb-2 opacity-80">📖</span>
                                <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Chapter</span>
                                <p className="text-[9px] text-white/50 mt-1 max-w-[80%] text-center truncate">
                                    {post.content || "Read more..."}
                                </p>
                            </div>
                        ) : post.postType === 'XRAY' ? (
                            // XRay Rendering
                            <div className="w-full h-full bg-black relative border border-white/10 flex flex-col items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20"></div>
                                <span className="text-4xl animate-pulse text-cyan-400">⚡</span>
                                <span className="text-[10px] font-mono text-cyan-400 mt-2">X-RAY VIEW</span>
                            </div>
                        ) : (
                            // Default / Media Fallback
                            <React.Fragment>
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
                                            muted
                                            preload="none"
                                            poster={post.media[0].thumbnailUrl || post.lillData?.thumbnailUrl}
                                            onMouseOver={e => e.currentTarget.play().catch(() => { })}
                                            onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                        />
                                    )
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl bg-gray-800">
                                        📄
                                    </div>
                                )}
                            </React.Fragment>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60" />
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
