"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ScrollStarfield from "@/components/ScrollStarfield";
import LoadingSpinner from "@/components/LoadingSpinner";

// Types for our form data
interface ProfileFormData {
  // Basics
  displayName: string;
  dob: string; // YYYY-MM-DD
  height: string;
  weight: string;
  conversationStarter: string;

  // Professional (New Section)
  achievements: string;
  skills: string[];
  workHistory: string;
  education: string;

  // Vibe
  city: string;
  interactionMode: "Introvert" | "Extrovert" | "Ambivert" | "";
  bestVibeTime: string;
  vibeWithPeople: string;
  lifeIsLike: string;

  // Deep Dive
  values: string[]; // inputted as tags
  hardNos: string[]; // inputted as tags
  emotionalFit: string;
  pleaseDont: string;
  careAbout: string;
  protectiveAbout: string;
  distanceMakers: string;

  // Favorites
  topMovies: string[]; // Max 3
  topGenres: string[]; // Max 3
  topSongs: string[]; // Max 3
  topFoods: string[]; // Max 3
  topPlaces: string[]; // Max 3
  topGames: string[]; // Max 3
  currentlyInto: string[]; // Tags
  dislikes: string[]; // Tags
  icks: string[]; // Tags
  goals: string;
  lifestyle: string;
  interactionTopics: string[];

  // Media
  stalkMeFiles: File[];
  avatarFile: File | null;
  coverFile: File | null;
}

