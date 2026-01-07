'use client';

import Link from 'next/link';
import { ArrowLeft, MessageCircle, Book, Mail, Shield, Users, HelpCircle } from 'lucide-react';

export default function HelpPage() {
    const helpTopics = [
        { icon: Users, title: 'Account & Profile', description: 'Manage your account settings, profile, and privacy', href: '/settings' },
        { icon: MessageCircle, title: 'Messaging', description: 'Learn about chat features and communication', href: '/chat' },
        { icon: Book, title: 'Content Creation', description: 'Create posts, Fills, Lills, and more', href: '/create-post' },
        { icon: Shield, title: 'Privacy & Safety', description: 'Protect your account and data', href: '/privacy-policy' },
        { icon: HelpCircle, title: 'FAQ', description: 'Frequently asked questions', href: '/faq' },
        { icon: Mail, title: 'Contact Support', description: 'Get in touch with our team', href: '/contact-us' },
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="flex items-center gap-4 mb-12">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-4xl font-bold">Help Center</h1>
                </div>

                {/* Search */}
                <div className="mb-12">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search for help..."
                            className="w-full px-6 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40"
                        />
                    </div>
                </div>

                {/* Help Topics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    {helpTopics.map((topic) => (
                        <Link
                            key={topic.title}
                            href={topic.href}
                            className="flex items-start gap-4 p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                        >
                            <topic.icon className="w-8 h-8 text-blue-400 flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-bold mb-1">{topic.title}</h3>
                                <p className="text-gray-400 text-sm">{topic.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Still need help */}
                <div className="text-center bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-8">
                    <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
                    <p className="text-gray-400 mb-6">Our support team is here to assist you.</p>
                    <Link href="/contact-us" className="inline-block px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors">
                        Contact Support
                    </Link>
                </div>
            </div>
        </div>
    );
}
