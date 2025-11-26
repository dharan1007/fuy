'use client';

import { useRouter, useParams } from 'next/navigation';

export default function SupportPage() {
    const router = useRouter();
    const params = useParams();

    return (
        <div className="min-h-screen bg-black text-white font-mono p-6 md:p-12">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => router.push(`/shop/brand/${params.slug}/dashboard`)}
                    className="mb-8 text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                >
                    ← Back to Dashboard
                </button>

                <header className="mb-12 border-b border-white/20 pb-6">
                    <h1 className="text-4xl font-bold uppercase tracking-tighter mb-2">Customer Support</h1>
                    <p className="text-gray-500 text-sm">We're here to help you grow.</p>
                </header>

                <div className="space-y-8">
                    <div className="border border-white/20 p-8 bg-white/5">
                        <h3 className="text-xl font-bold mb-4">Contact Us</h3>
                        <form className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-500 uppercase mb-2">Subject</label>
                                <select className="w-full bg-black border border-white/20 p-3 focus:border-white outline-none">
                                    <option>General Inquiry</option>
                                    <option>Technical Issue</option>
                                    <option>Billing</option>
                                    <option>Feature Request</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 uppercase mb-2">Message</label>
                                <textarea className="w-full bg-black border border-white/20 p-3 focus:border-white outline-none h-32" placeholder="How can we help?"></textarea>
                            </div>
                            <button className="w-full py-4 bg-white text-black font-bold uppercase hover:bg-gray-200 transition-colors">
                                Send Message
                            </button>
                        </form>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="border border-white/20 p-6">
                            <h4 className="font-bold mb-2">Documentation</h4>
                            <p className="text-sm text-gray-500 mb-4">Read our guides on how to maximize your store's potential.</p>
                            <a href="#" className="text-xs uppercase border-b border-white/20 pb-1">Read Docs →</a>
                        </div>
                        <div className="border border-white/20 p-6">
                            <h4 className="font-bold mb-2">Community</h4>
                            <p className="text-sm text-gray-500 mb-4">Join our Discord server to connect with other brand owners.</p>
                            <a href="#" className="text-xs uppercase border-b border-white/20 pb-1">Join Discord →</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
