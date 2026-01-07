'use client';

import Link from 'next/link';
import { ArrowLeft, Users, Rocket, Shield, Heart } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="flex items-center gap-4 mb-12">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-4xl font-bold">About FUY Media</h1>
                </div>

                {/* Hero */}
                <div className="mb-16 text-center">
                    <div className="text-6xl mb-6">
                        <span className="text-white">f</span>
                        <span className="text-red-500">u</span>
                        <span className="text-white">y</span>
                    </div>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Connecting people authentically through meaningful content, shared experiences, and real connections.
                    </p>
                </div>

                {/* Values */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <Users className="w-10 h-10 text-blue-400 mb-4" />
                        <h3 className="text-xl font-bold mb-2">Community First</h3>
                        <p className="text-gray-400">We build features that foster genuine connections, not just engagement metrics.</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <Rocket className="w-10 h-10 text-green-400 mb-4" />
                        <h3 className="text-xl font-bold mb-2">Innovation</h3>
                        <p className="text-gray-400">Unique content formats like Fills, Lills, Xrays, and more that let you express yourself.</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <Shield className="w-10 h-10 text-orange-400 mb-4" />
                        <h3 className="text-xl font-bold mb-2">Privacy & Safety</h3>
                        <p className="text-gray-400">Your data is yours. We prioritize your privacy and security in everything we do.</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <Heart className="w-10 h-10 text-red-400 mb-4" />
                        <h3 className="text-xl font-bold mb-2">Authenticity</h3>
                        <p className="text-gray-400">Be yourself. Share your true self without fear of judgment.</p>
                    </div>
                </div>

                {/* Contact */}
                <div className="text-center bg-white/5 border border-white/10 rounded-xl p-8">
                    <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
                    <p className="text-gray-400 mb-6">Have questions or feedback? We would love to hear from you.</p>
                    <Link href="/contact-us" className="inline-block px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors">
                        Contact Us
                    </Link>
                </div>
            </div>
        </div>
    );
}
