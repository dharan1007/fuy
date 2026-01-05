"use client";

import { Award, Briefcase, GraduationCap, Heart, MapPin, Music, Star, Zap } from "lucide-react";

interface ProfileDetailsSectionProps {
    profile: any;
}

export default function ProfileDetailsSection({ profile }: ProfileDetailsSectionProps) {
    // Helper to safely parse arrays/JSON
    const getList = (val: any) => {
        if (Array.isArray(val)) return val;
        if (typeof val === "string") {
            try {
                return JSON.parse(val);
            } catch {
                return [];
            }
        }
        return [];
    };

    const hasContent = (val: any) => {
        if (!val) return false;
        if (Array.isArray(val) && val.length === 0) return false;
        if (typeof val === 'string' && !val.trim()) return false;
        return true;
    };

    // Sections Data Structure
    type SectionItem = { label: string; value: any; type?: "tags" | "list"; tagColor?: string; italic?: boolean };

    const sections: { title: string; icon: JSX.Element; items: SectionItem[] }[] = [
        {
            title: "The Professional",
            icon: <Briefcase size={18} className="text-blue-400" />,
            items: [
                { label: "Work History", value: profile.workHistory },
                { label: "Education", value: profile.education },
                { label: "Achievements", value: profile.achievements },
                { label: "Skills", value: getList(profile.skills), type: "tags" },
            ].filter(i => hasContent(i.value)) as SectionItem[],
        },
        {
            title: "Vibe Check",
            icon: <Zap size={18} className="text-amber-400" />,
            items: [
                { label: "Interaction Mode", value: profile.interactionMode },
                { label: "Life is like...", value: profile.lifeIsLike, italic: true },
                { label: "Best Vibe Time", value: profile.bestVibeTime },
                { label: "Vibe With People", value: profile.vibeWithPeople },
            ].filter(i => hasContent(i.value)) as SectionItem[],
        },
        {
            title: "Deep Dive",
            icon: <Heart size={18} className="text-red-400" />,
            items: [
                { label: "Emotional Fit", value: profile.emotionalFit },
                { label: "Care About", value: profile.careAbout },
                { label: "Protective About", value: profile.protectiveAbout },
                { label: "Values", value: getList(profile.values), type: "tags" },
                { label: "Hard Nos", value: getList(profile.hardNos), type: "tags", tagColor: "bg-red-900/40 text-red-200 border-red-800" },
            ].filter(i => hasContent(i.value)) as SectionItem[],
        },
        {
            title: "Favorites",
            icon: <Star size={18} className="text-purple-400" />,
            items: [
                { label: "Top Movies", value: getList(profile.topMovies), type: "list" },
                { label: "Top Songs", value: getList(profile.topSongs), type: "list" },
                { label: "Top Foods", value: getList(profile.topFoods), type: "list" },
                { label: "Top Games", value: getList(profile.topGames), type: "list" },
            ].filter(i => hasContent(i.value)) as SectionItem[],
        }
    ].filter(s => s.items.length > 0);

    if (sections.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {sections.map((section) => (
                <div key={section.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                        <div className="p-2 bg-white/10 rounded-lg">
                            {section.icon}
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">{section.title}</h3>
                    </div>

                    <div className="space-y-6">
                        {section.items.map((item, idx) => (
                            <div key={idx}>
                                <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">{item.label}</h4>
                                {item.type === "tags" ? (
                                    <div className="flex flex-wrap gap-2">
                                        {(item.value as string[]).map((tag, tIdx) => (
                                            <span key={tIdx} className={`px-3 py-1 text-sm font-bold rounded-lg border ${item.tagColor || "bg-white/10 text-white border-white/10"}`}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                ) : item.type === "list" ? (
                                    <ul className="space-y-1">
                                        {(item.value as string[]).map((li, lIdx) => (
                                            <li key={lIdx} className="text-gray-300 font-medium text-sm flex items-center gap-2">
                                                <span className="w-1 h-1 bg-white/50 rounded-full" />
                                                {li}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className={`text-white leading-relaxed ${item.italic ? "italic text-lg font-serif text-white/80" : "font-medium"}`}>
                                        {item.value as string}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
