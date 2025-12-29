'use client';

import { useSession } from '@/hooks/use-session';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowLeft, MessageSquare, AlertTriangle, Star, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';

export default function StoreSupportPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('reviews');
    const [data, setData] = useState<any>({ reviews: [], reports: [], disputes: [] });
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<any>(null); // For Chat/Detail view

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
        if (status === 'authenticated') fetchData();
    }, [status]);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/shop/store/support');
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error('Failed to fetch support data', error);
        } finally {
            setLoading(false);
        }
    };

    // Placeholder for "Delete Chat" (Delete Both)
    const deleteChat = async (conversationId: string) => {
        if (!confirm('Are you sure you want to delete this chat for BOTH parties? This act cannot be undone.')) return;
        try {
            await fetch('/api/chat/delete-both', {
                method: 'POST',
                body: JSON.stringify({ conversationId }),
                headers: { 'Content-Type': 'application/json' }
            });
            alert('Chat deleted.');
            // Refresh data or close modal
        } catch (e) {
            alert('Failed to delete chat.');
        }
    };

    if (loading) return <div className="text-white flex justify-center items-center h-screen">Loading support...</div>;

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            <SpaceBackground />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
                <button
                    onClick={() => router.push('/dashboard/store')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm uppercase font-bold tracking-widest"
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>

                <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/30 text-green-400">
                        <MessageSquare size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tight">Store Owner Support</h1>
                        <p className="text-gray-400">Manage customer reviews, reports, and disputes.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 mb-8 border-b border-white/10 pb-4">
                    <button onClick={() => setActiveTab('reviews')} className={`text-sm font-bold uppercase tracking-widest pb-4 -mb-4 border-b-2 transition-colors ${activeTab === 'reviews' ? 'border-green-400 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
                        Customer Reviews ({data.reviews.length})
                    </button>
                    <button onClick={() => setActiveTab('reports')} className={`text-sm font-bold uppercase tracking-widest pb-4 -mb-4 border-b-2 transition-colors ${activeTab === 'reports' ? 'border-red-400 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
                        Direct Reports ({data.reports.length})
                    </button>
                    <button onClick={() => setActiveTab('disputes')} className={`text-sm font-bold uppercase tracking-widest pb-4 -mb-4 border-b-2 transition-colors ${activeTab === 'disputes' ? 'border-orange-400 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
                        Admin Disputes ({data.disputes.length})
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {activeTab === 'reviews' && (
                        data.reviews.length === 0 ? <p className="text-gray-500">No reviews yet.</p> :
                            data.reviews.map((item: any) => (
                                <div key={item.id} className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm">
                                    <div className="flex justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{item.user.name}</span>
                                            <span className="text-gray-500 text-xs">reviewed</span>
                                            <span className="text-green-400 font-bold">{item.product.name}</span>
                                        </div>
                                        <div className="flex text-yellow-400 text-xs">
                                            {Array.from({ length: item.rating }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                                        </div>
                                    </div>
                                    <p className="text-gray-300 text-sm">{item.comment}</p>
                                </div>
                            ))
                    )}

                    {(activeTab === 'reports' || activeTab === 'disputes') && (
                        (activeTab === 'reports' ? data.reports : data.disputes).length === 0 ? <p className="text-gray-500">No active items.</p> :
                            (activeTab === 'reports' ? data.reports : data.disputes).map((item: any) => (
                                <div key={item.id} className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm flex justify-between items-center group hover:bg-white/[0.07] transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.status === 'PENDING' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                {item.status}
                                            </div>
                                            <span className="text-gray-400 text-xs">#{item.id.slice(-6)}</span>
                                        </div>
                                        <h3 className="font-bold text-white mb-1">{item.reason}</h3>
                                        <p className="text-xs text-gray-400">
                                            Reported by <span className="text-white">{item.reporter?.name || 'Unknown'}</span> for <span className="text-blue-400">{item.product?.name}</span>
                                        </p>
                                        <p className="text-sm text-gray-300 mt-2 italic">"{item.details}"</p>
                                        {item.adminNotes && <p className="text-xs text-orange-400 mt-2">Admin Note: {item.adminNotes}</p>}
                                    </div>

                                    <div className="flex gap-2">
                                        {/* Action Buttons */}
                                        {/* If conversationId exists, button to "Open Chat" */}
                                        {item.conversationId ? (
                                            <button
                                                // onClick={() => router.push(`/chat/${item.conversationId}`)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold uppercase"
                                            >
                                                Open Chat
                                            </button>
                                        ) : (
                                            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold uppercase text-gray-300">
                                                {activeTab === 'disputes' ? 'Waiting for Admin' : 'Reply (Coming Soon)'}
                                            </button>
                                        )}

                                        {/* Delete Chat Button (Demo) */}
                                        {item.conversationId && (
                                            <button
                                                onClick={() => deleteChat(item.conversationId)}
                                                className="p-2 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg"
                                                title="Delete Chat for Both"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                    )}
                </div>

            </div>
        </div>
    );
}
