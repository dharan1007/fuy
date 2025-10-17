"use client";
import { useEffect, useMemo, useState } from "react";

type Prefs = {
  repairStyle: string;
  celebrationStyle: string;
  pleaseDont: string;
};

type Signal = { emoji: string; meaning: string };

const starterQuests = [
  "Send a 10-sec voice note with one oddly specific appreciation.",
  "Write a 7-word poem about a shared memory.",
  "Recreate your earliest selfie pose today.",
  "Text: “I chose a secret word for us: ___”",
  "Ask: “What rule could we break safely together?”",
];

const starterSignals: Signal[] = [
  { emoji: "👀", meaning: "Need attention/eye contact" },
  { emoji: "☕", meaning: "Coffee/tea break request" },
  { emoji: "🧘", meaning: "2-min breathing pause" },
];

const starterInJokes = [
  "The Legendary Spoon of Diplomacy",
  "Operation: Chai-Spy",
];

export default function BondBlueprint() {
  const [name, setName] = useState("");
  const [prefs, setPrefs] = useState<Prefs>({
    repairStyle: "Gentle honesty within 24h.",
    celebrationStyle: "Playful inside jokes + tiny surprises.",
    pleaseDont: "Cold silence or sarcasm in tense moments.",
  });

  const [quests, setQuests] = useState<string[]>(starterQuests);
  const [newQuest, setNewQuest] = useState("");

  const [signals, setSignals] = useState<Signal[]>(starterSignals);
  const [signalEmoji, setSignalEmoji] = useState("");
  const [signalMeaning, setSignalMeaning] = useState("");

  const [inJokes, setInJokes] = useState<string[]>(starterInJokes);
  const [newJoke, setNewJoke] = useState("");

  const [alchemyIngredients, setAlchemyIngredients] = useState<string[]>([
    "candlelight",
    "2-min silence",
    "hand on heart",
    "shared playlist",
    "gratitude whisper",
    "outside barefoot",
  ]);
  const [newIngredient, setNewIngredient] = useState("");

  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [share, setShare] = useState<string | null>(null);

  function randomQuest() {
    const pick = quests[Math.floor(Math.random() * quests.length)];
    setSuggestion(pick);
  }

  function addQuest() {
    if (!newQuest.trim()) return;
    setQuests([...quests, newQuest.trim()]);
    setNewQuest("");
  }

  function addSignal() {
    if (!signalEmoji.trim() || !signalMeaning.trim()) return;
    setSignals([...signals, { emoji: signalEmoji.trim(), meaning: signalMeaning.trim() }]);
    setSignalEmoji("");
    setSignalMeaning("");
  }

  function addJoke() {
    if (!newJoke.trim()) return;
    setInJokes([...inJokes, newJoke.trim()]);
    setNewJoke("");
  }

  function addIngredient() {
    if (!newIngredient.trim()) return;
    setAlchemyIngredients([...alchemyIngredients, newIngredient.trim()]);
    setNewIngredient("");
  }

  const signalCode = useMemo(() => {
    // Short shareable code like 👀=ATTN|☕=BREAK
    return signals.map(s => `${s.emoji}=${s.meaning.split(" ").slice(0,1).join("").toUpperCase()}`).join("|");
  }, [signals]);

  async function save() {
    const res = await fetch("/api/bonds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        preferences: prefs,
        questDeck: quests,
        signals,
        inJokes,
        alchemyIngredients,
        signalCode
      }),
    });
    const data = await res.json();
    setShare(`${location.origin}/bonds?code=${data.shareCode}`);
  }

  return (
    <div
      className="
        relative min-h-screen w-full
        p-4 sm:p-6 lg:p-10
        text-[17px] md:text-[18px] lg:text-[19px]
        [background-image:radial-gradient(theme(colors.slate.300)_1px,transparent_1px)]
        [background-size:18px_18px]
        [background-position:0_0]
      "
    >
      {/* floating interactive shapes (decorative only, css hover/animate) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="pointer-events-auto absolute -top-6 left-8 h-24 w-24 rounded-2xl bg-cyan-400/30 blur-[2px] transition duration-500 hover:rotate-6 hover:scale-110" />
        <div className="pointer-events-auto absolute top-1/3 -left-10 h-28 w-28 rounded-full bg-indigo-400/25 mix-blend-multiply animate-pulse" />
        <div className="pointer-events-auto absolute bottom-16 right-10 h-28 w-40 rounded-[2rem] bg-rose-400/25 rotate-12 transition duration-500 hover:rotate-0 hover:scale-110" />
        <div className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full bg-emerald-400/20 backdrop-blur-[1px] transition duration-500 hover:scale-125" />
      </div>

      <div className="relative grid gap-6 lg:gap-8">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">✨ BondCraft Setup</h2>

        {/* responsive fluid grid of tiles */}
        <div
          className="
            grid gap-6
            sm:grid-cols-2
            lg:[grid-template-columns:repeat(12,minmax(0,1fr))]
          "
        >
          {/* Name */}
          <div className="lg:col-span-5 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-5 lg:p-6 backdrop-blur">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-[17px] md:text-[18px] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200"
              placeholder="Relationship name (e.g., Me ↔ Priya)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Preferences block (horizontal feel) */}
          <div className="lg:col-span-7 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-5 lg:p-6 backdrop-blur">
            <div className="grid md:grid-cols-3 gap-4">
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-500">Repair Style</span>
                <input
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 w-full focus:outline-none focus:ring-4 focus:ring-slate-200"
                  value={prefs.repairStyle}
                  onChange={(e) => setPrefs({ ...prefs, repairStyle: e.target.value })}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-500">Celebration Style</span>
                <input
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 w-full focus:outline-none focus:ring-4 focus:ring-slate-200"
                  value={prefs.celebrationStyle}
                  onChange={(e) => setPrefs({ ...prefs, celebrationStyle: e.target.value })}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-500">Please don’t…</span>
                <input
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 w-full focus:outline-none focus:ring-4 focus:ring-slate-200"
                  value={prefs.pleaseDont}
                  onChange={(e) => setPrefs({ ...prefs, pleaseDont: e.target.value })}
                />
              </label>
            </div>
          </div>

          {/* Quests */}
          <div className="lg:col-span-5 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-5 lg:p-6 backdrop-blur">
            <div className="grid gap-4">
              <h3 className="text-xl font-semibold">🎮 Bond Quests</h3>
              <button
                onClick={randomQuest}
                className="w-fit rounded-full bg-slate-900 text-white px-6 py-3 text-sm hover:opacity-90 transition"
              >
                🎲 Give me a Quest
              </button>
              {suggestion && (
                <p className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-800">
                  {suggestion}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200"
                  placeholder="Add a unique challenge"
                  value={newQuest}
                  onChange={(e) => setNewQuest(e.target.value)}
                />
                <button
                  onClick={addQuest}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm hover:bg-slate-50"
                >
                  + Add
                </button>
              </div>
              <div className="grid gap-2">
                {quests.map((q, i) => (
                  <div key={i} className="text-[15px] text-slate-700">• {q}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Signals */}
          <div className="lg:col-span-7 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-5 lg:p-6 backdrop-blur">
            <div className="grid gap-4">
              <h3 className="text-xl font-semibold">🤫 Nonverbal Signal Deck</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {signals.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                  >
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="text-[15px] text-slate-700">{s.meaning}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="w-28 rounded-xl border border-slate-200 bg-white px-4 py-3.5 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200"
                  placeholder="Emoji"
                  value={signalEmoji}
                  onChange={e=>setSignalEmoji(e.target.value)}
                />
                <input
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200"
                  placeholder="Meaning"
                  value={signalMeaning}
                  onChange={e=>setSignalMeaning(e.target.value)}
                />
                <button
                  onClick={addSignal}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm hover:bg-slate-50"
                >
                  + Add
                </button>
              </div>
              <div className="text-xs text-slate-500">
                Shareable code: <span className="font-mono">{signalCode}</span>
              </div>
            </div>
          </div>

          {/* In-jokes */}
          <div className="lg:col-span-6 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-5 lg:p-6 backdrop-blur">
            <div className="grid gap-4">
              <h3 className="text-xl font-semibold">😂 In-Joke Factory</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {inJokes.map((j, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px]">
                    {j}
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200"
                  placeholder="Add a new inside joke"
                  value={newJoke}
                  onChange={e=>setNewJoke(e.target.value)}
                />
                <button
                  onClick={addJoke}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm hover:bg-slate-50"
                >
                  + Save
                </button>
              </div>
            </div>
          </div>

          {/* Alchemy */}
          <div className="lg:col-span-6 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-5 lg:p-6 backdrop-blur">
            <div className="grid gap-4">
              <h3 className="text-xl font-semibold">🧪 Bond Alchemy Ingredients</h3>
              <div className="flex flex-wrap gap-2">
                {alchemyIngredients.map((ing, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-700"
                  >
                    {ing}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200"
                  placeholder="Add ingredient (ritual, prop, vibe…)"
                  value={newIngredient}
                  onChange={e=>setNewIngredient(e.target.value)}
                />
                <button
                  onClick={addIngredient}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm hover:bg-slate-50"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save + Share */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            className="rounded-full bg-slate-900 text-white px-6 py-3 text-sm hover:opacity-90 transition"
            onClick={save}
          >
            💾 Save & Get Share Link
          </button>
          {share && (
            <p className="text-sm">
              Share this:{" "}
              <a className="underline decoration-slate-400 underline-offset-4" href={share}>
                {share}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
