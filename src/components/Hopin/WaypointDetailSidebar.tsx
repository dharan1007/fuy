"use client";

import { X, MapPin, Navigation, Trash2, Edit3 } from 'lucide-react';

type WaypointDetailSidebarProps = {
    waypoint: { lat: number; lng: number; label: string; index: number } | null;
    isOpen: boolean;
    onClose: () => void;
    onDelete?: (index: number) => void;
    onCreatePlan?: (data: { lat: number; lng: number; name?: string }) => void;
};

export default function WaypointDetailSidebar({
    waypoint,
    isOpen,
    onClose,
    onDelete,
    onCreatePlan
}: WaypointDetailSidebarProps) {
    // if (!waypoint) return null; // Removed check. Handle in JSX.

    // Hooks would be here if any. Component has no hooks but for consistency:

    if (!waypoint) return null;

    const handleDelete = () => {
        if (onDelete) {
            onDelete(waypoint.index);
            onClose();
        }
    };

    const handleCreatePlan = () => {
        if (onCreatePlan) {
            onCreatePlan({ lat: waypoint.lat, lng: waypoint.lng, name: waypoint.label });
            onClose();
        }
    };

    const openInMaps = () => {
        window.open(`https://www.google.com/maps?q=${waypoint.lat},${waypoint.lng}`, '_blank');
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm bg-[#0a0a0a] border-l border-white/10 z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
                    <h2 className="text-lg font-bold text-white">Waypoint Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {/* Waypoint Info */}
                    <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                            <MapPin size={32} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">{waypoint.label}</h3>
                        <p className="text-sm text-neutral-500">Point #{waypoint.index + 1}</p>
                    </div>

                    {/* Coordinates */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Coordinates</h4>
                        <div className="space-y-2 font-mono text-sm">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Latitude</span>
                                <span className="text-white">{waypoint.lat.toFixed(6)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Longitude</span>
                                <span className="text-white">{waypoint.lng.toFixed(6)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handleCreatePlan}
                            className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <Edit3 size={18} />
                            Create Event Here
                        </button>

                        <button
                            onClick={openInMaps}
                            className="w-full py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                        >
                            <Navigation size={18} />
                            Open in Google Maps
                        </button>

                        <button
                            onClick={handleDelete}
                            className="w-full py-3 bg-transparent border border-red-500/30 text-red-400 font-medium rounded-xl hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} />
                            Remove Waypoint
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
