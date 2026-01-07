'use client';

import Link from 'next/link';
import { ArrowLeft, Tv, Construction } from 'lucide-react';

export default function ChannelPage() {
    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <div className="text-center max-w-md px-4">
                <div className="relative inline-block mb-6">
                    <Tv className="w-20 h-20 text-red-400" />
                    <Construction className="w-8 h-8 text-yellow-400 absolute -bottom-1 -right-1" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Channel Studio</h1>
                <p className="text-gray-400 mb-8">
                    Broadcasting and live streaming features are coming soon. Create your own channel to share shows, streams, and exclusive content with your audience.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/" className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors">
                        Go Home
                    </Link>
                    <Link href="/dots" className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-full font-semibold hover:bg-white/20 transition-colors">
                        Watch Content
                    </Link>
                </div>
            </div>
        </div>
    );
}
