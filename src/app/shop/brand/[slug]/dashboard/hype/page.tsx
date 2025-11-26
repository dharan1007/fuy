'use client';

import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';

export default function HypeUpPage() {
    const router = useRouter();
    const params = useParams();

    const tiers = [
        {
            name: "Spark",
            price: "$9.99",
            duration: "24 Hours",
            reach: "~1k Impressions",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            )
        },
        {
            name: "Flash",
            price: "$29.99",
            duration: "3 Days",
            reach: "~5k Impressions",
            popular: true,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            )
        },
        {
            name: "Thunder",
            price: "$99.99",
            duration: "1 Week",
            reach: "~20k Impressions",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 13-7 7-7-7m14-8-7 7-7-7" /></svg>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white font-mono p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                <button
                    onClick={() => router.push(`/shop/brand/${params.slug}/dashboard`)}
                    className="mb-8 text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                >
                    ← Back to Dashboard
                </button>

                <header className="mb-16 text-center">
                    <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter mb-4 flex items-center justify-center gap-4">
                        <span className="text-yellow-400">⚡</span> Hype Up
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Boost your brand's visibility across the entire platform. Get featured on the homepage and top of search results.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {tiers.map((tier, i) => (
                        <motion.div
                            key={tier.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`relative border p-8 flex flex-col items-center text-center group cursor-pointer hover:bg-white/5 transition-colors ${tier.popular ? 'border-yellow-400 bg-yellow-400/5' : 'border-white/20 bg-white/5'}`}
                            onClick={() => alert(`Selected ${tier.name} Boost!`)}
                        >
                            {tier.popular && (
                                <span className="absolute top-0 -translate-y-1/2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 uppercase tracking-widest">
                                    Most Popular
                                </span>
                            )}
                            <div className={`mb-6 p-4 rounded-full ${tier.popular ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white'}`}>
                                {tier.icon}
                            </div>
                            <h3 className="text-2xl font-bold uppercase mb-2">{tier.name}</h3>
                            <div className="text-4xl font-bold mb-2">{tier.price}</div>
                            <p className="text-gray-500 text-sm mb-8">{tier.duration}</p>

                            <ul className="space-y-4 mb-8 text-sm">
                                <li className="flex items-center gap-2 justify-center">
                                    <span className="text-green-400">✓</span> {tier.reach}
                                </li>
                                <li className="flex items-center gap-2 justify-center">
                                    <span className="text-green-400">✓</span> Homepage Feature
                                </li>
                                <li className="flex items-center gap-2 justify-center">
                                    <span className="text-green-400">✓</span> Search Priority
                                </li>
                            </ul>

                            <button className={`w-full py-3 font-bold uppercase tracking-widest transition-colors ${tier.popular ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-white text-black hover:bg-gray-200'}`}>
                                Select Plan
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
