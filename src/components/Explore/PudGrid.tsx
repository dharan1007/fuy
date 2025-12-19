import React, { useState } from 'react';
import PullUpDownCard from '@/components/post-cards/PullUpDownCard';
import PudDetailModal from '@/components/Explore/PudDetailModal';

interface PudGridProps {
    puds: any[];
    isAuthenticated: boolean;
}

export default function PudGrid({ puds, isAuthenticated }: PudGridProps) {
    const [selectedPud, setSelectedPud] = useState<any>(null);

    return (
        <div className="w-full h-full overflow-y-auto pt-32 pb-20 px-4 md:px-8 absolute inset-0 z-10 pointer-events-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {puds.map((pud) => (
                        <div key={pud.id} onClick={() => setSelectedPud(pud)}>
                            <PullUpDownCard
                                pullUpDown={pud}
                                userVote={pud.userVote}
                                isAuthenticated={isAuthenticated}
                                onVote={(optionId) => {
                                    if (optionId === 'OPEN_MODAL') {
                                        setSelectedPud(pud);
                                    }
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <PudDetailModal
                pud={selectedPud}
                isOpen={!!selectedPud}
                onClose={() => setSelectedPud(null)}
            />
        </div>
    );
}
