"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import AppHeader from "@/components/AppHeader";
import { ChevronLeft, Plus, Trash2, Save, Upload, Video, Image as ImageIcon } from "lucide-react";
import { uploadFileClientSide } from "@/lib/upload-helper";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EditProfilePage() {
    const router = useRouter();
    const { data: profileData, isLoading: profileLoading } = useSWR("/api/profile", fetcher);
    const { data: cardData, isLoading: cardLoading } = useSWR("/api/profile-card?mine=true", fetcher);

    const [activeTab, setActiveTab] = useState<"general" | "card">("general");
    const [saving, setSaving] = useState(false);

    // General Profile State
    const [localAvatar, setLocalAvatar] = useState<File | null>(null);
    const [localCover, setLocalCover] = useState<File | null>(null);
    const avatarInput = useRef<HTMLInputElement>(null);
    const coverInput = useRef<HTMLInputElement>(null);

    // Card State
    const [sections, setSections] = useState<any[]>([]);
    const [basicInfo, setBasicInfo] = useState<any>({ name: "", age: "", location: "", occupation: "" });

    useEffect(() => {
        if (cardData && cardData.content) {
            setSections(cardData.content.sections || []);
            setBasicInfo(cardData.content.basicInfo || {});
        }
    }, [cardData]);

    if (profileLoading || cardLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-neutral-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // API returns the profile object directly
    const profile = profileData || {};
    const user = profile.user || {}; // The included user data is inside the profile object

    // -- Handlers --

    async function onSaveGeneral(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        const fd = new FormData(e.currentTarget);

        // Prepare payload object from FormData
        const payload: any = {};
        fd.forEach((value, key) => {
            if (typeof value === 'string') {
                payload[key] = value;
            }
        });

        try {
            // Handle File Uploads
            if (localAvatar) {
                const url = await uploadFileClientSide(localAvatar, 'IMAGE');
                if (url) payload.avatarUrl = url;
            }
            if (localCover) {
                const type = localCover.type.startsWith('image') ? 'IMAGE' : 'VIDEO';
                const url = await uploadFileClientSide(localCover, type);
                if (url) {
                    if (type === 'VIDEO') {
                        payload.coverVideoUrl = url;
                        payload.coverImageUrl = "";
                    } else {
                        payload.coverImageUrl = url;
                        payload.coverVideoUrl = "";
                    }
                }
            }

            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Failed to save profile");
            mutate("/api/profile");
            alert("Profile saved!");
            router.refresh();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function onSaveCard() {
        setSaving(true);
        try {
            const res = await fetch("/api/profile-card", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: { sections, basicInfo },
                    theme: "default"
                })
            });
            if (!res.ok) throw new Error("Failed to save card");
            mutate("/api/profile-card?mine=true");
            alert("Profile Card saved!");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    }

    // Card Helpers
    const addSection = () => {
        setSections([...sections, { id: Date.now().toString(), title: "New Section", questions: [] }]);
    };
    const deleteSection = (id: string) => setSections(sections.filter(s => s.id !== id));
    const updateSectionTitle = (id: string, title: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, title } : s));
    };
    const addQuestion = (sectionId: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return { ...s, questions: [...s.questions, { id: Date.now().toString(), question: "", answer: "" }] };
            }
            return s;
        }));
    };
    const updateQuestion = (sectionId: string, qId: string, field: "question" | "answer", val: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    questions: s.questions.map((q: any) => q.id === qId ? { ...q, [field]: val } : q)
                };
            }
            return s;
        }));
    };
    const deleteQuestion = (sectionId: string, qId: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return { ...s, questions: s.questions.filter((q: any) => q.id !== qId) };
            }
            return s;
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 pb-20">
            <AppHeader title="Edit Profile" />

            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.push("/profile")} className="p-2 hover:bg-gray-200 dark:hover:bg-neutral-800 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-200 dark:border-neutral-800 mb-8">
                    <button
                        onClick={() => setActiveTab("general")}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === "general" ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                    >
                        General Info
                    </button>
                    <button
                        onClick={() => setActiveTab("card")}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === "card" ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                    >
                        Profile Card
                    </button>
                </div>

                {activeTab === "general" ? (
                    <form onSubmit={onSaveGeneral} className="space-y-8 animate-in fade-in">
                        {/* Media Uploads */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Avatar */}
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Profile Picture</label>
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden relative group">
                                        {localAvatar ? (
                                            <img src={URL.createObjectURL(localAvatar)} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={profile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} className="w-full h-full object-cover" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => avatarInput.current?.click()}>
                                            <Upload className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => avatarInput.current?.click()} className="text-sm font-medium text-blue-600 hover:underline">Change Photo</button>
                                    <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => setLocalAvatar(e.target.files?.[0] || null)} />
                                </div>
                            </div>

                            {/* Cover */}
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Cover Media (Image or Video)</label>
                                <div className="w-full h-40 rounded-xl bg-gray-200 dark:bg-neutral-800 overflow-hidden relative group border border-gray-300 dark:border-neutral-700">
                                    {localCover ? (
                                        localCover.type.startsWith("video/") ? (
                                            <video src={URL.createObjectURL(localCover)} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={URL.createObjectURL(localCover)} className="w-full h-full object-cover" />
                                        )
                                    ) : (
                                        profile.coverVideoUrl ? (
                                            <video src={profile.coverVideoUrl} className="w-full h-full object-cover" />
                                        ) : profile.coverImageUrl ? (
                                            <img src={profile.coverImageUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">No cover media</div>
                                        )
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => coverInput.current?.click()}>
                                        <Upload className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => coverInput.current?.click()} className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                                        <Upload className="w-3 h-3" /> Upload
                                    </button>
                                    <input ref={coverInput} type="file" accept="image/*,video/*" hidden onChange={(e) => setLocalCover(e.target.files?.[0] || null)} />
                                </div>
                            </div>
                        </div>

                        {/* Text Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Display Name</label>
                                <input name="displayName" defaultValue={profile.displayName || ""} className="w-full p-2 rounded-lg border dark:bg-neutral-800 dark:border-neutral-700 dark:text-white" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <input name="name" defaultValue={user?.name || ""} className="w-full p-2 rounded-lg border dark:bg-neutral-800 dark:border-neutral-700 dark:text-white" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Bio</label>
                                <textarea name="bio" defaultValue={profile.bio || ""} className="w-full p-2 rounded-lg border dark:bg-neutral-800 dark:border-neutral-700 dark:text-white min-h-[100px]" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Location</label>
                                <input name="location" defaultValue={profile.location || ""} className="w-full p-2 rounded-lg border dark:bg-neutral-800 dark:border-neutral-700 dark:text-white" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tags</label>
                                <input name="tags" defaultValue={profile.tags || ""} className="w-full p-2 rounded-lg border dark:bg-neutral-800 dark:border-neutral-700 dark:text-white" placeholder="e.g. Designer, Developer" />
                            </div>
                        </div>

                        {/* Account Privacy */}
                        <div className="pt-6 border-t dark:border-neutral-800">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Account Privacy</h3>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700">
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">Private Account</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Private accounts won't appear in Creators or discovery
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="isPrivate"
                                        defaultChecked={profile.isPrivate || false}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-black dark:peer-checked:bg-white"></div>
                                </label>
                            </div>
                        </div>

                        <div className="pt-6 border-t dark:border-neutral-800">
                            <button disabled={saving} className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-medium shadow hover:opacity-90 transition disabled:opacity-50">
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-8 animate-in fade-in">
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg">Basic Info (Card Front)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    placeholder="Name on Card"
                                    value={basicInfo.name}
                                    onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                                    className="p-2 border rounded dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                                />
                                <input
                                    placeholder="Occupation"
                                    value={basicInfo.occupation}
                                    onChange={(e) => setBasicInfo({ ...basicInfo, occupation: e.target.value })}
                                    className="p-2 border rounded dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                                />
                                <input
                                    placeholder="Age"
                                    value={basicInfo.age}
                                    onChange={(e) => setBasicInfo({ ...basicInfo, age: e.target.value })}
                                    className="p-2 border rounded dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                                />
                                <input
                                    placeholder="Location"
                                    value={basicInfo.location}
                                    onChange={(e) => setBasicInfo({ ...basicInfo, location: e.target.value })}
                                    className="p-2 border rounded dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg">Custom Sections</h3>
                                <button onClick={addSection} className="text-sm text-blue-600 font-medium flex items-center gap-1">
                                    <Plus className="w-4 h-4" /> Add Section
                                </button>
                            </div>

                            {sections.map((section) => (
                                <div key={section.id} className="p-4 border dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            value={section.title}
                                            onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                                            placeholder="Section Title (e.g. FAVORITES)"
                                            className="flex-1 font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-white"
                                        />
                                        <button onClick={() => deleteSection(section.id)} className="text-red-500 p-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-3 pl-4 border-l-2 border-gray-100 dark:border-neutral-700">
                                        {section.questions.map((q: any) => (
                                            <div key={q.id} className="flex gap-2">
                                                <div className="flex-1 space-y-1">
                                                    <input
                                                        value={q.question}
                                                        onChange={(e) => updateQuestion(section.id, q.id, "question", e.target.value)}
                                                        placeholder="Question (e.g. Favorite Food)"
                                                        className="w-full text-xs font-bold text-gray-500 uppercase bg-transparent p-1 border-b border-transparent focus:border-gray-300"
                                                    />
                                                    <input
                                                        value={q.answer}
                                                        onChange={(e) => updateQuestion(section.id, q.id, "answer", e.target.value)}
                                                        placeholder="Answer"
                                                        className="w-full p-1 bg-transparent border-b border-gray-200 dark:border-neutral-700 focus:border-blue-500 text-sm"
                                                    />
                                                </div>
                                                <button onClick={() => deleteQuestion(section.id, q.id)} className="text-gray-400 hover:text-red-500 self-center">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <button onClick={() => addQuestion(section.id)} className="text-xs text-blue-500 font-medium flex items-center gap-1 mt-2">
                                            <Plus className="w-3 h-3" /> Add Question
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 border-t dark:border-neutral-800">
                            <button onClick={onSaveCard} disabled={saving} className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-medium shadow hover:opacity-90 transition disabled:opacity-50">
                                {saving ? "Saving..." : "Save Card"}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
