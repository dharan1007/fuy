"use client";

import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Globe, Users, CheckCircle, Clock, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from '@/hooks/use-session';

type EventDetailSidebarProps = {
    plan: any;
    isOpen: boolean;
    onClose: () => void;
};

export default function EventDetailSidebar({ plan, isOpen, onClose }: EventDetailSidebarProps) {
    const { data: session } = useSession();
    const [requestStatus, setRequestStatus] = useState<'IDLE' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('IDLE');
    const [loading, setLoading] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

    // Determine request status on mount/plan change
    useEffect(() => {
        if (!plan || !session) {
            setRequestStatus('IDLE');
            return;
        }
        const member = plan.members?.find((m: any) => m.userId === session.user.id);
        setRequestStatus(member ? member.status : 'IDLE');
    }, [plan, session]);

    const isCreator = session?.user?.id === plan?.creatorId;
    const mediaUrls = plan?.mediaUrls ? (typeof plan.mediaUrls === 'string' ? JSON.parse(plan.mediaUrls) : plan.mediaUrls) : [];
    const tags = plan?.slashes ? (typeof plan.slashes === 'string' ? JSON.parse(plan.slashes) : plan.slashes) : [];

    const handleInterest = async () => {
        if (!session) return;
        setLoading(true);
        try {
            const res = await fetch('/api/hopin/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: plan.id })
            });
            if (res.ok) {
                setRequestStatus('PENDING');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const nextMedia = () => {
        if (mediaUrls.length > 0) {
            setCurrentMediaIndex((prev) => (prev + 1) % mediaUrls.length);
        }
    };

    const prevMedia = () => {
        if (mediaUrls.length > 0) {
            setCurrentMediaIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
        }
    };

    if (!plan) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#0a0a0a] border-l border-white/10 z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header with Close */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
                    <h2 className="text-lg font-bold text-white">Event Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Media Gallery */}
                    <div className="relative h-48 bg-neutral-900">
                        {mediaUrls.length > 0 ? (
                            <>
                                {mediaUrls[currentMediaIndex]?.match(/\.(mp4|webm)$/i) ? (
                                    <video
                                        src={mediaUrls[currentMediaIndex]}
                                        className="w-full h-full object-cover"
                                        controls
                                    />
                                ) : (
                                    <img
                                        src={mediaUrls[currentMediaIndex]}
                                        alt="Event media"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                {mediaUrls.length > 1 && (
                                    <>
                                        <button
                                            onClick={prevMedia}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button
                                            onClick={nextMedia}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                            {mediaUrls.map((_: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className={`w-2 h-2 rounded-full ${i === currentMediaIndex ? 'bg-white' : 'bg-white/40'}`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                                <span className="text-5xl opacity-50">
                                    {plan.type === 'COMMUNITY' ? '[ ]' : '[ ]'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Title & Type */}
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">{plan.title}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${plan.type === 'COMMUNITY'
                                    ? 'border-orange-500/30 text-orange-400 bg-orange-500/10'
                                    : 'border-neutral-500/30 text-neutral-400 bg-neutral-500/10'
                                    }`}>
                                    {plan.type}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-neutral-500">
                                    <Globe size={12} /> {plan.visibility}
                                </span>
                            </div>
                        </div>

                        {/* Creator */}
                        {plan.creator && (
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                <img
                                    src={plan.creator.profile?.avatarUrl || '/placeholder.png'}
                                    alt={plan.creator.name}
                                    className="w-10 h-10 rounded-full bg-neutral-700 object-cover"
                                />
                                <div>
                                    <div className="text-sm font-medium text-white">{plan.creator.name}</div>
                                    <div className="text-xs text-neutral-500">Event Host</div>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {plan.description && (
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">About</h4>
                                <p className="text-sm text-neutral-300 leading-relaxed">{plan.description}</p>
                            </div>
                        )}

                        {/* Details */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Details</h4>

                            <div className="flex items-center gap-3 text-sm">
                                <Calendar size={18} className="text-neutral-500" />
                                <span className="text-neutral-300">
                                    {plan.date ? new Date(plan.date).toLocaleString() : "No date set"}
                                </span>
                            </div>

                            <div className="flex items-start gap-3 text-sm">
                                <MapPin size={18} className="text-neutral-500 mt-0.5" />
                                <div>
                                    <span className="text-neutral-300">{plan.location || "Location TBD"}</span>
                                    {plan.locationLink && (
                                        <a
                                            href={plan.locationLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-white mt-1"
                                        >
                                            <ExternalLink size={12} /> View on Maps
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                                <Users size={18} className="text-neutral-500" />
                                <span className="text-neutral-300">
                                    {plan._count?.members || 1} / {plan.maxSize || 'Unlimited'} members
                                </span>
                            </div>
                        </div>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag: string, i: number) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-neutral-400"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Members Preview */}
                        {plan.members && plan.members.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Attendees</h4>
                                <div className="flex -space-x-2">
                                    {plan.members.slice(0, 5).map((member: any, i: number) => (
                                        <img
                                            key={i}
                                            src={member.user?.profile?.avatarUrl || '/placeholder.png'}
                                            alt=""
                                            className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-neutral-700 object-cover"
                                        />
                                    ))}
                                    {plan.members.length > 5 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-neutral-800 flex items-center justify-center text-xs text-neutral-400">
                                            +{plan.members.length - 5}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-white/10 bg-black/50">
                    {isCreator ? (
                        <div className="w-full py-3 text-center text-sm text-neutral-500 bg-white/5 rounded-xl border border-white/10">
                            You are the host
                        </div>
                    ) : (
                        <>
                            {requestStatus === 'IDLE' && (
                                <button
                                    onClick={handleInterest}
                                    disabled={loading}
                                    className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50"
                                >
                                    {loading ? "Sending..." : "Request to Join"}
                                </button>
                            )}
                            {requestStatus === 'PENDING' && (
                                <div className="w-full py-3 flex items-center justify-center gap-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                                    <Clock size={16} /> Request Pending
                                </div>
                            )}
                            {requestStatus === 'ACCEPTED' && (
                                <div className="space-y-2">
                                    <div className="w-full py-3 flex items-center justify-center gap-2 bg-green-500/10 text-green-500 rounded-xl border border-green-500/20">
                                        <CheckCircle size={16} /> You're In!
                                    </div>
                                    <button
                                        onClick={() => alert(`Your Entry Code: ${plan.members?.find((m: any) => m.userId === session?.user?.id)?.verificationCode || 'N/A'}`)}
                                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200"
                                    >
                                        View Ticket / Code
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
