'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SpaceBackground } from "@/components/SpaceBackground";

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    useEffect(() => {
        fetch('/api/shop/orders')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setOrders(data);
                setLoading(false);
            })
            .catch(err => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans">
            <SpaceBackground />

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm uppercase font-bold tracking-widest"
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>

                <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400">
                        <ShoppingBag size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tight">Your Orders</h1>
                        <p className="text-gray-400">Track history, review products, and manage reports.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-400 animate-pulse">Loading order history...</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 italic border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
                        No orders found. Time to go shopping!
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                                    <div className="text-xs uppercase font-bold text-gray-400">
                                        Order <span className="text-mono text-white">#{order.id.slice(-6)}</span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {order.items.map((item: any) => {
                                        const images = item.product.images ? JSON.parse(item.product.images) : [];
                                        const image = images[0]?.url || images[0] || '';
                                        return (
                                            <div key={item.id} className="flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-16 w-16 bg-gray-800 rounded-lg overflow-hidden border border-white/10">
                                                        {image ? <img src={image} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-700" />}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white text-base">{item.product.name}</h3>
                                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                                            Sold by <span className="text-blue-400 hover:underline cursor-pointer">{item.product.seller?.name || 'Unknown'}</span>
                                                        </p>
                                                        <p className="text-sm font-mono text-green-400 mt-1">${item.product.price}</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <button
                                                        onClick={() => { setSelectedItem({ orderId: order.id, productId: item.product.id, name: item.product.name, sellerId: item.product.seller?.name }); setShowReviewModal(true); }}
                                                        className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg text-xs font-bold uppercase hover:bg-green-500/20 transition-colors"
                                                    >
                                                        Review
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedItem({ orderId: order.id, productId: item.product.id, name: item.product.name, sellerName: item.product.seller?.name }); setShowReportModal(true); }}
                                                        className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold uppercase hover:bg-red-500/20 transition-colors"
                                                    >
                                                        Report
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {showReportModal && selectedItem && (
                    <ReportModal
                        item={selectedItem}
                        onClose={() => setShowReportModal(false)}
                    />
                )}
                {showReviewModal && selectedItem && (
                    <ReviewModal
                        item={selectedItem}
                        onClose={() => setShowReviewModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function ReportModal({ item, onClose }: { item: any, onClose: () => void }) {
    const [target, setTarget] = useState<'SELLER' | 'FUY'>('SELLER');
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');

    const submit = async () => {
        await fetch('/api/shop/reports', {
            method: 'POST',
            body: JSON.stringify({
                target, reason, details: details,
                productId: item.productId,
                orderId: item.orderId
            })
        });
        alert('Report submitted!');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-left">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gray-900 border border-white/20 p-6 rounded-2xl w-full max-w-md relative z-50 shadow-2xl shadow-red-900/20">
                <h3 className="text-xl font-bold text-white mb-4">Report "{item.name}"</h3>

                <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase font-bold block mb-2">Who do you want to report to?</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setTarget('SELLER')} className={`p-3 rounded-lg border text-sm font-bold ${target === 'SELLER' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/20'}`}>
                            Seller ({item.sellerName})
                        </button>
                        <button onClick={() => setTarget('FUY')} className={`p-3 rounded-lg border text-sm font-bold ${target === 'FUY' ? 'bg-red-600 text-white border-red-500' : 'bg-transparent text-gray-400 border-white/20'}`}>
                            FUY (Admin)
                        </button>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (e.g., Damaged item)" className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-white/50 outline-none placeholder-gray-600" />
                    <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Provide more details..." className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-white/50 outline-none h-24 placeholder-gray-600" />
                </div>

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-xs font-bold uppercase transition-colors">Cancel</button>
                    <button onClick={submit} className="px-6 py-2 bg-white text-black rounded-lg text-xs font-bold uppercase hover:bg-gray-200 transition-colors">Submit Report</button>
                </div>
            </motion.div>
        </div>
    );
}

function ReviewModal({ item, onClose }: { item: any, onClose: () => void }) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const submit = async () => {
        alert('Review submitted (API Pending)');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-left">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gray-900 border border-white/20 p-6 rounded-2xl w-full max-w-md relative z-50 shadow-2xl shadow-green-900/20">
                <h3 className="text-xl font-bold text-white mb-4">Review "{item.name}"</h3>
                <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} onClick={() => setRating(star)} className={`text-2xl transition-colors ${star <= rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</button>
                    ))}
                </div>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write your review..." className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-white/50 outline-none h-24 mb-6 placeholder-gray-600" />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-xs font-bold uppercase transition-colors">Cancel</button>
                    <button onClick={submit} className="px-6 py-2 bg-green-500 text-black rounded-lg text-xs font-bold uppercase hover:bg-green-400 transition-colors">Post Review</button>
                </div>
            </motion.div>
        </div>
    );
}
