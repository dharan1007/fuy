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
                    className="w-40 h-52 bg-black rounded-xl overflow-hidden cursor-pointer border border-white/20 hover:border-white/80 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-300 relative group"
                    onClick={() => onClick(post)}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    {/* PUD Rendering */}
                    {post.postType === 'PULLUPDOWN' || post.feature === 'PULLUPDOWN' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-yellow-400 p-2 text-center">
                            <span className="text-4xl mb-2">📊</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 line-clamp-3">
                                {post.question || post.content}
                            </span>
                        </div>
                    ) : post.postType === 'CHAN' ? (
                        // Channel Rendering
                        <div className="w-full h-full relative">
                            <img
                                src={post.media?.[0]?.url || post.chanData?.coverImageUrl}
                                className="w-full h-full object-cover"
                                alt="Channel"
                            />
                        </div>
                    ) : post.postType === 'AUD' ? (
                        // Audio Rendering
                        <div className="w-full h-full relative">
                            <img
                                src={post.audData?.coverImageUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop"}
                                className="w-full h-full object-cover"
                                alt="Audio Cover"
                            />
                        </div>
                    ) : (post.postType === 'LILL' && !post.media?.length && !post.lillData?.videoUrl) || (post.postType === 'SIMPLE' && !post.media?.length && !post.simpleData?.mediaUrls) ? (
                        // Text Only Rendering (No Media)
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-4 text-center">
                            <p className="text-sm text-white font-medium leading-relaxed line-clamp-6 drop-shadow-md">
                                {post.content}
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
                                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                    <span className="text-3xl">🎬</span>
                                </div>
                            )}
                        </div>
                    ) : post.postType === 'CHAPTER' ? (
                        // Chapter Rendering
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] p-4 text-center">
                            <span className="text-3xl mb-2 opacity-80">📖</span>
                            <p className="text-[10px] text-white/70 line-clamp-4">
                                {post.content || "Read more..."}
                            </p>
                        </div>
                    ) : post.postType === 'XRAY' ? (
                        // XRay Rendering
                        <div className="w-full h-full bg-black relative flex flex-col items-center justify-center overflow-hidden border border-white/10">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20"></div>
                            <span className="text-5xl animate-pulse text-cyan-400">⚡</span>
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
                                <div className="w-full h-full flex items-center justify-center text-3xl bg-gray-800">
                                    📄
                                </div>
                            )}
                        </React.Fragment>
                    )}
                </div>
            </Html>
        </group>
    );
}
