
'use client';

import React, { useState } from 'react';
import { X, Hash } from 'lucide-react';

interface SlashInputProps {
    slashes: string[];
    onChange: (slashes: string[]) => void;
}

export default function SlashInput({ slashes, onChange }: SlashInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            addSlash();
        } else if (e.key === 'Backspace' && !inputValue && slashes.length > 0) {
            // Remove last slash if input is empty
            const newSlashes = [...slashes];
            newSlashes.pop();
            onChange(newSlashes);
        }
    };

    const addSlash = () => {
        const trimmed = inputValue.trim();
        if (!trimmed) return;

        // Ensure starts with /
        let tag = trimmed;
        if (!tag.startsWith('/')) {
            tag = '/' + tag;
        }

        // Avoid duplicates
        if (slashes.includes(tag)) {
            setInputValue('');
            return;
        }

        // Limit to 10 slashes
        if (slashes.length >= 10) return;

        onChange([...slashes, tag]);
        setInputValue('');
    };

    const removeSlash = (index: number) => {
        const newSlashes = slashes.filter((_, i) => i !== index);
        onChange(newSlashes);
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Hash size={14} /> Slashes (Concepts, Vibes, Interests)
            </label>

            <div className="flex flex-wrap gap-2 p-3 bg-black/20 border border-white/20 rounded-xl focus-within:ring-2 focus-within:ring-white/30 transition-all">
                {slashes.map((slash, index) => (
                    <span
                        key={index}
                        className="flex items-center gap-1 bg-white/10 border border-white/10 px-2 py-1 rounded-lg text-sm text-white animate-in zoom-in duration-200"
                    >
                        <span className="opacity-60 font-mono">/</span>
                        {slash.substring(1)}
                        <button
                            type="button"
                            onClick={() => removeSlash(index)}
                            className="ml-1 p-0.5 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}

                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addSlash}
                    placeholder={slashes.length === 0 ? "Type a slash (e.g. /nature) and press Enter" : "Add another..."}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30 min-w-[150px]"
                />
            </div>
            <p className="text-xs text-white/30">
                Use slashes to group your content with similar vibes. Limit 10.
            </p>
        </div>
    );
}
