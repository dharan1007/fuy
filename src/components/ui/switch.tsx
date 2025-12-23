"use client";

import * as React from "react";

interface SwitchProps {
    checked: boolean;
    onToggle: (checked: boolean) => void;
    disabled?: boolean;
}

export default function Switch({ checked, onToggle, disabled = false }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onToggle(!checked)}
            className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none 
                ${checked ? 'bg-white' : 'bg-zinc-800 border border-white/20'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            <span
                className={`
                    inline-block h-4 w-4 transform rounded-full transition-transform 
                    ${checked ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white'}
                `}
            />
        </button>
    );
}
