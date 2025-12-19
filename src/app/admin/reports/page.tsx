'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, MessageSquare, Trash2, ExternalLink } from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';

export default function AdminReportsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/admin/login');
        if (status === 'authenticated') fetchReports();
    }, [status]);

    const fetchReports = async () => {
        try {
            const res = await fetch('/api/admin/reports');
            const data = await res.json();
            setReports(data);
        } catch (error) {
            console.error('Failed to fetch reports', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (reportId: string, action: string) => {
        if (!confirm(`Are you sure you want to ${action} this report?`)) return;
        try {
            const res = await fetch('/api/admin/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, reportId })
            });
            if (res.ok) {
                alert('Action completed');
                fetchReports(); // Refresh
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
                        <p className="text-gray-400">Review user reports and disputes targeting FUY.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {reports.length === 0 ? <p className="text-gray-500">No pending reports.</p> :
                        reports.map((report) => (
                            <div key={report.id} className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${report.status === 'PENDING' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>{report.status}</span>
                                            <span className="text-gray-500 text-xs text-mono">#{report.id}</span>
                                            <span className="text-gray-400 text-xs">{new Date(report.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">{report.reason}</h3>
                                        <p className="text-gray-300 text-sm italic mb-4">"{report.details}"</p>

                                        <div className="bg-black/30 p-4 rounded-lg text-xs text-gray-400 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="uppercase font-bold text-gray-500 mb-1">Reporter</p>
                                                <p className="text-white text-sm">{report.reporter?.name} ({report.reporter?.email})</p>
                                            </div>
                                            <div>
                                                <p className="uppercase font-bold text-gray-500 mb-1">Target Product</p>
                                                <p className="text-blue-400 text-sm flex items-center gap-1">
                                                    {report.product?.name} <ExternalLink size={10} />
                                                </p>
                                                <p>Seller: {report.product?.seller?.name}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleAction(report.id, 'IGNORE')}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg text-xs font-bold uppercase transition-colors"
                                        >
                                            Ignore / Dismiss
                                        </button>
                                        <button
                                            onClick={() => handleAction(report.id, 'REMOVE_PRODUCT')}
                                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold uppercase transition-colors"
                                        >
                                            Remove Product
                                        </button>
                                        {/* Link to chat if exists */}
                                        {report.conversationId ? (
                                            <div className="flex gap-1">
                                                <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold uppercase text-white">Join Chat</button>
                                                <button onClick={() => deleteChat(report.conversationId)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded-lg" title="Delete Chat"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <button className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40 rounded-lg text-xs font-bold uppercase transition-colors">Start Dispute Chat</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
