import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export const Linkify = ({ children, className }: { children: string; className?: string }) => {
    const parts = children.split(URL_REGEX);

    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (part.match(URL_REGEX)) {
                    return (
                        <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline break-all"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </span>
    );
};
