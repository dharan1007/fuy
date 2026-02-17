import React, { useState, useCallback, useMemo } from 'react';
import { Html } from '@react-three/drei';

interface PostNodeProps {
    post: any;
    position: [number, number, number];
    onClick: (post: any) => void;
}

// Memoized PostNode for better performance
export const PostNode = React.memo(function PostNode({ post, position, onClick }: PostNodeProps) {
    const [hovered, setHovered] = useState(false);

    // Memoized thumbnail getter
    const thumbnail = useMemo(() => {
        // LILL/FILL - prioritize cover
        if (post.lillData?.coverImageUrl) return { type: 'IMAGE', url: post.lillData.coverImageUrl };
        if (post.fillData?.coverImageUrl) return { type: 'IMAGE', url: post.fillData.coverImageUrl };
        if (post.audData?.coverImageUrl) return { type: 'IMAGE', url: post.audData.coverImageUrl };
        if (post.chanData?.coverImageUrl) return { type: 'IMAGE', url: post.chanData.coverImageUrl };
        if (post.xrayData?.topLayerUrl) return { type: 'IMAGE', url: post.xrayData.topLayerUrl };

        // Default media
        if (post.media?.[0]) return post.media[0];
        return null;
    }, [post]);

    // Memoized size classes
    const sizeClasses = useMemo(() => {
        switch (post.postType) {
            case 'FILL': return "w-48 h-28";
            case 'LILL': return "w-28 h-48";
            case 'PULLUPDOWN': return "w-36 h-36";
            case 'CHAPTER': return "w-36 h-44";
            default: return "w-32 h-40";
        }
    }, [post.postType]);

    // Memoized handlers
    const handleClick = useCallback(() => onClick(post), [onClick, post]);
    const handleMouseEnter = useCallback(() => setHovered(true), []);
    const handleMouseLeave = useCallback(() => setHovered(false), []);

    return (
        <group position={position}>
            <Html
                transform
                scale={0.8}
                style={{
                    transition: 'transform 0.15s ease-out',
                    transform: `scale(${hovered ? 1.1 : 1})`,
                    pointerEvents: 'none'
                }}
                distanceFactor={10}
                zIndexRange={[0, 10]}
            >
                <div
                    className={`${sizeClasses} bg-black/90 rounded-lg overflow-hidden cursor-pointer border border-white/20 hover:border-white/60 transition-all duration-200 relative pointer-events-auto shadow-xl`}
                    onClick={handleClick}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* PUD - minimal poll visual */}
                    {(post.postType === 'PULLUPDOWN') ? (
                        <div className="w-full h-full flex flex-col p-2 bg-gradient-to-br from-gray-800 to-gray-900">
                            <span className="text-white font-semibold text-[10px] leading-tight mb-2 line-clamp-2">
                                {post.question || post.content}
                            </span>
                            <div className="flex-1 flex flex-col justify-center gap-1 opacity-70">
                                {[1, 2, 3].map((_, i) => (
                                    <div key={i} className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-white/50" style={{ width: `${40 + i * 15}%` }} />
                                    </div>
                                ))}
                            </div>
                            <span className="text-[8px] text-yellow-400 font-bold mt-1">PUD</span>
                        </div>
                    ) : post.postType === 'CHAPTER' ? (
                        <div className="w-full h-full p-2 bg-amber-50 text-black">
                            <h3 className="font-serif font-bold text-[10px] leading-tight mb-1 line-clamp-2">
                                {post.title || "Untitled"}
                            </h3>
                            <p className="font-serif text-[8px] opacity-70 line-clamp-4">
                                {post.content || "..."}
                            </p>
                            <span className="absolute bottom-1 right-2 text-[7px] opacity-40">Chapter</span>
                        </div>
                    ) : thumbnail ? (
                        <div className="w-full h-full relative bg-black">
                            {/* Always use image for performance - no video autoplay */}
                            <img
                                src={thumbnail.thumbnailUrl || thumbnail.url}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                            {/* Minimal overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <span className="absolute top-1 right-1 px-1 py-0.5 bg-black/60 rounded text-[6px] font-bold text-white/80">
                                {post.postType}
                            </span>
                            {post.content && (
                                <p className="absolute bottom-1 left-1 right-1 text-[8px] text-white line-clamp-2 drop-shadow">
                                    {post.content}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 p-2">
                            <p className="text-[9px] text-white/80 leading-snug line-clamp-4 text-center">
                                {post.content || "View post"}
                            </p>
                        </div>
                    )}

                    {/* User avatar - tiny */}
                    {post.user?.profile?.avatarUrl && (
                        <div className="absolute top-1 left-1 w-4 h-4 rounded-full overflow-hidden border border-white/40">
                            <img src={post.user.profile.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                    )}
                </div>
            </Html>
        </group>
    );
});
