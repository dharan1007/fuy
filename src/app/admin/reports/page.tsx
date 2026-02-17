'use client';

import { useSession } from '@/hooks/use-session';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, ExternalLink, Trash2, UserX, FileX } from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';

const TARGET_LABELS: Record<string, { label: string; color: string }> = {
    POST: { label: 'POST', color: 'bg-blue-500/20 text-blue-400' },
    USER: { label: 'USER', color: 'bg-orange-500/20 text-orange-400' },
    FUY: { label: 'SHOP', color: 'bg-red-500/20 text-red-400' },
    SELLER: { label: 'SELLER', color: 'bg-yellow-500/20 text-yellow-400' },
};

const STATUS_LABELS: Record<string, { color: string }> = {
    PENDING: { color: 'bg-orange-500/20 text-orange-400' },
    RESOLVED: { color: 'bg-green-500/20 text-green-400' },
    DISMISSED: { color: 'bg-gray-500/20 text-gray-400' },
};

export default function AdminReportsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('ALL');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/admin/login');
        if (status === 'authenticated') fetchReports();
    }, [status]);

    const fetchReports = async () => {
        try {
            const res = await fetch('/api/admin/reports');
            const data = await res.json();
            if (Array.isArray(data)) {
                setReports(data);
            }
        } catch (error) {
            console.error('Failed to fetch reports', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (reportId: string, action: string) => {
        if (!confirm(`Are you sure you want to ${action.replace('_', ' ').toLowerCase()} this report?`)) return;
        try {
            const res = await fetch('/api/admin/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, reportId })
            });
            if (res.ok) {
                fetchReports();
            } else {
                alert('Failed to perform action');
            }
        } catch (error) {
            alert('Failed to perform action');
        }
    };

    const deleteChat = async (conversationId: string) => {
        if (!confirm('Are you sure you want to delete this chat for BOTH parties?')) return;
        try {
            await fetch('/api/chat/delete-both', {
                method: 'POST',
                body: JSON.stringify({ conversationId }),
                headers: { 'Content-Type': 'application/json' }
            });
            alert('Chat deleted.');
        } catch (e) {
            alert('Failed to delete chat.');
        }
    };

    const filteredReports = filter === 'ALL' ? reports : reports.filter(r => {
        if (filter === 'PENDING') return r.status === 'PENDING';
        return r.target === filter;
    });

    if (loading) return <div className="text-white flex justify-center items-center h-screen">Loading admin panel...</div>;

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            <SpaceBackground />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
                <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30 text-red-400">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tight">Admin Moderation</h1>
                        <p className="text-gray-400">Review all user reports and disputes.</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {['ALL', 'PENDING', 'POST', 'USER', 'FUY', 'SELLER'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${filter === f
                                    ? 'bg-white/20 text-white border border-white/30'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                }`}
                        >
                            {f === 'FUY' ? 'SHOP' : f} ({f === 'ALL' ? reports.length : f === 'PENDING' ? reports.filter(r => r.status === 'PENDING').length : reports.filter(r => r.target === f).length})
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {filteredReports.length === 0 ? <p className="text-gray-500">No reports found.</p> :
                        filteredReports.map((report) => {
                            const targetInfo = TARGET_LABELS[report.target] || TARGET_LABELS.FUY;
                            const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.PENDING;

                            return (
                                <div key={report.id} className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusInfo.color}`}>{report.status}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${targetInfo.color}`}>{targetInfo.label}</span>
                                                <span className="text-gray-500 text-xs font-mono">#{report.id.slice(0, 8)}</span>
                                                <span className="text-gray-400 text-xs">{new Date(report.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-1">{report.reason}</h3>
                                            {report.details && <p className="text-gray-300 text-sm italic mb-4">&quot;{report.details}&quot;</p>}

                                            <div className="bg-black/30 p-4 rounded-lg text-xs text-gray-400 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="uppercase font-bold text-gray-500 mb-1">Reporter</p>
                                                    <p className="text-white text-sm">{report.reporter?.name} ({report.reporter?.email})</p>
                                                </div>

                                                {/* Show target info based on report type */}
                                                {report.target === 'USER' && report.reportedUser && (
                                                    <div>
                                                        <p className="uppercase font-bold text-gray-500 mb-1">Reported User</p>
                                                        <p className="text-white text-sm">{report.reportedUser.name} ({report.reportedUser.email})</p>
                                                    </div>
                                                )}

                                                {report.target === 'POST' && report.post && (
                                                    <div>
                                                        <p className="uppercase font-bold text-gray-500 mb-1">Reported Post</p>
                                                        <p className="text-white text-sm truncate max-w-xs">{report.post.content?.slice(0, 100)}</p>
                                                        <p className="text-gray-500 mt-1">By: {report.post.user?.name} | Type: {report.post.postType} | Status: {report.post.status}</p>
                                                    </div>
                                                )}

                                                {(report.target === 'FUY' || report.target === 'SELLER') && report.product && (
                                                    <div>
                                                        <p className="uppercase font-bold text-gray-500 mb-1">Target Product</p>
                                                        <p className="text-blue-400 text-sm flex items-center gap-1">
                                                            {report.product?.name} <ExternalLink size={10} />
                                                        </p>
                                                        <p>Seller: {report.product?.seller?.name}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions - only show for PENDING reports */}
                                        {report.status === 'PENDING' && (
                                            <div className="flex flex-col gap-2 ml-4">
                                                {/* Resolve */}
                                                <button
                                                    onClick={() => handleAction(report.id, 'RESOLVE')}
                                                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500/30 rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-1"
                                                >
                                                    <CheckCircle size={14} /> Resolve
                                                </button>

                                                {/* Dismiss */}
                                                <button
                                                    onClick={() => handleAction(report.id, 'IGNORE')}
                                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-1"
                                                >
                                                    <XCircle size={14} /> Dismiss
                                                </button>

                                                {/* Target-specific actions */}
                                                {report.target === 'POST' && report.postId && (
                                                    <button
                                                        onClick={() => handleAction(report.id, 'REMOVE_POST')}
                                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-1"
                                                    >
                                                        <FileX size={14} /> Remove Post
                                                    </button>
                                                )}

                                                {report.target === 'USER' && report.reportedUserId && (
                                                    <button
                                                        onClick={() => handleAction(report.id, 'BAN_USER')}
                                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-1"
                                                    >
                                                        <UserX size={14} /> Ban User
                                                    </button>
                                                )}

                                                {(report.target === 'FUY' || report.target === 'SELLER') && report.productId && (
                                                    <button
                                                        onClick={() => handleAction(report.id, 'REMOVE_PRODUCT')}
                                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-1"
                                                    >
                                                        <Trash2 size={14} /> Remove Product
                                                    </button>
                                                )}

                                                {/* Chat actions */}
                                                {report.conversationId && (
                                                    <div className="flex gap-1">
                                                        <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold uppercase text-white">Join Chat</button>
                                                        <button onClick={() => deleteChat(report.conversationId)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded-lg" title="Delete Chat"><Trash2 size={16} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
}