// Initial State
const initialData: ProfileFormData = {
  displayName: "",
  dob: "",
  height: "",
  weight: "",
  conversationStarter: "",

  achievements: "",
  skills: [],
  workHistory: "",
  education: "",

  city: "",
  interactionMode: "",
  bestVibeTime: "",
  vibeWithPeople: "",
  lifeIsLike: "",
  values: [],
  hardNos: [],
  emotionalFit: "",
  pleaseDont: "",
  careAbout: "",
  protectiveAbout: "",
  distanceMakers: "",
  topMovies: ["", "", ""],
  topGenres: ["", "", ""],
  topSongs: ["", "", ""],
  topFoods: ["", "", ""],
  topPlaces: ["", "", ""],
  topGames: ["", "", ""],
  currentlyInto: [],
  dislikes: [],
  icks: [],
  goals: "",
  lifestyle: "",
  interactionTopics: [],
  stalkMeFiles: [],
  avatarFile: null,
  coverFile: null,
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProfileFormData>(initialData);
  const [stalkMePreviews, setStalkMePreviews] = useState<string[]>(Array(11).fill(""));

  // Previews for Avatar & Cover
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const totalSteps = 6; // Basics, Professional, Vibe, Deep Dive, Favorites, Stalk Me

  // Validation
  const isAdult = (dob: string) => {
    if (!dob) return false;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 18;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!data.displayName) {
        alert("Please enter your display name.");
        return;
      }
      if (!data.dob) {
        alert("Date of Birth is compulsory.");
        return;
      }
      if (!isAdult(data.dob)) {
        alert("You must be 18 years or older to use this app.");
        return;
      }
    }
    // Validation for other steps can be skipped if desired, or enforced lightly.
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSkip = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setData({ ...data, avatarFile: file });
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setData({ ...data, coverFile: file });
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newFiles = [...data.stalkMeFiles];
      newFiles[index] = file;

      const newPreviews = [...stalkMePreviews];
      newPreviews[index] = URL.createObjectURL(file);
      setStalkMePreviews(newPreviews);

      const updatedFiles = [...data.stalkMeFiles];
      updatedFiles[index] = file;
      setData(prev => ({ ...prev, stalkMeFiles: updatedFiles }));
    }
  };

  const updateArrayItem = (field: keyof ProfileFormData, index: number, value: string) => {
    const arr = [...(data[field] as string[])];
    arr[index] = value;
    setData({ ...data, [field]: arr });
  };

  const addTag = (field: keyof ProfileFormData, value: string) => {
    if (!value.trim()) return;
    const currentTags = data[field] as string[];
    if (!currentTags.includes(value.trim())) {
      setData({ ...data, [field]: [...currentTags, value.trim()] });
    }
  };

  const removeTag = (field: keyof ProfileFormData, tagToRemove: string) => {
    const currentTags = data[field] as string[];
    setData({ ...data, [field]: currentTags.filter(t => t !== tagToRemove) });
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const formData = new FormData();

      // Basics
      formData.append("displayName", data.displayName);
      formData.append("dob", data.dob);
      formData.append("height", data.height);
      formData.append("weight", data.weight);
      formData.append("conversationStarter", data.conversationStarter);

      // Professional
      formData.append("achievements", data.achievements);
      formData.append("workHistory", data.workHistory);
      formData.append("education", data.education);
      formData.append("skills", JSON.stringify(data.skills));

      // Vibe
      formData.append("city", data.city);
      formData.append("interactionMode", data.interactionMode);
      formData.append("bestVibeTime", data.bestVibeTime);
      formData.append("vibeWithPeople", data.vibeWithPeople);
      formData.append("lifeIsLike", data.lifeIsLike);

      // Deep dive
      formData.append("emotionalFit", data.emotionalFit);
      formData.append("pleaseDont", data.pleaseDont);
      formData.append("careAbout", data.careAbout);
      formData.append("protectiveAbout", data.protectiveAbout);
      formData.append("distanceMakers", data.distanceMakers);
      formData.append("goals", data.goals);
      formData.append("lifestyle", data.lifestyle);

      // Arrays
      formData.append("values", JSON.stringify(data.values));
      formData.append("hardNos", JSON.stringify(data.hardNos));
      formData.append("topMovies", JSON.stringify(data.topMovies.filter(x => x)));
      formData.append("topGenres", JSON.stringify(data.topGenres.filter(x => x)));
      formData.append("topSongs", JSON.stringify(data.topSongs.filter(x => x)));
      formData.append("topFoods", JSON.stringify(data.topFoods.filter(x => x)));
      formData.append("topPlaces", JSON.stringify(data.topPlaces.filter(x => x)));
      formData.append("topGames", JSON.stringify(data.topGames.filter(x => x)));
      formData.append("currentlyInto", JSON.stringify(data.currentlyInto));
      formData.append("dislikes", JSON.stringify(data.dislikes));
      formData.append("icks", JSON.stringify(data.icks));
      formData.append("interactionTopics", JSON.stringify(data.interactionTopics));

      // Note: "Stalk Me" files simplistic handling for demo

      // Append Avatar & Cover if present
      if (data.avatarFile) formData.append("avatar", data.avatarFile);
      if (data.coverFile) formData.append("cover", data.coverFile);

      const res = await fetch("/api/profile", {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        router.push("/profile");
      } else {
        alert("Failed to save profile.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner variant="auth" message="Saving your universe..." />;

  const renderStep = () => {
    switch (step) {
      case 1: // Basics
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold text-white mb-2">The Basics</h2>

            {/* Avatar & Cover Upload */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-white/10 overflow-hidden border border-white/20 relative group">
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">Upload</div>
                    )}
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <div className="text-xs text-gray-400">
                    Tap to upload your avatar.
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Cover Media (Image/Video)</label>
                <div className="w-full h-32 rounded-xl bg-white/10 overflow-hidden border border-white/20 relative group">
                  {coverPreview ? (
                    // Simple check for video preview, though URL.createObjectURL works for video src too
                    coverPreview.startsWith("blob:") && data.coverFile?.type.startsWith("video") ? (
                      <video src={coverPreview} className="w-full h-full object-cover" autoPlay muted loop />
                    ) : (
                      <img src={coverPreview} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">Tap to upload Cover (Image or Video)</div>
                  )}
                  <input type="file" accept="image/*,video/*" onChange={handleCoverChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Display Name *</label>
                <input
                  value={data.displayName}
                  onChange={e => setData({ ...data, displayName: e.target.value })}
                  className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white focus:ring-2 focus:ring-white/50 outline-none"
                  placeholder="Your Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Date of Birth *</label>
                <input
                  type="date"
                  value={data.dob}
                  onChange={e => setData({ ...data, dob: e.target.value })}
                  className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white focus:ring-2 focus:ring-white/50 outline-none [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Height</label>
                <input
                  value={data.height}
                  onChange={e => setData({ ...data, height: e.target.value })}
                  className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white focus:ring-2 focus:ring-white/50 outline-none"
                  placeholder="e.g. 5'10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Weight</label>
                <input
                  value={data.weight}
                  onChange={e => setData({ ...data, weight: e.target.value })}
                  className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white focus:ring-2 focus:ring-white/50 outline-none"
                  placeholder="e.g. 70kg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Conversation Starter</label>
              <textarea
                value={data.conversationStarter}
                onChange={e => setData({ ...data, conversationStarter: e.target.value })}
                className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white h-24 resize-none focus:ring-2 focus:ring-white/50 outline-none"
                placeholder="The first thing you should ask me is..."
              />
            </div>
          </div>
        );
      case 2: // Professional (New Step)
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500 h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <h2 className="text-2xl font-bold text-white mb-2">My Professional Side</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Work History / Current Work</label>
              <textarea
                value={data.workHistory}
                onChange={e => setData({ ...data, workHistory: e.target.value })}
                className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white h-24 resize-none focus:ring-2 focus:ring-white/50 outline-none"
                placeholder="Where have you worked?"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Education</label>
              <input
                value={data.education}
                onChange={e => setData({ ...data, education: e.target.value })}
                className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white focus:ring-2 focus:ring-white/50 outline-none"
                placeholder="University / High School"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Achievements</label>
              <textarea
                value={data.achievements}
                onChange={e => setData({ ...data, achievements: e.target.value })}
                className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white h-24 resize-none focus:ring-2 focus:ring-white/50 outline-none"
                placeholder="Proud moments..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Skills (Type & Enter)</label>
              <div className="flex flex-wrap gap-2 min-h-[44px] bg-white/5 border border-white/20 rounded-xl p-2">
                {data.skills.map(val => (
                  <span key={val} className="px-3 py-1 bg-white/10 border border-white/20 text-white rounded-full text-sm flex items-center gap-2">
                    {val} <button onClick={() => removeTag('skills', val)} className="hover:text-red-400">&times;</button>
                  </span>
                ))}
                <input
                  className="bg-transparent outline-none text-white flex-1 min-w-[100px]"
                  placeholder="Java, Dancing, Leadership..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addTag('skills', e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </div>
        );
      case 3: // Vibe
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold text-white mb-2">My Vibe</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">City</label>
              <input
                value={data.city}
                onChange={e => setData({ ...data, city: e.target.value })}
                className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white focus:ring-2 focus:ring-white/50 outline-none"
                placeholder="Where are you based?"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Interaction Mode</label>
              <div className="flex gap-4">
                {["Introvert", "Ambivert", "Extrovert"].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setData({ ...data, interactionMode: mode as any })}
                    className={`flex-1 py-3 rounded-xl border transition-all ${data.interactionMode === mode ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">With me life is like...</label>
              <textarea
                value={data.lifeIsLike}
                onChange={e => setData({ ...data, lifeIsLike: e.target.value })}
                className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white h-24 resize-none focus:ring-2 focus:ring-white/50 outline-none"
                placeholder="A chaotic adventure? A calm Sunday morning?"
              />
            </div>
          </div>
        )
      case 4: // Deep Dive
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500 h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <h2 className="text-2xl font-bold text-white mb-2">Deep Dive</h2>

            {/* Values Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Values Targeted (Type & Enter)</label>
              <div className="flex flex-wrap gap-2 min-h-[44px] bg-white/5 border border-white/20 rounded-xl p-2">
                {data.values.map(val => (
                  <span key={val} className="px-3 py-1 bg-white/10 border border-white/20 text-white rounded-full text-sm flex items-center gap-2">
                    {val} <button onClick={() => removeTag('values', val)} className="hover:text-red-400">&times;</button>
                  </span>
                ))}
                <input
                  className="bg-transparent outline-none text-white flex-1 min-w-[100px]"
                  placeholder="Growth, Money, Art..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addTag('values', e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>

            {/* Hard Nos */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-red-300">Hard No's (Type & Enter)</label>
              <div className="flex flex-wrap gap-2 min-h-[44px] bg-white/5 border border-white/20 rounded-xl p-2">
                {data.hardNos.map(val => (
                  <span key={val} className="px-3 py-1 bg-red-900/30 border border-red-800 text-red-100 rounded-full text-sm flex items-center gap-2">
                    {val} <button onClick={() => removeTag('hardNos', val)} className="hover:text-white">&times;</button>
                  </span>
                ))}
                <input
                  className="bg-transparent outline-none text-white flex-1 min-w-[100px]"
                  placeholder="Smoking, Late replies..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addTag('hardNos', e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Only people who can emotionally fit...</label>
              <textarea
                value={data.emotionalFit}
                onChange={e => setData({ ...data, emotionalFit: e.target.value })}
                className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white h-20 resize-none outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
        )
      case 5: // Favorites
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500 h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <h2 className="text-2xl font-bold text-white mb-2">Fun & Favorites</h2>

            {/* Helper to render 3 inputs */}
            {[
              { label: "Top 3 Movies", field: "topMovies" },
              { label: "Top 3 Songs", field: "topSongs" },
              { label: "Top 3 Genres", field: "topGenres" },
              { label: "Top 3 Foods", field: "topFoods" },
              { label: "Top 3 Places", field: "topPlaces" },
              { label: "Top 3 Games", field: "topGames" },
            ].map((item) => (
              <div key={item.field} className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{item.label}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <input
                      key={i}
                      value={(data[item.field as keyof ProfileFormData] as string[])[i]}
                      onChange={e => updateArrayItem(item.field as keyof ProfileFormData, i, e.target.value)}
                      className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-sm text-white outline-none focus:border-white/50"
                      placeholder={`#${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      case 6: // Stalk Me
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold text-white mb-2">Stalk Me Folder</h2>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="aspect-square bg-white/5 border border-white/10 rounded-xl overflow-hidden relative group hover:border-white/40 transition-colors">
                  {stalkMePreviews[i] ? (
                    <img src={stalkMePreviews[i]} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                      +{i + 1}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => handleFileChange(e, i)}
                  />
                </div>
              ))}
            </div>
          </div>
        )
    }
  }

  return (
    <ScrollStarfield variant="default">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl relative z-10">
          <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/40 backdrop-blur-md z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black border border-white/20 flex items-center justify-center font-bold text-white">
                  {step}/{totalSteps}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Setup Profile</h1>
                  {/* Optional subtitle driven by step */}
                </div>
              </div>
              {/* Skip Button showing for steps > 1 */}
              {step > 1 && step < totalSteps && (
                <button onClick={handleSkip} className="text-xs text-gray-400 hover:text-white uppercase tracking-wider">
                  Skip
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
              {renderStep()}
            </div>

            {/* Footer / Navigation */}
            <div className="p-6 border-t border-white/10 bg-black/40 backdrop-blur-md sticky bottom-0 z-20 flex justify-between">
              <button
                onClick={handleBack}
                disabled={step === 1}
                className={`px-6 py-3 rounded-xl font-medium transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
              >
                Back
              </button>

              {step === totalSteps ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-3 bg-black border border-white/20 hover:bg-white/10 text-white rounded-xl font-bold shadow-lg transition-all transform hover:scale-105"
                >
                  {loading ? "Launching..." : "Complete Setup"}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold shadow-lg transition-all transform hover:scale-105"
                >
                  Next
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </ScrollStarfield>
  );
}
