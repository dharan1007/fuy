'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type BTSCardProps = {
    bts: {
        id: string;
        credits?: string | null;
        tools?: string | null;
        links?: string | null;
    };
};

export default function BTSCard({ bts }: BTSCardProps) {
    const [expanded, setExpanded] = useState(false);
    const credits = bts.credits ? JSON.parse(bts.credits) : [];
    const tools = bts.tools ? JSON.parse(bts.tools) : [];
    const links = bts.links ? JSON.parse(bts.links) : [];

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center justify-between w-full text-left"
            >
                <h3 className="text-lg font-bold">Behind The Scenes</h3>
                {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {expanded && (
                <div className="mt-4 space-y-4">
                    {credits.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-white/80 mb-2">Credits</h4>
                            <div className="space-y-1">
                                {credits.map((credit: any, i: number) => (
                                    <div key={i} className="text-sm">
                                        <span className="font-medium">{credit.name}</span>
                                        <span className="text-white/60"> - {credit.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tools.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-white/80 mb-2">Tools Used</h4>
                            <div className="flex flex-wrap gap-2">
                                {tools.map((tool: any, i: number) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1 bg-white/10 rounded-full text-xs"
                                    >
                                        {tool.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {links.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-white/80 mb-2">Resources</h4>
                            <div className="space-y-1">
                                {links.map((link: any, i: number) => (
                                    <a
                                        key={i}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-sm text-blue-400 hover:text-blue-300 underline"
                                    >
                                        {link.title || link.url}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
