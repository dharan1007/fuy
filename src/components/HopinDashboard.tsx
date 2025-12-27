import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Calendar, MapPin, Users, QrCode, MessageSquare, Check, X, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import CreatePlanModal from "./CreatePlanModal";

interface Plan {
    id: string;
    title: string;
    description: string;
    type: string;
    date: string | null;
    location: string | null;
    locationLink: string | null;
    isLocationLocked: boolean;
    maxSize: number | null;
    slashes: any;
    mediaUrls: any;
    _count: { members: number };
    members: any[];
    creator: { id: string; name: string };
}

export default function HopinDashboard() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'hosting' | 'joined'>('hosting');
    const [plans, setPlans] = useState<{ created: Plan[], joined: Plan[] }>({ created: [], joined: [] });
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

    // Verification Modal State
    const [verifyCode, setVerifyCode] = useState("");
    const [verifyResult, setVerifyResult] = useState<any>(null);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await fetch("/api/hopin/dashboard");
            if (res.ok) {
                const data = await res.json();
                setPlans(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (memberId: string, action: "ACCEPT" | "REJECT") => {
        try {
            const res = await fetch("/api/hopin/manage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId, action }),
            });
            if (res.ok) {
                fetchDashboard(); // Refresh
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (planId: string) => {
        if (!confirm("Are you sure you want to delete this plan?")) return;
        try {
            const res = await fetch(`/api/hopin/${planId}`, { method: "DELETE" });
            if (res.ok) {
                fetchDashboard();
            } else {
                alert("Failed to delete plan");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting plan");
        }
    };

    const handleVerify = async () => {
        if (!selectedPlan) return;
        try {
            const res = await fetch("/api/hopin/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId: selectedPlan.id, code: verifyCode }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (data.alreadyVerified) {
                    setVerifyResult({ type: "info", msg: "User is already verified!" });
                } else {
                    setVerifyResult({ type: "success", msg: `Verified ${data.user.name}!` });
                    fetchDashboard();
                }
            } else {
                setVerifyResult({ type: "error", msg: data.error || "Verification failed" });
            }
        } catch (e) {
            setVerifyResult({ type: "error", msg: "Error verifying" });
        }
    };

    if (loading) return <div className="text-white/50 text-xs p-4">Loading dashboard...</div>;

    const displayedPlans = activeTab === 'hosting' ? plans.created : plans.joined;

    return (
        <>
            <div className="flex flex-col h-full bg-black/40 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden w-full">

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('hosting')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'hosting' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Hosting
                    </button>
                    <button
                        onClick={() => setActiveTab('joined')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'joined' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Joined
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                    {displayedPlans.length === 0 && (
                        <div className="text-neutral-500 text-xs text-center py-8">
                            {activeTab === 'hosting' ? "You haven't hosted any plans yet." : "You haven't joined any plans yet."}
                        </div>
                    )}

                    {displayedPlans.map(plan => (
                        <div key={plan.id} className="bg-white/5 border border-white/10 rounded-lg p-3 group relative">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-white text-sm">{plan.title}</h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">{plan.type}</span>
                                    {activeTab === 'hosting' && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setEditingPlan(plan)}
                                                className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors"
                                                title="Edit Plan"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(plan.id)}
                                                className="p-1 hover:bg-red-500/10 rounded text-neutral-400 hover:text-red-500 transition-colors"
                                                title="Delete Plan"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1 text-xs text-neutral-400 mb-3">
                                {plan.location && <div className="flex items-center gap-1"><MapPin size={12} /> {plan.location}</div>}
                                {plan.date && <div className="flex items-center gap-1"><Calendar size={12} /> {new Date(plan.date).toLocaleDateString()}</div>}
                                <div className="flex items-center gap-1"><Users size={12} /> {plan._count?.members || 0} Members</div>
                            </div>

                            {activeTab === 'hosting' ? (
                                <>
                                    {/* Pending Requests */}
                                    <div className="space-y-2 mt-2 border-t border-white/10 pt-2">
                                        <div className="text-[10px] font-semibold text-neutral-500 uppercase">Requests</div>
                                        {plan.members.filter((m: any) => m.status === 'PENDING').length === 0 && (
                                            <div className="text-[10px] text-neutral-600">No pending requests</div>
                                        )}
                                        {plan.members.filter((m: any) => m.status === 'PENDING').map((m: any) => (
                                            <div key={m.id} className="flex items-center justify-between text-xs bg-white/5 p-2 rounded">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 bg-neutral-700 rounded-full" style={{ backgroundImage: `url(${m.user.profile?.avatarUrl})`, backgroundSize: 'cover' }} />
                                                    <span className="text-white">{m.user.profile?.displayName || m.user.name}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleAction(m.id, "ACCEPT")} className="p-1 hover:bg-green-500/20 text-green-400 rounded"><Check size={14} /></button>
                                                    <button onClick={() => handleAction(m.id, "REJECT")} className="p-1 hover:bg-red-500/20 text-red-400 rounded"><X size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => { setSelectedPlan(plan); setVerifyResult(null); setVerifyCode(""); }}
                                            className="flex-1 bg-white text-black py-1.5 rounded text-xs font-bold hover:bg-neutral-200"
                                        >
                                            Verify Attendees
                                        </button>
                                    </div>
                                </>
                            ) : (
                                // Joined View
                                <div className="mt-2 border-t border-white/10 pt-2">
                                    {plan.members.find((m: any) => m.user.id === session?.user?.id)?.status === "ACCEPTED" ? (
                                        <div className="bg-green-500/10 border border-green-500/30 rounded p-2 text-center">
                                            <span className="text-xs text-green-400 font-bold block mb-1">ACCEPTED</span>
                                            <div className="text-white text-lg font-mono tracking-widest font-bold">
                                                {plan.members.find((m: any) => m.user.id === session?.user?.id)?.verificationCode || "*******"}
                                            </div>
                                            <span className="text-[10px] text-green-400/70">Show this code to host</span>
                                        </div>
                                    ) : plan.members.find((m: any) => m.user.id === session?.user?.id)?.status === "VERIFIED" ? (
                                        <div className="text-green-400 text-xs font-bold text-center py-2">✓ YOU ARE VERIFIED</div>
                                    ) : (
                                        <div className="text-yellow-400 text-xs font-bold text-center py-2">PENDING APPROVAL</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Verification Modal / Overlay */}
                {selectedPlan && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col p-4">
                        <button onClick={() => setSelectedPlan(null)} className="absolute top-2 right-2 p-2 text-white/50 hover:text-white"><X size={20} /></button>
                        <h3 className="text-white font-bold mb-4">Verify for {selectedPlan.title}</h3>

                        <div className="flex-1 flex flex-col items-center justify-center gap-4">
                            <div className="w-full max-w-[200px]">
                                <label className="text-xs text-neutral-400 mb-1 block">Enter 7-Digit Code</label>
                                <input
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-center text-2xl tracking-widest text-white font-mono focus:border-white/50 outline-none"
                                    maxLength={7}
                                    placeholder="0000000"
                                />
                            </div>
                            <button
                                onClick={handleVerify}
                                className="w-full max-w-[200px] bg-white text-black py-3 rounded-lg font-bold hover:bg-neutral-200"
                            >
                                Verify
                            </button>

                            {verifyResult && (
                                <div className={`text-sm font-bold p-3 rounded-lg w-full text-center ${verifyResult.type === 'error' ? 'bg-red-500/20 text-red-400' : verifyResult.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {verifyResult.msg}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <CreatePlanModal
                isOpen={!!editingPlan}
                onClose={() => setEditingPlan(null)}
                initialData={editingPlan}
            />
        </>
    );
}
