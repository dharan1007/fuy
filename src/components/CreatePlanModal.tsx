"use client";

import { useState, useRef, useEffect } from "react";
import { X, MapPin, Calendar, Hash, Image as ImageIcon, Search, Check } from "lucide-react";

interface CreatePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLocation?: string;
    locationData?: {
        lat: number;
        lng: number;
        name: string;
    };
    initialData?: any;
}

export default function CreatePlanModal({ isOpen, onClose, currentLocation, locationData, initialData }: CreatePlanModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: initialData?.title || "",
        description: initialData?.description || "",
        type: initialData?.type || "SOLO",
        location: initialData?.location || currentLocation || "", // Prefer initialData, then string prop
        locationLink: initialData?.locationLink || "",
        isLocationLocked: initialData?.isLocationLocked || false,
        latitude: initialData?.latitude || locationData?.lat || null,
        longitude: initialData?.longitude || locationData?.lng || null,
        visibility: initialData?.visibility || "PRIVATE", // PRIVATE, FOLLOWERS, PUBLIC
        date: initialData?.date ? new Date(initialData.date).toISOString().slice(0, 16) : "",
        maxSize: initialData?.maxSize || 5,
        slashes: initialData?.tags ? JSON.parse(initialData.tags) : [] as string[],
        mediaUrls: initialData?.mediaUrls ? ((typeof initialData.mediaUrls === 'string') ? JSON.parse(initialData.mediaUrls) : initialData.mediaUrls) : [] as string[]
    });

    // Update lat/lng if currentLocation is provided as object (need to update props type first)
    // We'll rely on setFormData exposed or useEffect if props change.

    // Actually, let's just use what we have. API needs lat/lng.
    // If we rely on passed props, we need to update the component signature.

    useEffect(() => {
        if (locationData && !initialData) {
            setFormData(prev => ({
                ...prev,
                location: locationData.name,
                latitude: locationData.lat,
                longitude: locationData.lng
            }));
        } else if (currentLocation && !initialData) {
            // Fallback if only string provided
            setFormData(prev => ({ ...prev, location: currentLocation }));
        }
    }, [locationData, currentLocation, initialData]);

    const [slashInput, setSlashInput] = useState("");
    const [mediaItems, setMediaItems] = useState<{ file?: File; preview: string; type: 'IMAGE' | 'VIDEO' }[]>(
        (formData.mediaUrls || []).map((url: string) => ({
            preview: url,
            type: url.match(/\.(mp4|webm)$/i) ? 'VIDEO' : 'IMAGE'
        }))
    );
    const [uploading, setUploading] = useState(false);

    // Invite System States
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Debounced search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const res = await fetch(`/api/users/search?q=${searchQuery}`);
                const data = await res.json();
                setSearchResults(data.users || []);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const toggleUser = (user: any) => {
        if (selectedUsers.find(u => u.id === user.id)) {
            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            // Limit to 5
            if (mediaItems.length + newFiles.length > 5) return;

            const newItems = newFiles.map(file => ({
                file,
                preview: URL.createObjectURL(file),
                type: file.type.startsWith('video/') ? 'VIDEO' as const : 'IMAGE' as const
            }));
            setMediaItems(prev => [...prev, ...newItems]);
        }
    };

    const removeMedia = (index: number) => {
        setMediaItems(prev => {
            const newItems = [...prev];
            URL.revokeObjectURL(newItems[index].preview);
            newItems.splice(index, 1);
            return newItems;
        });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // 1. Upload NEW Media
            const existingUrls = mediaItems.filter(i => !i.file).map(i => i.preview);
            const newItems = mediaItems.filter(i => i.file);

            let uploadedUrls: string[] = [];
            if (newItems.length > 0) {
                setUploading(true);
                const uploadPromises = newItems.map(async (item) => {
                    if (!item.file) return null;
                    const fd = new FormData();
                    fd.append('file', item.file);
                    fd.append('type', item.type === 'VIDEO' ? 'video' : 'image');
                    const res = await fetch('/api/upload', { method: 'POST', body: fd });
                    if (!res.ok) throw new Error('Upload failed');
                    return res.json();
                });
                const results = await Promise.all(uploadPromises);
                uploadedUrls = results.map(r => r?.url).filter(Boolean);
                setUploading(false);
            }

            const finalMediaUrls = [...existingUrls, ...uploadedUrls];

            const endpoint = initialData ? `/api/hopin/${initialData.id}` : "/api/hopin/create";
            const method = initialData ? "PATCH" : "POST";

            const payload = {
                ...formData,
                mediaUrls: finalMediaUrls,
                tags: JSON.stringify(formData.slashes),
                // Ensure lat/lng are passed if set
            };

            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                const planId = data.plan?.id || initialData?.id;

                // Send Invites if any
                if (planId && selectedUsers.length > 0) {
                    await fetch('/api/hopin/invite', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            planId,
                            userIds: selectedUsers.map(u => u.id)
                        })
                    });
                }

                onClose();
                window.location.reload();
            }
        } catch (e) {
            console.error(e);
            alert("Failed to save plan");
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/50">
                    <h3 className="text-white font-bold text-lg">{initialData ? "Edit Plan" : "Create Hopin Plan"}</h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {/* Type Selection */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setFormData({ ...formData, type: "SOLO" })}
                            className={`p-4 rounded-xl border text-center transition-all ${formData.type === 'SOLO' ? 'bg-white text-black border-white' : 'bg-transparent text-neutral-400 border-white/10 hover:border-white/30'}`}
                        >
                            <div className="font-bold text-lg mb-1">Solo</div>
                            <div className="text-[10px] opacity-70">Just for me</div>
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, type: "COMMUNITY" })}
                            className={`p-4 rounded-xl border text-center transition-all ${formData.type === 'COMMUNITY' ? 'bg-white text-black border-white' : 'bg-transparent text-neutral-400 border-white/10 hover:border-white/30'}`}
                        >
                            <div className="font-bold text-lg mb-1">Community</div>
                            <div className="text-[10px] opacity-70">Invite others</div>
                        </button>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-neutral-400 mb-1 block">Title</label>
                            <input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Midnight Run"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-white/30 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-neutral-400 mb-1 block">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="What's the plan?"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-white/30 outline-none h-20 resize-none"
                            />
                        </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-neutral-400 mb-1 block">Location Name</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-3 text-neutral-500" />
                                <input
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g. Central Park"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 text-white text-sm focus:border-white/30 outline-none"
                                />
                            </div>
                        </div>

                        {/* Location Link & Lock */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-neutral-400 mb-1 block">Google Maps Link</label>
                                <input
                                    value={formData.locationLink}
                                    onChange={e => setFormData({ ...formData, locationLink: e.target.value })}
                                    placeholder="https://maps.google.com/..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-white/30 outline-none"
                                />
                            </div>
                            <div className="w-20">
                                <label className="text-xs text-neutral-400 mb-1 block">Lock Loc?</label>
                                <button
                                    onClick={() => setFormData(p => ({ ...p, isLocationLocked: !p.isLocationLocked }))}
                                    className={`w-full h-[46px] rounded-lg border flex items-center justify-center transition-colors ${formData.isLocationLocked ? 'bg-red-500/20 border-red-500/50 text-red-500' : 'bg-white/5 border-white/10 text-neutral-400'}`}
                                >
                                    {formData.isLocationLocked ? "LOCKED" : "OPEN"}
                                </button>
                            </div>
                        </div>

                        {/* Media Upload */}
                        <div>
                            <label className="text-xs text-neutral-400 mb-1 block">Photos/Videos (Max 5)</label>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {mediaItems.map((item, i) => (
                                    <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-white/5 border border-white/10 group">
                                        {item.type === 'VIDEO' ? (
                                            <video src={item.preview} className="w-full h-full object-cover opacity-80" />
                                        ) : (
                                            <img src={item.preview} alt="prev" className="w-full h-full object-cover opacity-80" />
                                        )}
                                        <button onClick={() => removeMedia(i)} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-red-500"><X size={10} /></button>
                                    </div>
                                ))}
                                {mediaItems.length < 5 && (
                                    <label className="flex-shrink-0 w-20 h-20 rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 text-neutral-500 hover:text-white transition-colors">
                                        <ImageIcon size={20} />
                                        <span className="text-[10px] mt-1">Add</span>
                                        <input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-neutral-400 mb-1 block">Date & Time</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-3 text-neutral-500" />
                                <input
                                    type="datetime-local"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 text-white text-sm focus:border-white/30 outline-none [color-scheme:dark]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Community Options */}
                    {formData.type === 'COMMUNITY' && (
                        <div className="space-y-4 border-t border-white/10 pt-4">
                            <div>
                                <label className="text-xs text-neutral-400 mb-1 block">Max Participants: {formData.maxSize}</label>
                                <input
                                    type="range"
                                    min="2"
                                    max="50"
                                    value={formData.maxSize}
                                    onChange={e => setFormData({ ...formData, maxSize: parseInt(e.target.value) })}
                                    className="w-full accent-white"
                                />
                            </div>

                            {/* Invite Section */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Invite People</label>

                                {/* Selected Users */}
                                {selectedUsers.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {selectedUsers.map(u => (
                                            <div key={u.id} className="flex items-center gap-1 bg-white/10 border border-white/20 text-white px-2 py-1 rounded-full text-xs font-bold">
                                                <span>{u.name}</span>
                                                <button onClick={() => toggleUser(u)} className="ml-1 hover:text-red-400"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-neutral-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search users to invite..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30"
                                    />
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <div className="max-h-32 overflow-y-auto bg-black border border-white/10 rounded-lg mt-2">
                                        {searchResults.map(user => {
                                            const isSelected = selectedUsers.some(u => u.id === user.id);
                                            return (
                                                <button
                                                    key={user.id}
                                                    onClick={() => toggleUser(user)}
                                                    className="w-full flex items-center justify-between p-2 hover:bg-white/10 transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-neutral-700 overflow-hidden">
                                                            {user.image ? <img src={user.image} className="w-full h-full object-cover" /> : null}
                                                        </div>
                                                        <span className="text-sm text-white">{user.name}</span>
                                                    </div>
                                                    {isSelected && <Check size={14} className="text-green-500" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Slashes */}
                            <div>
                                <label className="text-xs text-neutral-400 mb-1 block">Tags (Slashes)</label>
                                <div className="flex gap-2 mb-2 flex-wrap">
                                    {formData.slashes.map((s: string) => (
                                        <span key={s} onClick={() => setFormData({ ...formData, slashes: formData.slashes.filter(x => x !== s) })} className="bg-white/10 px-2 py-1 rounded text-xs cursor-pointer hover:bg-red-500/20">#{s}</span>
                                    ))}
                                </div>
                                <div className="relative">
                                    <Hash size={16} className="absolute left-3 top-3 text-neutral-500" />
                                    <input
                                        value={slashInput}
                                        onChange={e => setSlashInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && slashInput) {
                                                e.preventDefault();
                                                if (!formData.slashes.includes(slashInput)) {
                                                    setFormData({ ...formData, slashes: [...formData.slashes, slashInput] });
                                                }
                                                setSlashInput("");
                                            }
                                        }}
                                        placeholder="Add tag and press Enter"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 text-white text-sm focus:border-white/30 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 bg-black/50">
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !formData.title}
                        className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? "Saving..." : (initialData ? "Save Changes" : "Create Plan")}
                    </button>
                </div>
            </div>
        </div>
    );
}
