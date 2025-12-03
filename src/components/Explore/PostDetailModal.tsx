import React from 'react';
import Link from 'next/link';

interface PostDetailModalProps {
    post: any;
    onClose: () => void;
}

export function PostDetailModal({ post, onClose }: PostDetailModalProps) {
    if (!post) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            <div className="relative w-full max-w-2xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-scaleIn">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-white/20 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex flex-col md:flex-row h-[80vh] md:h-auto md:max-h-[80vh]">
                    {/* Media Section */}
                    <div className="w-full md:w-1/2 bg-black flex items-center justify-center relative">
                        {post.media && post.media.length > 0 ? (
                            post.media[0].type === 'IMAGE' ? (
                                <img
                                    src={post.media[0].url}
                                    alt="Post"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <video
                                    src={post.media[0].url}
                                    controls
                                    className="w-full h-full object-contain"
                                />
                            )
                        ) : (
                            <div className="text-6xl">📄</div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="w-full md:w-1/2 p-6 flex flex-col bg-gray-900/95">
                        {/* User Info */}
                        <div className="flex items-center gap-3 mb-6">
                            <Link href={`/profile/${post.userId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                {post.user?.profile?.avatarUrl ? (
                                    <img
                                        src={post.user.profile.avatarUrl}
                                        alt={post.user.profile.displayName}
                                        className="w-10 h-10 rounded-full object-cover border border-white/20"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                        {post.user?.name?.[0] || 'U'}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold text-white">
                                        {post.user?.profile?.displayName || post.user?.name}
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                        {new Date(post.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </Link>
                        </div>

                        {/* Post Text */}
                        <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
                            <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                                {post.content}
                            </p>
                        </div>

                        {/* Stats & Actions */}
                        <div className="mt-auto pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex gap-4">
                                    <button className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-xs font-bold text-green-400 hover:bg-green-500/30 transition-colors flex items-center gap-2">
                                        <span>W</span>
                                        <span>{post.likes?.length || 0}</span>
                                    </button>
                                    <button className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-2">
                                        <span>L</span>
                                    </button>
                                    <button className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-xs font-bold text-blue-400 hover:bg-blue-500/30 transition-colors flex items-center gap-2">
                                        <span>CAP</span>
                                    </button>
                                </div>
                            </div>

                            {post.feature && (
                                <span className="inline-block px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300 font-medium">
                                    {post.feature}
                                </span>
                            )}
                        </div>

                        {/* Comments Section */}
                        <div className="mt-6 pt-6 border-t border-white/10 flex-1 overflow-hidden flex flex-col">
                            <h4 className="text-sm font-semibold text-white mb-4">Comments</h4>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4">
                                {post.comments && post.comments.length > 0 ? (
                                    post.comments.map((comment: any, i: number) => (
                                        <div key={i} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold text-white">User {i + 1}</p>
                                                <p className="text-sm text-gray-300">{comment.content || "This is a demo comment."}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-sm">No comments yet. Be the first!</p>
                                )}
                            </div>

                            {/* Add Comment Input */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Add a comment..."
                                    className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 text-xs font-bold hover:text-blue-300 px-2">
                                    POST
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
