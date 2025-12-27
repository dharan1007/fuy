"use client";

import { useState, useEffect, useRef } from "react";
import {
    Dumbbell, Users, Search,
    Check, X, ChevronLeft, ChevronRight, Trophy,
    MapPin, Activity, Timer, Trash2, Plus, Share2, Pencil, Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";

// --- TYPES ---
type WorkoutSet = {
    id?: string;
    reps: number;
    weight: number;
    restSeconds: number;
    completed: boolean;
    completedByPartner: boolean;
};

type WorkoutExercise = {
    id?: string;
    name: string;
    sets: WorkoutSet[];
};

type Workout = {
    id: string;
    name: string;
    date: string;
    completed: boolean;
    partnerId?: string;
    partner?: { name: string; profile?: { avatarUrl: string } };
    exercises: WorkoutExercise[];
    calories?: number;
};

type GymPartner = {
    id: string;
    status: "PENDING" | "ACCEPTED";
    isSender: boolean;
    friend: { id: string; name: string; avatarUrl: string };
};

type UserResult = {
    id: string;
    name: string;
    profileCode?: string;
    profile?: { avatarUrl?: string; city?: string; interactionMode?: string; };
};

type Stats = {
    weekDays: number;
    streak: number;
    total: number;
    caloriesToday: number;
};

export default function WorkoutSection() {
    // --- STATE ---
    // Workout & Stats
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [stats, setStats] = useState<Stats>({ weekDays: 0, streak: 0, total: 0, caloriesToday: 0 });
    const [activeTimer, setActiveTimer] = useState<{ setId: string, secondsLeft: number } | null>(null);
    const shareRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);

    // Modal (Add/Edit)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editModeId, setEditModeId] = useState<string | null>(null);
    const [newWorkoutName, setNewWorkoutName] = useState("");
    const [newCalories, setNewCalories] = useState(0);
    const [newPartnerId, setNewPartnerId] = useState<string | null>(null);
    const [newExercises, setNewExercises] = useState<WorkoutExercise[]>([]);

    // Gym Pals & Networking
    const [pals, setPals] = useState<GymPartner[]>([]);
    const [suggestions, setSuggestions] = useState<UserResult[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpenToWorkout, setIsOpenToWorkout] = useState(false);

    // --- EFFECTS ---
    useEffect(() => {
        fetchWorkouts();
        fetchPals();
        fetchSuggestions();
        fetchSettings();
        fetchStats();
    }, []);

    useEffect(() => { fetchWorkouts(); }, [selectedDate]);

    // Live Polling
    useEffect(() => {
        const interval = setInterval(() => { fetchWorkouts(); fetchStats(); }, 5000);
        return () => clearInterval(interval);
    }, [selectedDate]);

    // Timer Logic
    useEffect(() => {
        if (activeTimer && activeTimer.secondsLeft > 0) {
            const timeout = setTimeout(() => {
                setActiveTimer(prev => prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null);
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [activeTimer]);

    // Search Debounce
    useEffect(() => {
        if (searchQuery.length > 1) {
            const timeout = setTimeout(searchUsers, 500);
            return () => clearTimeout(timeout);
        } else { setSearchResults([]); }
    }, [searchQuery]);


    // --- API FUNCTIONS ---
    async function fetchWorkouts() {
        try {
            const res = await fetch(`/api/grounding/workout?date=${selectedDate.toISOString()}`);
            if (res.ok) setWorkouts(await res.json());
        } catch (e) { console.error(e); }
    }
    async function fetchStats() {
        try {
            const res = await fetch(`/api/grounding/workout/stats`);
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error(e); }
    }
    async function fetchPals() {
        try {
            const res = await fetch('/api/grounding/gym-pals');
            if (res.ok) setPals(await res.json());
        } catch (e) { console.error(e); }
    }
    async function fetchSuggestions() {
        try {
            const res = await fetch('/api/grounding/gym-pals/suggested');
            if (res.ok) setSuggestions(await res.json());
        } catch (e) { console.error(e); }
    }
    async function fetchSettings() {
        try {
            const res = await fetch('/api/grounding/gym-pals/settings');
            if (res.ok) setIsOpenToWorkout((await res.json()).isOpen);
        } catch (e) { console.error(e); }
    }

    // --- ACTIONS ---
    async function saveWorkout() {
        if (!newWorkoutName) return;
        try {
            const payload = {
                id: editModeId, // Needed for PUT
                name: newWorkoutName,
                date: selectedDate.toISOString(),
                exercises: newExercises,
                partnerId: newPartnerId,
                completed: false,
                calories: newCalories
            };

            const method = editModeId ? 'PUT' : 'POST';
            const res = await fetch('/api/grounding/workout', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                resetModal();
                fetchWorkouts();
                fetchStats();
            }
        } catch (e) { console.error(e); }
    }

    async function deleteWorkout(id: string) {
        if (!confirm("Delete this workout session?")) return;
        try {
            await fetch(`/api/grounding/workout?id=${id}`, { method: 'DELETE' });
            fetchWorkouts();
            fetchStats();
        } catch (e) { console.error(e); }
    }

    async function toggleSet(setId: string, completed: boolean, restSeconds: number) {
        // Optimistic
        setWorkouts(prev => prev.map(w => ({
            ...w,
            exercises: w.exercises.map(e => ({
                ...e, sets: e.sets.map(s => s.id === setId ? { ...s, completed } : s)
            }))
        })));
        if (completed && restSeconds > 0) setActiveTimer({ setId, secondsLeft: restSeconds });

        try {
            await fetch('/api/grounding/workout/set', {
                method: 'PUT',
                body: JSON.stringify({ setId, completed })
            });
            fetchWorkouts(); fetchStats();
        } catch (e) { console.error(e); }
    }

    // Share
    async function downloadShareCard() {
        if (!shareRef.current) return;
        setIsSharing(true);
        try {
            const dataUrl = await toPng(shareRef.current, { cacheBust: true });
            const link = document.createElement('a');
            link.download = `gym-card-${new Date().toISOString().split('T')[0]}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) { console.error("Share failed", e); }
        finally { setIsSharing(false); }
    }


    // --- HELPERS ---
    function openAddModal() {
        setEditModeId(null);
        setNewWorkoutName("");
        setNewPartnerId(null);
        setNewExercises([]);
        setNewCalories(0);
        setIsModalOpen(true);
    }

    function openEditModal(w: Workout) {
        setEditModeId(w.id);
        setNewWorkoutName(w.name);
        setNewPartnerId(w.partnerId || null);
        setNewExercises(w.exercises); // Deep clone usually better, but state setter clones
        setNewCalories(w.calories || 0);
        setIsModalOpen(true);
    }

    function resetModal() {
        setIsModalOpen(false);
        setEditModeId(null);
        setNewWorkoutName("");
    }

    // Builder Helpers
    function addExercise() {
        setNewExercises([...newExercises, { name: "New Exercise", sets: [{ reps: 10, weight: 0, restSeconds: 60, completed: false, completedByPartner: false }] }]);
    }
    function updateExercise(idx: number, field: string, val: string) {
        const updated = [...newExercises];
        updated[idx] = { ...updated[idx], [field]: val };
        setNewExercises(updated);
    }
    function addSet(exIdx: number) {
        const updated = [...newExercises];
        const lastSet = updated[exIdx].sets[updated[exIdx].sets.length - 1];
        updated[exIdx].sets.push({ ...lastSet, completed: false, completedByPartner: false });
        setNewExercises(updated);
    }
    function updateSet(exIdx: number, sIdx: number, field: keyof WorkoutSet, val: number) {
        const updated = [...newExercises];
        // @ts-ignore
        updated[exIdx].sets[sIdx][field] = val;
        setNewExercises(updated);
    }
    // ... search/gym pal helpers mostly same ...
    async function toggleOpenToWorkout() { /* ... */ const newState = !isOpenToWorkout; setIsOpenToWorkout(newState); try { await fetch('/api/grounding/gym-pals/settings', { method: 'POST', body: JSON.stringify({ isOpen: newState }) }); } catch (e) { setIsOpenToWorkout(!newState); } }
    async function searchUsers() { setIsSearching(true); try { const res = await fetch(`/api/grounding/user-search?q=${searchQuery}`); if (res.ok) setSearchResults(await res.json()); } catch (e) { } finally { setIsSearching(false); } }
    async function sendRequest(targetId: string) { try { const res = await fetch('/api/grounding/gym-pals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: targetId }) }); if (res.ok) { alert("Request Sent!"); setSearchQuery(""); setSearchResults([]); fetchPals(); } else alert("Failed"); } catch (e) { } }
    async function handleRequest(requestId: string, action: "ACCEPT" | "REJECT") { try { const res = await fetch('/api/grounding/gym-pals/action', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, action }) }); if (res.ok) fetchPals(); } catch (e) { } }


    return (
        <div className="space-y-8 animate-in fade-in">
            {/* NO HEADER - Stats Built-in */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2"><Trophy className="text-emerald-500" /> WORKOUT LAB</h2>
                    <p className="text-white/50 text-sm">Unified Training Command Center</p>
                </div>

                <div className="flex gap-4">
                    {/* Real Stats */}
                    <div className="bg-emerald-900/20 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-4">
                        <div>
                            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Consistency</div>
                            <div className="text-xl font-black text-white leading-none">{stats.weekDays}/7 <span className="text-xs text-white/50">Days</span></div>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div>
                            <div className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Streak</div>
                            <div className="text-xl font-black text-white leading-none">{stats.streak} <span className="text-xs text-white/50">🔥</span></div>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div>
                            <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Calories</div>
                            <div className="text-xl font-black text-white leading-none">{stats.caloriesToday || 0} <span className="text-xs text-white/50">kcal</span></div>
                        </div>
                    </div>
                    {/* Share Button */}
                    <button onClick={downloadShareCard} className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 flex items-center gap-2 font-bold transition-all">
                        <Share2 size={18} />
                        <span className="hidden md:inline text-xs uppercase tracking-widest">Share Card</span>
                    </button>
                </div>
            </div>

            {/* MAIN GRID */}
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Calendar */}
                    <div className="flex items-center justify-between text-white bg-white/5 p-4 rounded-2xl border border-white/10">
                        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }} className="hover:bg-white/10 p-2 rounded-full"><ChevronLeft /></button>
                        <h3 className="text-xl font-bold font-mono">{selectedDate.toDateString()}</h3>
                        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }} className="hover:bg-white/10 p-2 rounded-full"><ChevronRight /></button>
                    </div>

                    {/* Workout List */}
                    <div className="space-y-4 min-h-[400px]">
                        {workouts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-6 py-20 border border-dashed border-white/10 rounded-3xl">
                                <Dumbbell size={64} strokeWidth={1} />
                                <div className="text-center"><p className="text-lg">No workouts logged.</p></div>
                                <button onClick={openAddModal} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">Start Session</button>
                            </div>
                        ) : (
                            <>
                                {workouts.map(w => (
                                    <div key={w.id} className="bg-black/40 border border-white/10 rounded-3xl p-6 space-y-6 relative group">
                                        {/* Card Header with Management */}
                                        <div className="flex items-start justify-between relative z-10">
                                            <div>
                                                <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">{w.name}</h4>
                                                {w.partner && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden">{w.partner.profile?.avatarUrl && <img src={w.partner.profile.avatarUrl} className="w-full h-full object-cover" />}</div>
                                                        <span className="text-sm text-purple-400 font-bold">with {w.partner.name}</span>
                                                    </div>
                                                )}
                                                {w.calories ? <div className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1"><Flame size={12} /> {w.calories} kcal</div> : null}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openEditModal(w)} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"><Pencil size={16} /></button>
                                                <button onClick={() => deleteWorkout(w.id)} className="p-2 hover:bg-red-500/20 rounded-full text-white/50 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </div>

                                        {/* Exercises (Simplified rendering for brevity, same as before) */}
                                        <div className="space-y-4 relative z-10">
                                            {w.exercises?.map((ex, i) => (
                                                <div key={i} className="bg-white/5 rounded-2xl p-4">
                                                    <h5 className="text-white font-bold mb-3 flex items-center gap-3">
                                                        <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs font-mono text-white/50">{i + 1}</span> {ex.name}
                                                    </h5>
                                                    <div className="space-y-1">
                                                        {ex.sets.map((s, idx) => (
                                                            <div key={s.id} className="grid grid-cols-12 items-center text-sm px-2 py-2 rounded-lg bg-black/20 hover:bg-black/40">
                                                                <div className="text-white/30 col-span-1 font-mono text-xs">{idx + 1}</div>
                                                                <div className="text-white font-bold col-span-2">{s.reps} reps</div>
                                                                <div className="text-white/70 col-span-2 text-xs">{s.weight}kg</div>
                                                                <div className="text-white/50 font-mono text-xs col-span-3">{(activeTimer?.setId === s.id) ? <span className="text-emerald-500 animate-pulse">{activeTimer?.secondsLeft}s</span> : `${s.restSeconds}s`}</div>
                                                                <div className="col-span-2 flex justify-center">
                                                                    <button onClick={() => toggleSet(s.id!, !s.completed, s.restSeconds)} className={cn("w-6 h-6 rounded border flex items-center justify-center transition-all", s.completed ? "bg-emerald-500 border-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "border-white/50 bg-white/10 hover:bg-white/20 hover:border-white")}>
                                                                        {s.completed && <Check size={14} strokeWidth={3} />}
                                                                    </button>
                                                                </div>
                                                                <div className="col-span-2 flex justify-center">
                                                                    {w.partnerId && <div className={cn("w-6 h-6 rounded border flex items-center justify-center opacity-50", s.completedByPartner ? "bg-purple-500 border-purple-500 text-white" : "border-white/5")}>{s.completedByPartner && <Check size={14} />}</div>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <button onClick={openAddModal} className="w-full py-4 border border-dashed border-white/20 rounded-2xl text-white/50 hover:text-white hover:border-white font-bold uppercase tracking-widest transition-all text-sm">+ Add Another Session</button>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Column (Gym Pals - simplified view) */}
                <div className="space-y-6">
                    <div className="bg-black border border-white/20 rounded-3xl p-6">
                        <h3 className="text-lg font-bold text-white flex gap-2 mb-4"><Search size={18} /> Find Partners</h3>
                        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none" />
                        {/* Search/Suggestion Logic Rendered Here (Brevity) */}
                        <div className="mt-4 space-y-2">
                            {searchResults.length > 0 ? searchResults.map(u => <div key={u.id} className="flex justify-between items-center text-white text-sm p-2 bg-white/5 rounded"><span className="font-bold">{u.name}</span><button onClick={() => sendRequest(u.id)} className="text-xs bg-white text-black px-2 py-1 rounded">Add</button></div>) : (!searchQuery && suggestions.map(s => <div key={s.id} className="flex justify-between items-center text-white text-sm p-2 hover:bg-white/5 rounded group"><span className="font-bold">{s.name}</span><button onClick={() => sendRequest(s.id)} className="text-xs text-white/50 border border-white/20 px-2 py-1 rounded opacity-0 group-hover:opacity-100 hover:text-white hover:border-white">Add</button></div>))}
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Your Squad</h3>
                        <div className="space-y-3">
                            {pals.filter(p => p.status === "ACCEPTED").map(p => <div key={p.id} className="flex gap-3 items-center p-2 bg-black/40 rounded-xl border border-white/5"><div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">{p.friend.avatarUrl && <img src={p.friend.avatarUrl} className="w-full h-full object-cover" />}</div><span className="text-white font-bold text-sm">{p.friend.name}</span></div>)}
                            {pals.filter(p => p.status === "PENDING" && !p.isSender).map(p => <div key={p.id} className="bg-purple-900/20 p-2 rounded-lg mb-2"><div className="text-white text-xs mb-2">Request from <b>{p.friend.name}</b></div><div className="flex gap-2"><button onClick={() => handleRequest(p.id, "ACCEPT")} className="bg-emerald-500 text-black text-xs px-2 py-1 rounded">Accept</button><button onClick={() => handleRequest(p.id, "REJECT")} className="bg-white/10 text-white text-xs px-2 py-1 rounded">Reject</button></div></div>)}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL (Add/Edit) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8 space-y-6 shadow-2xl relative">
                        <button onClick={resetModal} className="absolute top-6 right-6 text-white/30 hover:text-white"><X /></button>
                        <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">{editModeId ? "Edit Session" : "New Session"}</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2"><label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Name</label><input value={newWorkoutName} onChange={(e) => setNewWorkoutName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Partner</label><select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" value={newPartnerId || ""} onChange={(e) => setNewPartnerId(e.target.value || null)}><option value="">Solo</option>{pals.filter(p => p.status === "ACCEPTED").map(p => <option key={p.friend.id} value={p.friend.id}>{p.friend.name}</option>)}</select></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Calories Burned (kcal)</label><input type="number" value={newCalories} onChange={(e) => setNewCalories(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none" /></div>
                        </div>
                        <div className="space-y-4 pt-4">
                            {newExercises.map((ex, i) => (
                                <div key={i} className="bg-white/5 rounded-2xl p-4 space-y-2 border border-white/5 relative">
                                    <button onClick={() => setNewExercises(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-white/20 hover:text-red-500"><Trash2 size={16} /></button>
                                    <input value={ex.name} onChange={(e) => updateExercise(i, 'name', e.target.value)} className="bg-transparent text-lg font-bold text-white outline-none w-[90%] placeholder-white/20" placeholder="Exercise Name" />
                                    <div className="space-y-2 pl-2">
                                        <div className="grid grid-cols-4 gap-2 text-[10px] text-white/30 uppercase tracking-widest"><div>Reps</div><div>Kg</div><div>Rest</div></div>
                                        {ex.sets.map((s, sIdx) => <div key={sIdx} className="grid grid-cols-4 gap-2"><input type="number" className="bg-black/30 rounded px-2 py-1 text-white text-sm font-mono text-center" value={s.reps} onChange={(e) => updateSet(i, sIdx, 'reps', Number(e.target.value))} /><input type="number" className="bg-black/30 rounded px-2 py-1 text-white text-sm font-mono text-center" value={s.weight} onChange={(e) => updateSet(i, sIdx, 'weight', Number(e.target.value))} /><input type="number" className="bg-black/30 rounded px-2 py-1 text-white text-sm font-mono text-center" value={s.restSeconds} onChange={(e) => updateSet(i, sIdx, 'restSeconds', Number(e.target.value))} /></div>)}
                                        <button onClick={() => addSet(i)} className="text-xs text-white/50 hover:text-white font-bold py-1">+ Set</button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addExercise} className="w-full py-3 border border-dashed border-white/20 rounded-xl text-white/50 hover:text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"><Plus size={16} /> Exercise</button>
                        </div>
                        <button onClick={saveWorkout} className="w-full py-4 bg-white hover:bg-white/90 text-black font-bold rounded-xl">{editModeId ? "Save Changes" : "Create Session"}</button>
                    </div>
                </div>
            )}

            {/* HIDDEN SHARE CARD TEMPLATE */}
            <div className="fixed -left-[2000px] top-0 pointer-events-none">
                <div ref={shareRef} className="w-[600px] bg-zinc-950 p-8 border-[10px] border-white text-white font-sans relative overflow-hidden">
                    {/* Decorative BG */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-600 rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/3"></div>

                    <div className="relative z-10">
                        {/* Header */}
                        <div className="flex justify-between items-end border-b-4 border-white pb-6 mb-8">
                            <div>
                                <h1 className="text-5xl font-black italic tracking-tighter uppercase">GYM PAL</h1>
                                <div className="text-xl font-bold text-red-500 uppercase tracking-widest mt-1">Consistency Report</div>
                            </div>
                            <div className="text-right">
                                <div className="text-6xl font-black">{stats.streak}</div>
                                <div className="text-xs font-bold uppercase bg-white text-black px-2 py-1 inline-block">Day Streak</div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div>
                                <div className="text-sm font-bold text-white/50 uppercase mb-2">Weekly Activity</div>
                                <div className="text-7xl font-black flex items-baseline gap-2">
                                    {stats.weekDays}<span className="text-2xl text-white/30 font-bold">/7</span>
                                </div>
                                <div className="text-sm font-bold text-white uppercase mt-2">Active Days</div>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white/50 uppercase mb-2">Total Volume</div>
                                <div className="text-4xl font-black">{stats.total}</div>
                                <div className="text-sm font-bold text-white uppercase mt-1">Sessions Complete</div>
                            </div>
                            <div className="col-span-2 border-t border-white/20 pt-8">
                                <div className="text-sm font-bold text-white/50 uppercase mb-2 flex items-center gap-2"><Flame size={16} /> Daily Burn</div>
                                <div className="text-4xl font-black text-red-500">{stats.caloriesToday || 0} <span className="text-xl text-white/50">kcal</span></div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t-2 border-white/20 pt-6 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                {/* App Logo / Badge */}
                                <div className="w-12 h-12 bg-black rounded-xl border border-white/20 flex items-center justify-center overflow-hidden">
                                    <img src="/icon.png" alt="Wrex" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <div className="font-black text-lg text-white">WREX HUB</div>
                                    <div className="text-xs text-white/50 uppercase tracking-widest" suppressHydrationWarning>{new Date().toDateString()}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-white/30 uppercase">Authorized by</div>
                                <div className="font-black text-xl italic text-red-500">FUY</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
