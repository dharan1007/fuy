"use client";

import { useMemo, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import useSWR from "swr";

type ProfileCardProps = {
    userId?: string;
    uniqueCode?: string;
    isOwnProfile?: boolean;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProfileCardSection({ userId, uniqueCode, isOwnProfile }: ProfileCardProps) {
    // If uniqueCode is provided, we can fetch by code, otherwise by userId.
    // Ideally parent passes the data, but we can also fetch.
    // Let's assume passed props, but if we need to fetch specifically card data:
    const queryString = uniqueCode ? `?code=${uniqueCode}` : (userId ? `?userId=${userId}` : '');
    const { data: cardData, error } = useSWR(queryString ? `/api/profile-card${queryString}` : isOwnProfile ? "/api/profile-card?mine=true" : null, fetcher);

    const [copied, setCopied] = useState(false);

    if (!cardData || cardData.error) {
        if (isOwnProfile) return null; // Should handle creation in edit mode
        return null;
    }

    const { uniqueCode: code, content, user } = cardData;
    const sections = content.sections || [];
    const basicInfo = content.basicInfo || {};

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 px-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Profile Card
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                        Digital ID
                    </span>
                </h2>
                {/* Code Display */}
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 transition cursor-pointer"
                >
                    <span className="font-mono font-bold tracking-widest text-sm text-gray-900 dark:text-white">
                        {code}
                    </span>
                    {copied ? <span className="text-xs text-green-600">Copied!</span> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
            </div>

            {/* Card Visual */}
            <div className="relative w-full aspect-[1.8/1] sm:aspect-[2.5/1] overflow-x-auto snap-x snap-mandatory flex gap-4 scrollbar-hide py-2">
                {/* Basic Info Card */}
                <div className="snap-center shrink-0 w-[85%] sm:w-[350px] h-[450px] rounded-3xl p-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Background effects */}
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full border-4 border-white/20 mb-4 overflow-hidden bg-white/10">
                            {user?.profile?.avatarUrl ? (
                                <img src={user.profile.avatarUrl} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white/50">
                                    {basicInfo.name?.[0] || "?"}
                                </div>
                            )}
                        </div>
                        <h3 className="text-2xl font-bold mb-1">{basicInfo.name || user.name}</h3>
                        <p className="text-white/80 text-sm mb-4">{basicInfo.occupation || "Member"}</p>

                        <div className="flex gap-4 w-full justify-center">
                            {basicInfo.age && (
                                <div className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-center">
                                    <span className="block text-[10px] uppercase opacity-70">Age</span>
                                    <span className="font-bold">{basicInfo.age}</span>
                                </div>
                            )}
                            {basicInfo.location && (
                                <div className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-center">
                                    <span className="block text-[10px] uppercase opacity-70">Loc</span>
                                    <span className="font-bold">{basicInfo.location}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="absolute bottom-4 text-[10px] opacity-40 tracking-[0.2em] font-light">
                        FUY • PROFILE CARD
                    </div>
                </div>

                {/* Custom Sections cards */}
                {sections.map((section: any) => (
                    <div key={section.id} className="snap-center shrink-0 w-[85%] sm:w-[350px] h-[450px] rounded-3xl p-6 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-xl relative overflow-hidden flex flex-col">
                        <h3 className="text-lg font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-6 pb-2 border-b border-gray-100 dark:border-neutral-700">
                            {section.title}
                        </h3>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {section.questions.map((q: any) => (
                                <div key={q.id}>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                        {q.question}
                                    </p>
                                    <p className="text-gray-900 dark:text-white font-medium text-base">
                                        {q.answer || "—"}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="absolute bottom-4 right-6 text-[10px] opacity-20 tracking-[0.2em] font-light text-right">
                            CARD • {section.title.toUpperCase()}
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-2 sm:hidden">Swipe to see more</p>
        </div>
    );
}
