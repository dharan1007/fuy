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
    <div className="grid gap-8">
      <h2 className="text-xl font-semibold">✨ BondCraft Setup</h2>

      <input
        className="border rounded px-3 py-2"
        placeholder="Relationship name (e.g., Me ↔ Priya)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="grid gap-2">
        <label className="grid gap-1">
          <span className="text-sm">Repair Style</span>
          <input
            className="border rounded px-3 py-2 w-full"
            value={prefs.repairStyle}
            onChange={(e) => setPrefs({ ...prefs, repairStyle: e.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Celebration Style</span>
          <input
            className="border rounded px-3 py-2 w-full"
            value={prefs.celebrationStyle}
            onChange={(e) => setPrefs({ ...prefs, celebrationStyle: e.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Please don’t…</span>
          <input
            className="border rounded px-3 py-2 w-full"
            value={prefs.pleaseDont}
            onChange={(e) => setPrefs({ ...prefs, pleaseDont: e.target.value })}
          />
        </label>
      </div>

      <div className="grid gap-3">
        <h3 className="font-medium">🎮 Bond Quests</h3>
        <button onClick={randomQuest} className="c-btn-primary w-fit">🎲 Give me a Quest</button>
        {suggestion && <p className="p-2 border rounded bg-stone-50">{suggestion}</p>}

        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 flex-1"
            placeholder="Add a unique challenge"
            value={newQuest}
            onChange={(e) => setNewQuest(e.target.value)}
          />
          <button onClick={addQuest} className="c-btn-ghost">+ Add</button>
        </div>

        <div className="grid gap-2">
          {quests.map((q, i) => (
            <div key={i} className="text-sm text-stone-700">• {q}</div>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <h3 className="font-medium">🤫 Nonverbal Signal Deck</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {signals.map((s, i) => (
            <div key={i} className="flex items-center gap-3 border rounded px-3 py-2">
              <span className="text-xl">{s.emoji}</span>
              <span className="text-sm text-stone-700">{s.meaning}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 w-24" placeholder="Emoji" value={signalEmoji} onChange={e=>setSignalEmoji(e.target.value)} />
          <input className="border rounded px-3 py-2 flex-1" placeholder="Meaning" value={signalMeaning} onChange={e=>setSignalMeaning(e.target.value)} />
          <button onClick={addSignal} className="c-btn-ghost">+ Add</button>
        </div>
        <div className="text-xs text-stone-600">Shareable code: {signalCode}</div>
      </div>

      <div className="grid gap-3">
        <h3 className="font-medium">😂 In-Joke Factory</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {inJokes.map((j, i) => (
            <div key={i} className="border rounded px-3 py-2 text-sm">{j}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 flex-1" placeholder="Add a new inside joke"
                 value={newJoke} onChange={e=>setNewJoke(e.target.value)} />
          <button onClick={addJoke} className="c-btn-ghost">+ Save</button>
        </div>
      </div>

      <div className="grid gap-3">
        <h3 className="font-medium">🧪 Bond Alchemy Ingredients</h3>
        <div className="flex flex-wrap gap-2">
          {alchemyIngredients.map((ing, i) => (
            <span key={i} className="px-2 py-1 border rounded text-xs bg-stone-50">{ing}</span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 flex-1" placeholder="Add ingredient (ritual, prop, vibe…)" value={newIngredient} onChange={e=>setNewIngredient(e.target.value)} />
          <button onClick={addIngredient} className="c-btn-ghost">+ Add</button>
        </div>
      </div>

      <button className="bg-black text-white rounded px-4 py-2 w-fit" onClick={save}>💾 Save & Get Share Link</button>
      {share && (
        <p className="text-sm">
          Share this: <a className="underline" href={share}>{share}</a>
        </p>
      )}
    </div>
  );
}
