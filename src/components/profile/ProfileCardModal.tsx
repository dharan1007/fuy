
import { useRef, useState, useEffect, ChangeEvent } from "react";
import { X, Camera, Eye, Users, Globe, Save, Info, Heart, Star, Sparkles, AlertCircle, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadFileClientSide } from "@/lib/upload-helper";

interface ProfileCardModalProps {
    isOpen: boolean;
    closeModal: () => void;
    profile: any;
    isOwnProfile: boolean;
    onUpdate?: () => void;
}

export function ProfileCardModal({ isOpen, closeModal, profile: initialProfile, isOwnProfile, onUpdate }: ProfileCardModalProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);

    // Sync state with props when opened or verified
    useEffect(() => {
        setProfile(initialProfile);
        setBgImage(initialProfile.cardBackgroundUrl || null);
        const settings = typeof initialProfile.cardSettings === 'string'
            ? JSON.parse(initialProfile.cardSettings)
            : (initialProfile.cardSettings || {});
        setSettings(settings);
    }, [initialProfile, isOpen]);

    // Local state for edits
    const [profile, setProfile] = useState(initialProfile);
    const [bgImage, setBgImage] = useState<string | null>(initialProfile.cardBackgroundUrl || null);
    const [bgFile, setBgFile] = useState<File | null>(null);

    // Parse Settings (Visibility)
    const initialSettings = typeof initialProfile.cardSettings === 'string'
        ? JSON.parse(initialProfile.cardSettings)
        : (initialProfile.cardSettings || {});

    const [settings, setSettings] = useState<Record<string, string>>(initialSettings);

    const toggleVisibility = (field: string) => {
        setSettings((prev: Record<string, string>) => ({
            ...prev,
            [field]: prev[field] === 'followers' ? 'public' : 'followers'
        }));
    };

    const updateField = (field: string, value: any) => {
        setProfile((prev: any) => ({ ...prev, [field]: value }));
    };

    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollNext = () => {
        if (scrollRef.current) {
            const cardWidth = scrollRef.current.firstElementChild?.clientWidth || 0;
            scrollRef.current.scrollBy({ left: cardWidth + 24, behavior: 'smooth' }); // 24 is gap
        }
    };

    const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setBgFile(file);
            setBgImage(URL.createObjectURL(file));
        }
    };

    const saveChanges = async () => {
        const payload: any = {};
        const fieldsToSave = [
            "displayName", "name", "dob", "city", "location", "height", "weight",
            "conversationStarter", "workHistory", "education", "achievements",
            "lifeIsLike", "interactionMode", "bestVibeTime", "vibeWithPeople",
            "emotionalFit", "pleaseDont", "careAbout", "protectiveAbout", "distanceMakers",
            "goals", "lifestyle",
            "skills", "topMovies", "topSongs", "topFoods", "topGames",
            "values", "hardNos", "topGenres", "topPlaces", "currentlyInto",
            "dislikes", "icks", "interactionTopics", "stalkMe"
        ];

        fieldsToSave.forEach(key => {
            const val = profile[key];
            if (val !== undefined && val !== null) {
                payload[key] = val; // Direct assignment, let JSON.stringify handle arrays/objects
            }
        });

        if (bgFile) {
            try {
                const url = await uploadFileClientSide(bgFile, 'IMAGE');
                if (url) payload.cardBackgroundUrl = url;
            } catch (e) {
                console.error("BG upload failed", e);
            }
        }

        payload.cardSettings = settings; // JSON object

        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsEditing(false);
                if (onUpdate) {
                    onUpdate();
                } else {
                    router.refresh();
                }
            } else {
                const data = await res.json();
                alert(`Failed to save: ${data.error || 'Unknown error'}`);
            }
        } catch (e: any) {
            console.error("Failed to save", e);
            alert(`Error saving profile: ${e.message}`);
        }
    };

    if (!isOpen) return null;

    const age = profile.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : "?";
    const getArr = (val: any) => {
        if (Array.isArray(val)) return val;
        try { return typeof val === 'string' ? JSON.parse(val) : []; } catch { return []; }
    };

    const stalkMe = getArr(profile.stalkMe);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg h-[90vh] flex flex-col">

                {/* Header Actions */}
                <div className="absolute -top-16 left-0 right-0 flex justify-between items-center px-4">
                    <button onClick={closeModal} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 active:scale-90">
                        <X size={24} className="text-white" />
                    </button>

                    {isOwnProfile && (
                        <button
                            onClick={() => isEditing ? saveChanges() : setIsEditing(true)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-2xl active:scale-95 border ${isEditing
                                ? 'bg-white border-white text-black shadow-white/20'
                                : 'bg-white border-white text-black'
                                }`}
                        >
                            {isEditing ? <Save size={18} /> : <Camera size={18} />}
                            {isEditing ? "SAVE CARD" : "EDIT CARD"}
                        </button>
                    )}
                </div>

                {/* Main Scrollable Area */}
                <div ref={scrollRef} className="w-full h-full overflow-x-auto snap-x snap-mandatory flex gap-6 scrollbar-hide">

                    {/* --- CARD 1: IDENTITY --- */}
                    <CardWrapper bg={bgImage}>
                        <div className="flex flex-col items-center h-full p-8 text-white relative z-10 overflow-y-auto custom-scrollbar">
                            <div className="w-40 h-40 rounded-full border-[6px] border-white/10 overflow-hidden mb-8 shadow-[0_0_50px_rgba(255,255,255,0.1)] shrink-0 group relative">
                                <img src={profile.avatarUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>

                            <div className="w-full space-y-2 mb-8">
                                <EditableText
                                    label="Name"
                                    value={profile.displayName}
                                    onChange={(v: string) => updateField('displayName', v)}
                                    isEditing={isEditing}
                                    className="text-4xl font-black tracking-tight"
                                    placeholder="Enter your name"
                                    center
                                />
                                <p className="text-xl font-bold opacity-40 text-center tracking-wide">@{profile.name}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full mb-8">
                                <StatBox
                                    label="AGE" value={age.toString()}
                                    isEditing={false}
                                    visibility={settings.dob} onToggle={() => toggleVisibility('dob')} showToggle={isEditing}
                                />
                                <StatBox
                                    label="LOCATION" value={profile.city || profile.location}
                                    isEditing={isEditing} onChange={(v: string) => updateField('location', v)}
                                    visibility={settings.location} onToggle={() => toggleVisibility('location')} showToggle={isEditing}
                                    placeholder="Add City"
                                />
                                <StatBox
                                    label="HEIGHT" value={profile.height}
                                    isEditing={isEditing} onChange={(v: string) => updateField('height', v)}
                                    visibility={settings.height} onToggle={() => toggleVisibility('height')} showToggle={isEditing}
                                    placeholder="Add"
                                />
                                <StatBox
                                    label="WEIGHT" value={profile.weight}
                                    isEditing={isEditing} onChange={(v: string) => updateField('weight', v)}
                                    visibility={settings.weight} onToggle={() => toggleVisibility('weight')} showToggle={isEditing}
                                    placeholder="Add"
                                />
                            </div>

                            <div className="w-full mt-auto">
                                <SectionBox
                                    title="Conversation Starter"
                                    content={profile.conversationStarter}
                                    isEditing={isEditing}
                                    onChange={(v: string) => updateField('conversationStarter', v)}
                                    visibility={settings.conversationStarter}
                                    onToggle={() => toggleVisibility('conversationStarter')}
                                    placeholder="What should people ask you about?"
                                />
                            </div>
                        </div>
                    </CardWrapper>

                    {/* --- CARD 2: PROFESSIONAL --- */}
                    <CardWrapper bg={bgImage} title="PROFESSIONAL">
                        <div className="p-8 text-white relative z-10 h-full overflow-y-auto custom-scrollbar space-y-6">
                            <SectionBox
                                title="WORK HISTORY"
                                content={profile.workHistory}
                                isEditing={isEditing}
                                onChange={(v: string) => updateField('workHistory', v)}
                                visibility={settings.workHistory}
                                onToggle={() => toggleVisibility('workHistory')}
                                placeholder="Describe your career journey..."
                            />

                            <SectionBox
                                title="EDUCATION"
                                content={profile.education}
                                isEditing={isEditing}
                                onChange={(v: string) => updateField('education', v)}
                                visibility={settings.education}
                                onToggle={() => toggleVisibility('education')}
                                placeholder="Where did you study?"
                            />

                            <SectionBox
                                title="ACHIEVEMENTS"
                                content={profile.achievements}
                                isEditing={isEditing}
                                onChange={(v: string) => updateField('achievements', v)}
                                visibility={settings.achievements}
                                onToggle={() => toggleVisibility('achievements')}
                                placeholder="What are you proud of?"
                            />

                            <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-black text-xs tracking-widest opacity-40 uppercase">CORE SKILLS</h4>
                                    {isEditing && (
                                        <VisibilityToggle visibility={settings.skills} onToggle={() => toggleVisibility('skills')} compact />
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {isEditing ? (
                                        <ListEditor
                                            value={getArr(profile.skills)}
                                            onChange={(newVal: string[]) => updateField('skills', newVal)}
                                            placeholder="Add skills (comma separated)..."
                                        />
                                    ) : (
                                        getArr(profile.skills).length > 0 ? getArr(profile.skills).map((s: string) => (
                                            <span key={s} className="px-4 py-2 bg-white/10 rounded-xl text-sm font-black border border-white/5">{s}</span>
                                        )) : (
                                            <p className="text-white/30 italic text-sm font-bold">No skills added yet.</p>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardWrapper>

                    {/* --- CARD 3: VIBE --- */}
                    <CardWrapper bg={bgImage} title="VIBE CHECK">
                        <div className="p-8 text-white relative z-10 h-full overflow-y-auto custom-scrollbar space-y-6">
                            <SectionBox
                                title="LIFE IS LIKE..."
                                content={profile.lifeIsLike}
                                isEditing={isEditing}
                                onChange={(v: string) => updateField('lifeIsLike', v)}
                                visibility={settings.lifeIsLike}
                                onToggle={() => toggleVisibility('lifeIsLike')}
                                placeholder="Complete: 'With me life is like...'"
                            />

                            <div className="grid grid-cols-1 gap-4">
                                <StatBox
                                    label="INTERACTION STYLE"
                                    value={profile.interactionMode}
                                    isEditing={isEditing}
                                    onChange={(v: string) => updateField('interactionMode', v)}
                                    visibility={settings.interactionMode}
                                    onToggle={() => toggleVisibility('interactionMode')}
                                    placeholder="e.g. Introvert"
                                    row
                                />
                                <StatBox
                                    label="BEST VIBE TIME"
                                    value={profile.bestVibeTime}
                                    isEditing={isEditing}
                                    onChange={(v: string) => updateField('bestVibeTime', v)}
                                    visibility={settings.bestVibeTime}
                                    onToggle={() => toggleVisibility('bestVibeTime')}
                                    placeholder="e.g. Night Owl"
                                    row
                                />
                            </div>

                            <SectionBox
                                title="IDEAL VIBE"
                                content={profile.vibeWithPeople}
                                isEditing={isEditing}
                                onChange={(v: string) => updateField('vibeWithPeople', v)}
                                visibility={settings.vibeWithPeople}
                                onToggle={() => toggleVisibility('vibeWithPeople')}
                                placeholder="Describe the people you vibe with best..."
                            />
                        </div>
                    </CardWrapper>

                    {/* --- CARD 4: DEEP dive --- */}
                    <CardWrapper bg={bgImage} title="DEEP DIVE">
                        <div className="p-8 text-white relative z-10 h-full overflow-y-auto custom-scrollbar space-y-6">
                            <SectionBox
                                title="CARE ABOUT"
                                content={profile.careAbout}
                                isEditing={isEditing}
                                onChange={(v: string) => updateField('careAbout', v)}
                                visibility={settings.careAbout}
                                onToggle={() => toggleVisibility('careAbout')}
                                placeholder="What truly matters to you?"
                            />
                            <SectionBox
                                title="PROTECTIVE ABOUT"
                                content={profile.protectiveAbout}
                                isEditing={isEditing}
                                onChange={(v: string) => updateField('protectiveAbout', v)}
                                visibility={settings.protectiveAbout}
                                onToggle={() => toggleVisibility('protectiveAbout')}
                                placeholder="What do you guard closely?"
                            />
                            <SectionBox
                                title="DISTANCE MAKERS"
                                content={profile.distanceMakers}
                                isEditing={isEditing}
                                onChange={(v: string) => updateField('distanceMakers', v)}
                                visibility={settings.distanceMakers}
                                onToggle={() => toggleVisibility('distanceMakers')}
                                placeholder="What creates distance between you and others?"
                            />
                            <SectionBox
                                title="EMOTIONAL FIT"
                                content={profile.emotionalFit}
                                isEditing={isEditing}
                                onChange={(v: string) => updateField('emotionalFit', v)}
                                visibility={settings.emotionalFit}
                                onToggle={() => toggleVisibility('emotionalFit')}
                                placeholder="Who fits you emotionally?"
                            />
                        </div>
                    </CardWrapper>

                    {/* --- CARD 5: FAVORITES --- */}
                    <CardWrapper bg={bgImage} title="FAVORITES">
                        <div className="p-8 text-white relative z-10 h-full overflow-y-auto custom-scrollbar space-y-6">
                            <SectionBox
                                title="MY GOALS"
                                content={profile.goals}
                                isEditing={isEditing}
                                onChange={(v: string) => updateField('goals', v)}
                                visibility={settings.goals}
                                onToggle={() => toggleVisibility('goals')}
                                placeholder="What are you working towards?"
                            />
                            <SectionBox
                                title="LIFESTYLE"
                                content={profile.lifestyle}
                                isEditing={isEditing}
                                onChange={(v: string) => updateField('lifestyle', v)}
                                visibility={settings.lifestyle}
                                onToggle={() => toggleVisibility('lifestyle')}
                                placeholder="Describe your daily life..."
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FavoriteBox
                                    label="MOVIES" items={getArr(profile.topMovies)} icon={<Star size={12} />}
                                    isEditing={isEditing} onChange={(v: string[]) => updateField('topMovies', v)}
                                />
                                <FavoriteBox
                                    label="SONGS" items={getArr(profile.topSongs)} icon={<Heart size={12} />}
                                    isEditing={isEditing} onChange={(v: string[]) => updateField('topSongs', v)}
                                />
                                <FavoriteBox
                                    label="FOODS" items={getArr(profile.topFoods)} icon={<Sparkles size={12} />}
                                    isEditing={isEditing} onChange={(v: string[]) => updateField('topFoods', v)}
                                />
                                <FavoriteBox
                                    label="GAMES" items={getArr(profile.topGames)} icon={<AlertCircle size={12} />}
                                    isEditing={isEditing} onChange={(v: string[]) => updateField('topGames', v)}
                                />
                            </div>
                        </div>
                    </CardWrapper>

                    {/* --- CARD 6: STALK ME --- */}
                    <CardWrapper bg={bgImage} title="STALK ME">
                        <div className="p-6 relative z-10 h-full overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-3">
                                {stalkMe.length > 0 ? stalkMe.map((item: any, i: number) => (
                                    <div key={i} className="aspect-square bg-white/5 rounded-[1.5rem] overflow-hidden relative border border-white/5 group">
                                        <div className="absolute inset-0 flex items-center justify-center text-white/10 text-xs font-black tracking-widest">STALK {i + 1}</div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )) : (
                                    <div className="col-span-2 flex flex-col items-center justify-center py-20 opacity-20 space-y-4">
                                        <Info size={40} />
                                        <p className="font-black tracking-widest text-xs">NO MEDIA UPLOADED</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardWrapper>

                </div>





                {/* Floating Next Arrow */}
                <button
                    onClick={scrollNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white transition-all active:scale-95 shadow-xl group"
                >
                    <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
                </button>

                {/* BG Uploader floating action */}
                {isEditing && (
                    <div className="absolute bottom-12 right-12 z-[60] animate-in slide-in-from-right duration-500">
                        <label className="flex items-center gap-3 px-6 py-4 bg-black text-white border border-white/20 rounded-[2rem] cursor-pointer shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:scale-110 active:scale-95 transition-all group font-black uppercase text-xs tracking-widest">
                            <Camera size={20} />
                            <span>Card Background</span>
                            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleBgUpload} />
                        </label>
                    </div>
                )}
            </div>
        </div >
    );
}

// --- SUB-COMPONENTS ---

function CardWrapper({ children, bg, title }: { children: React.ReactNode, bg?: string | null, title?: string }) {
    return (
        <div className="snap-center shrink-0 w-full h-full rounded-[3rem] bg-[#0c0c0c] shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden border border-white/5 group">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                {bg ? (
                    <img src={bg} className="w-full h-full object-cover transition-opacity duration-1000 opacity-40 group-hover:opacity-60" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-neutral-900 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />
            </div>

            {title && (
                <div className="absolute top-10 left-10 z-20">
                    <h3 className="text-white font-black tracking-[0.4em] text-[10px] uppercase border-l-4 border-white pl-4 py-1">{title}</h3>
                </div>
            )}

            <div className="h-full pt-20 pb-20 relative z-10">
                {children}
            </div>

            {/* BRAND LOGO - ACTUAL IMAGE */}
            <div className="absolute bottom-10 right-10 z-20 hover:scale-110 transition-transform cursor-help flex flex-col items-end">
                <img src="/icon.png" className="w-8 h-8 rounded-lg mb-1" />
                <div className="flex items-baseline gap-0.5 select-none opacity-40 font-black text-[10px] tracking-widest text-white">
                    <span>F</span><span className="text-red-500">U</span><span>Y</span>
                </div>
            </div>
        </div>
    )
}

function StatBox({ label, value, isEditing, onChange, visibility, onToggle, showToggle, placeholder, row }: any) {
    if (!isEditing && !value) return null;

    return (
        <div className={`bg-white/5 rounded-[1.5rem] p-4 border border-white/5 relative group transition-all hover:bg-white/10 ${row ? 'flex items-center justify-between' : 'flex flex-col'}`}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black tracking-widest opacity-30 uppercase">{label}</span>
                {showToggle && (
                    <VisibilityToggle visibility={visibility} onToggle={onToggle} compact />
                )}
            </div>

            {isEditing && onChange ? (
                <input
                    className={`bg-transparent font-black focus:outline-none text-white placeholder-white/20 ${row ? 'text-right flex-1 ml-4' : 'text-xl'}`}
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            ) : (
                <span className={`font-black tracking-tight ${row ? 'text-lg' : 'text-2xl'}`}>{value || "—"}</span>
            )}
        </div>
    )
}

function SectionBox({ title, content, isEditing, onChange, visibility, onToggle, placeholder }: any) {
    if (!isEditing && !content) return null;

    return (
        <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 group hover:bg-white/10 transition-all relative">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-xs tracking-widest opacity-40 uppercase">{title}</h4>
                {isEditing && <VisibilityToggle visibility={visibility} onToggle={onToggle} compact />}
            </div>

            {isEditing ? (
                <textarea
                    value={content || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-white/50 transition-all h-32 resize-none placeholder-white/20"
                    placeholder={placeholder}
                />
            ) : (
                <p className="text-lg font-bold leading-relaxed opacity-80 italic">"{content}"</p>
            )}
        </div>
    )
}

function ListEditor({ value = [], onChange, placeholder }: { value: string[], onChange: (val: string[]) => void, placeholder?: string }) {
    // Initialize text from value on mount
    const [text, setText] = useState(() => Array.isArray(value) ? value.join(", ") : "");

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        const txt = e.target.value;
        setText(txt);
        // Update parent with array
        const arr = txt.split(",").map(s => s.trim()).filter(Boolean);
        onChange(arr);
    };

    return (
        <textarea
            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-white/50 transition-all h-24 resize-none placeholder-white/20"
            value={text}
            onChange={handleChange}
            placeholder={placeholder}
        />
    )
}

function FavoriteBox({ label, items, icon, isEditing, onChange }: { label: string, items: string[], icon: React.ReactNode, isEditing?: boolean, onChange?: (val: string[]) => void }) {
    return (
        <div className="bg-white/5 rounded-[1.5rem] p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-3 opacity-40">
                {icon}
                <span className="text-[10px] font-black tracking-widest uppercase">{label}</span>
            </div>
            <div className="space-y-1.5">
                {isEditing && onChange ? (
                    <ListEditor value={items} onChange={onChange} placeholder={`Add ${label.toLowerCase()}...`} />
                ) : (
                    items.length > 0 ? items.map((it, idx) => (
                        <div key={idx} className="text-xs font-bold leading-tight">{it}</div>
                    )) : <div className="text-[10px] opacity-20 font-black">NONE</div>
                )}
            </div>
        </div>
    )
}

function VisibilityToggle({ visibility, onToggle, compact }: { visibility?: string, onToggle: () => void, compact?: boolean }) {
    const isPublic = visibility !== 'followers';
    return (
        <button
            onClick={onToggle}
            className={`flex items-center gap-1.5 rounded-xl border border-white/10 hover:border-white/30 transition-all ${compact ? 'px-2 py-1 bg-black/60' : 'px-3 py-2 bg-black/40'
                }`}
        >
            {isPublic ? <Globe size={12} className="text-blue-400" /> : <Users size={12} className="text-amber-400" />}
            <span className={`text-[10px] font-black uppercase tracking-tighter ${isPublic ? 'text-blue-200' : 'text-amber-200'}`}>
                {isPublic ? "Public" : "Followers"}
            </span>
        </button>
    )
}

function EditableText({ value, onChange, isEditing, className, placeholder, center, label }: any) {
    if (isEditing) {
        return (
            <div className={`w-full ${center ? 'flex flex-col items-center' : ''}`}>
                <input
                    type="text"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${className} bg-transparent border-b-2 border-white/10 hover:border-white/50 focus:border-white focus:outline-none transition-all py-2 w-full ${center ? 'text-center' : ''}`}
                    placeholder={placeholder}
                />
            </div>
        )
    }
    if (!value) return null;
    return <h2 className={`${className} ${center ? 'text-center' : ''}`}>{value}</h2>
}
