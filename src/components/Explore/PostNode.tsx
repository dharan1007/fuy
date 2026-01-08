import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';

interface PostNodeProps {
    post: any;
    position: [number, number, number];
    onClick: (post: any) => void;
}

export function PostNode({ post, position, onClick }: PostNodeProps) {
    const [hovered, setHovered] = useState(false);

    // Get the best thumbnail for display
    const getThumbnail = () => {
        // LILL - prioritize cover image
        if (post.postType === 'LILL') {
            if (post.lillData?.coverImageUrl) return { type: 'IMAGE', url: post.lillData.coverImageUrl };
            if (post.lillData?.thumbnailUrl) return { type: 'IMAGE', url: post.lillData.thumbnailUrl };
            if (post.media?.[0]?.type === 'IMAGE') return post.media[0];
            if (post.media?.[0]?.thumbnailUrl) return { type: 'IMAGE', url: post.media[0].thumbnailUrl };
            if (post.media?.[0]?.url) return { type: 'VIDEO', url: post.media[0].url };
        }
        // FILL - prioritize cover image
        if (post.postType === 'FILL') {
            if (post.fillData?.coverImageUrl) return { type: 'IMAGE', url: post.fillData.coverImageUrl };
            if (post.fillData?.thumbnailUrl) return { type: 'IMAGE', url: post.fillData.thumbnailUrl };
            if (post.media?.[0]?.type === 'IMAGE') return post.media[0];
            if (post.media?.[0]?.thumbnailUrl) return { type: 'IMAGE', url: post.media[0].thumbnailUrl };
            if (post.media?.[0]?.url) return { type: 'VIDEO', url: post.media[0].url };
        }
        // AUD - cover image
        if (post.postType === 'AUD' && post.audData?.coverImageUrl) {
            return { type: 'IMAGE', url: post.audData.coverImageUrl };
        }
        // CHAN - cover
        if (post.postType === 'CHAN') {
            if (post.chanData?.coverImageUrl) return { type: 'IMAGE', url: post.chanData.coverImageUrl };
            if (post.media?.[0]?.url) return post.media[0];
        }
        // Default media
        if (post.media?.[0]) return post.media[0];
        return null;
    };

    const thumbnail = getThumbnail();

    // Determine dimensions and base style based on Type
    let sizeClasses = "w-40 h-52"; // Default Portrait
    if (post.postType === 'FILL') sizeClasses = "w-60 h-36"; // Landscape
    if (post.postType === 'LILL') sizeClasses = "w-36 h-64"; // Tall Portrait
    if (post.postType === 'PULLUPDOWN') sizeClasses = "w-48 h-48"; // Square-ish
    if (post.postType === 'CHAPTER') sizeClasses = "w-44 h-56"; // Book page ratio

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
                    pointerEvents: 'none' // Let inner div handle events
                }}
            >
                <div
                    className={`${sizeClasses} bg-black rounded-xl overflow-hidden cursor-pointer border border-white/20 hover:border-white/80 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-300 relative group pointer-events-auto`}
                    onClick={() => onClick(post)}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    {/* PUD Rendering - Poll Visuals */}
                    {post.postType === 'PULLUPDOWN' || post.feature === 'PULLUPDOWN' ? (
                        <div className="w-full h-full flex flex-col p-3 bg-gradient-to-br from-gray-800 to-gray-900">
                            <div className="flex-1 flex flex-col justify-center">
                                <span className="text-white font-bold text-sm leading-tight mb-3 line-clamp-3">
                                    {post.question || post.content}
                                </span>
                                <div className="space-y-1.5 opacity-80">
                                    {post.options?.slice(0, 3).map((opt: any, i: number) => (
                                        <div key={i} className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-white/60"
                                                style={{ width: `${Math.random() * 80 + 10}%` }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-2 flex justify-between items-center text-[9px] font-bold tracking-wider text-yellow-400">
                                <span>PUD</span>
                                <span>VOTE</span>
                            </div>
                        </div>
                    ) : post.postType === 'CHAPTER' ? (
                        <div className="w-full h-full p-4 bg-[#f5f5f0] text-black overflow-hidden relative">
                            {/* Paper texture feel */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-50 pointer-events-none"></div>

                            <h3 className="font-serif font-bold text-lg leading-tight mb-2 opacity-90 line-clamp-2">
                                {post.title || "Untitled Chapter"}
                            </h3>
                            <p className="font-serif text-[10px] leading-relaxed opacity-80 line-clamp-[8] text-justify">
                                {post.content || "..."}
                            </p>
                            <div className="absolute bottom-2 right-3 text-[8px] font-bold uppercase tracking-wider opacity-50">
                                Chapter
                            </div>
                        </div>
                    ) : post.postType === 'XRAY' ? (
                        <div className="w-full h-full bg-black relative flex flex-col items-center justify-center overflow-hidden">
                            {post.xrayData?.topLayerUrl ? (
                                <img src={post.xrayData.topLayerUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="XRay" />
                            ) : (
                                <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-white/20">X-RAY</span>
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center backdrop-blur-sm bg-black/20">
                                    <span className="text-[10px] font-bold tracking-widest text-white">REVEAL</span>
                                </div>
                            </div>
                        </div>
                    ) : thumbnail ? (
                        // Show thumbnail content
                        <div className="w-full h-full relative bg-black">
                            {thumbnail.type === 'IMAGE' ? (
                                <img
                                    src={thumbnail.url}
                                    alt={post.content || "Post"}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <video
                                    src={thumbnail.url}
                                    className="w-full h-full object-cover"
                                    muted
                                    preload="metadata"
                                    poster={thumbnail.thumbnailUrl}
                                    onMouseOver={e => e.currentTarget.play().catch(() => { })}
                                    onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                />
                            )}
                            {/* Type badge */}
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[7px] font-bold uppercase tracking-wider text-white border border-white/10">
                                {post.postType}
                            </div>

                            {/* Gradient overlay for text readability if needed */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>

                            <div className="absolute bottom-3 left-3 right-3">
                                <p className="text-[10px] font-medium text-white line-clamp-2 leading-snug drop-shadow-md">
                                    {post.content}
                                </p>
                            </div>
                        </div>
                    ) : (
                        // Text-only content (Simple Posts)
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-4 text-center relative overflow-hidden">
                            {/* Abstract background shape */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

                            <p className="text-sm text-white font-medium leading-relaxed line-clamp-6 drop-shadow-md relative z-10">
                                {post.content || "View post"}
                            </p>
                        </div>
                    )}

                    {/* User avatar overlay - Tiny */}
                    {post.user?.profile?.avatarUrl && (
                        <div className="absolute top-2 left-2 w-5 h-5 rounded-full overflow-hidden border border-white/50 shadow-sm z-20">
                            <img src={post.user.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
            </Html>
        </group>
    );
}

