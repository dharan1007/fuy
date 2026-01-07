'use client';

import Link from 'next/link';
import { Shield, Users, Flag, BarChart3, Settings } from 'lucide-react';

export default function AdminPage() {
    const adminLinks = [
        { href: '/admin/moderation', title: 'Content Moderation', description: 'Review and manage reported content', icon: Shield, color: 'bg-red-500' },
        { href: '/admin/reports', title: 'Reports', description: 'View user reports and complaints', icon: Flag, color: 'bg-orange-500' },
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-10 h-10 text-red-400" />
                        <h1 className="text-4xl font-bold">Admin Panel</h1>
                    </div>
                    <p className="text-gray-400">Manage and moderate FUY Media platform</p>
                </div>

                {/* Admin Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    {adminLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="flex items-start gap-4 p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                        >
                            <div className={`p-3 ${link.color} rounded-lg`}>
                                <link.icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">{link.title}</h3>
                                <p className="text-gray-400 text-sm">{link.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Back Link */}
                <div className="text-center">
                    <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
