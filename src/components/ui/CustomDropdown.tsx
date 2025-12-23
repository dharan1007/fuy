"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
    label: string;
    value: string;
}

interface CustomDropdownProps {
    value: string;
    options: Option[];
    onSelect: (val: string) => void;
    icon?: any;
}

export default function CustomDropdown({ value, options, onSelect, icon: Icon }: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedLabel = options.find(opt => opt.value === value)?.label || value;

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-black border border-white/20 rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-white hover:text-black transition-all min-w-[180px] justify-between shadow-[0_0_15px_rgba(255,255,255,0.05)]"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className={`w-4 h-4 ${isOpen ? 'text-black' : 'text-white'}`} />}
                    <span>{selectedLabel}</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[180px] bg-black border border-white/20 rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] max-h-60 overflow-y-auto z-50">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onSelect(option.value);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-sm transition-all border-b border-white/5 last:border-0 ${value === option.value ? 'bg-white text-black font-black' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
