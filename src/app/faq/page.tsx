'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface FAQItem {
    question: string;
    answer: string;
    category: string;
}

const faqs: FAQItem[] = [
    { category: 'Account', question: 'How do I create an account?', answer: 'Click "Sign Up" on the homepage and follow the registration process. You can use your email or sign up with a social account.' },
    { category: 'Account', question: 'How do I reset my password?', answer: 'Go to the login page and click "Forgot Password". Enter your email address and follow the instructions sent to your inbox.' },
    { category: 'Account', question: 'How do I delete my account?', answer: 'Go to Settings > Account > Delete Account. Please note this action is permanent and cannot be undone.' },
    { category: 'Content', question: 'What types of posts can I create?', answer: 'You can create Standard posts, Fills (videos), Lills (short clips), Xrays (layered content), Auds (audio), and Channels.' },
    { category: 'Content', question: 'How do I report inappropriate content?', answer: 'Click the three dots menu on any post and select "Report". Choose the reason and submit. Our moderation team will review it.' },
    { category: 'Privacy', question: 'Who can see my posts?', answer: 'You control visibility for each post. Options include Public (everyone), Friends (only friends), and Private (only you).' },
    { category: 'Privacy', question: 'How do I block someone?', answer: 'Visit their profile, click the menu icon, and select "Block". They will not be able to see your content or contact you.' },
    { category: 'Shop', question: 'How do I buy products?', answer: 'Browse the Shop, add items to your cart, and proceed to checkout. We accept various payment methods.' },
    { category: 'Shop', question: 'How do I become a seller?', answer: 'Go to Dashboard > Store and apply to become a seller. Once approved, you can list your products.' },
];

export default function FAQPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('All');

    const categories = ['All', ...new Set(faqs.map(f => f.category))];
    const filteredFaqs = activeCategory === 'All' ? faqs : faqs.filter(f => f.category === activeCategory);

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="flex items-center gap-4 mb-12">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-4xl font-bold">FAQ</h1>
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === cat
                                    ? 'bg-white text-black'
                                    : 'bg-white/10 text-white hover:bg-white/20'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* FAQ Items */}
                <div className="space-y-3">
                    {filteredFaqs.map((faq, index) => (
                        <div key={index} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                            >
                                <span className="font-medium pr-4">{faq.question}</span>
                                {openIndex === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {openIndex === index && (
                                <div className="px-4 pb-4 text-gray-400 border-t border-white/10 pt-4">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Help link */}
                <div className="mt-12 text-center text-gray-400">
                    <p>Did not find what you were looking for?</p>
                    <Link href="/help" className="text-blue-400 hover:underline">Visit our Help Center</Link>
                </div>
            </div>
        </div>
    );
}
