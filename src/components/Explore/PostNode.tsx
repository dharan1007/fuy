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
                            <span className="text-2xl mb-2">Vote</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 line-clamp-3">
                                {post.question || post.content}
                            </span>
                        </div>
                    ) : post.postType === 'CHAPTER' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] p-4 text-center">
                            <span className="text-2xl mb-2 opacity-80">Chapter</span>
                            <p className="text-[10px] text-white/70 line-clamp-4">
                                {post.content || "Read more..."}
                            </p>
                        </div>
                    ) : post.postType === 'XRAY' ? (
                        <div className="w-full h-full bg-black relative flex flex-col items-center justify-center overflow-hidden border border-white/10">
                            {post.xrayData?.topLayerUrl ? (
                                <img src={post.xrayData.topLayerUrl} className="w-full h-full object-cover" alt="XRay" />
                            ) : (
                                <>
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20"></div>
                                    <span className="text-3xl animate-pulse text-cyan-400">X-Ray</span>
                                </>
                            )}
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
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[8px] font-bold uppercase tracking-wider">
                                {post.postType}
                            </div>
                        </div>
                    ) : (
                        // Text-only content
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-black p-4 text-center">
                            <p className="text-sm text-white font-medium leading-relaxed line-clamp-6 drop-shadow-md">
                                {post.content || "View post"}
                            </p>
                        </div>
                    )}

                    {/* User avatar overlay */}
                    {post.user?.profile?.avatarUrl && (
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full overflow-hidden border border-white/30">
                            <img src={post.user.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
            </Html>
        </group>
    );
}

