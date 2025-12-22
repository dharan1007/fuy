'use client';

import React from 'react';
import SimplePostCard from './SimplePostCard';

type ChapterCardProps = {
    chapter: {
        id: string;
        title?: string;
        description?: string;
        // ... other generic post fields ...
    };
    [key: string]: any; // Allow passing parent props
};

// ChapterCard essentially reuses the SimplePostCard styling but might add specific "Chapter" badge or navigation logic later.
// For now, per requirements: "simple post type of card only".

export default function ChapterCard(props: any) {
    // If chapter data has specific fields map them to SimplePost structure if needed,
    // but likely we pass the whole post object.

    // We modify the usage: The parent passes the whole `post` object to this wrapper?
    // Or we just re-export SimplePostCard logic but customized.

    // Let's assume props match expected signature or we adapt.
    // Ideally we just reuse SimplePostCard layout.

    return (
        <div className="relative h-full">
            <div className="absolute top-2 right-2 z-20 bg-black/60 px-2 py-1 rounded text-xs border border-white/20 text-white/80">
                Chapter
            </div>
            <SimplePostCard {...props} />
        </div>
    );
}
