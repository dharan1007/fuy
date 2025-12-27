import { useState } from 'react';
import { X, Calendar, MapPin, Globe, Users, CheckCircle, Clock } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface PlanDetailModalProps {
    plan: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function PlanDetailModal({ plan, isOpen, onClose }: PlanDetailModalProps) {
    const { data: session } = useSession();
    const [requestStatus, setRequestStatus] = useState<'IDLE' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>(() => {
        if (!plan || !session) return 'IDLE';
        const member = plan.members?.find((m: any) => m.userId === session.user.id);
        return member ? member.status : 'IDLE';
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen || !plan) return null;

    const isCreator = session?.user?.id === plan.creatorId;

    const handleInterest = async () => {
        if (!session) return;
        setLoading(true);
        try {
            // Using existing invite route or new join route?
            // Let's assume we create a join route or use invite
            const res = await fetch('/api/hopin/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: plan.id })
            });
            if (res.ok) {
                setRequestStatus('PENDING'); // Or INTERESTED
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header Image or Map Placeholder */}
                <div className="h-32 bg-gradient-to-br from-neutral-800 to-neutral-900 relative">
                    {plan.mediaUrls && JSON.parse(plan.mediaUrls)[0] ? (
                        <img src={JSON.parse(plan.mediaUrls)[0]} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                            {plan.type === 'COMMUNITY' ? '🎉' : '📅'}
                        </div>
                    )}
                    <button onClick={onClose} className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">{plan.title}</h2>
                            <div className="flex items-center text-xs text-neutral-400 gap-2">
                                <span className={`px-2 py-0.5 rounded-full border ${plan.type === 'COMMUNITY' ? 'border-purple-500/30 text-purple-400' : 'border-blue-500/30 text-blue-400'}`}>
                                    {plan.type}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Globe size={10} /> {plan.visibility}
                                </span>
                            </div>
                        </div>
                        {/* Creator Avatar - Simplified */}
                        {plan.creator && (
                            <div className="flex flex-col items-end">
                                <img src={plan.creator.profile?.avatarUrl || '/placeholder.png'} className="w-8 h-8 rounded-full bg-neutral-700" />
                                <span className="text-[10px] text-neutral-500 mt-1">{plan.creator.name}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-sm text-neutral-300 mb-6 leading-relaxed">
                        {plan.description || "No description provided."}
                    </p>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-sm text-neutral-400">
                            <Calendar size={16} />
                            <span>{plan.date ? new Date(plan.date).toLocaleString() : "No Date"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-neutral-400">
                            <MapPin size={16} />
                            <span>{plan.location || "Unknown Location"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-neutral-400">
                            <Users size={16} />
                            <span>{plan._count?.members || 1} / {plan.maxSize || '∞'} members</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4">
                        {isCreator ? (
                            <div className="w-full py-3 text-center text-sm text-neutral-500 bg-white/5 rounded-xl">
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
                                        {loading ? "Sending..." : "I'm Interested"}
                                    </button>
                                )}
                                {requestStatus === 'PENDING' && (
                                    <div className="w-full py-3 flex items-center justify-center gap-2 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20">
                                        <Clock size={16} /> Request Pending
                                    </div>
                                )}
                                {(requestStatus === 'ACCEPTED') && (
                                    <div className="space-y-2">
                                        <div className="w-full py-3 flex items-center justify-center gap-2 bg-green-500/10 text-green-500 rounded-xl border border-green-500/20">
                                            <CheckCircle size={16} /> Request Accepted
                                        </div>
                                        <button
                                            onClick={() => alert(`Your Entry Code: ${plan.members?.find((m: any) => m.userId === session?.user?.id)?.verificationCode || 'Loading...'}`)}
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
            </div>
        </div>
    );
}
