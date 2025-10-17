"use client";
import { useEffect, useMemo, useState } from "react";

type Blueprint = {
  person: string;
  needs: string;
  joys: string;
  ruptureSignals: string;
  repairScript: string;
};

type OrbitBody = { name: string; type: "planet" | "moon"; distance: number };

export default function BondsPage() {
  // Core blueprint
  const [bp, setBp] = useState<Blueprint>({
    person: "",
    needs: "",
    joys: "",
    ruptureSignals: "",
    repairScript: "",
  });
  const [saving, setSaving] = useState(false);
  const [log, setLog] = useState("");
  const [status, setStatus] = useState("");

  // Streaks / levels / coins
  const [streak, setStreak] = useState(0);
  const [bondLevel, setBondLevel] = useState(1);
  const [glowCoins, setGlowCoins] = useState(0);

  // Emotion Weather
  const [weather, setWeather] = useState<"sunny" | "breezy" | "overcast" | "stormy">("breezy");

  // Dare / Story / Adventures
  const dareDeck = [
    "Write a haiku about them.",
    "Leave a sticky note with a compliment.",
    "Send: ‘You popped into my mind because: ___.’",
    "Do a 2-minute gratitude call.",
    "Make a 3-song playlist with weird theme.",
  ];
  const storySeeds = [
    "You find a key labeled with their nickname.",
    "A meteor misses by 2 inches and leaves a gift.",
    "A stray cat delivers a tiny scroll at dawn.",
    "A door appears only when you both laugh.",
    "An elevator stops at a secret floor for you two.",
  ];
  const microAdventureConstraints = [
    "Budget: $0, Prop: spoon, Time: 20min",
    "Theme: space opera at home, Time: 15min",
    "Only whispering allowed, Time: 10min",
    "Rule: only questions, Time: 12min",
    "Must swap roles for 20min",
  ];

  // Handshake & Signals
  const [handshake, setHandshake] = useState<string[]>(["🤝", "👆", "👇"]);
  const [handEmoji, setHandEmoji] = useState("");

  const [signals, setSignals] = useState<{ emoji: string; meaning: string }[]>([
    { emoji: "👀", meaning: "Need attention/eye contact" },
    { emoji: "☕", meaning: "Coffee/tea break request" },
    { emoji: "🧘", meaning: "2-min breathing pause" },
  ]);

  // Boundaries Switchboard
  const [boundaries, setBoundaries] = useState([
    { key: "late-night-texts", label: "No heavy topics after 10pm", on: true },
    { key: "phone-while-talk", label: "No phone scrolling in conflict", on: false },
    { key: "location-pings", label: "Share arrival text when late", on: true },
  ]);

  // Mood Spoiler Alerts
  const [spoilers, setSpoilers] = useState<string[]>([
    "calm down",
    "whatever",
    "you always",
    "you never",
  ]);
  const [compose, setCompose] = useState("");

  // Time Capsule
  const [capsuleMsg, setCapsuleMsg] = useState("");
  const [capsuleWhen, setCapsuleWhen] = useState("");
  const [capsules, setCapsules] = useState<{ msg: string; when: string; sent?: boolean }[]>([]);

  // Alchemy
  const [ingredients, setIngredients] = useState<string[]>([
    "candlelight",
    "2-min silence",
    "hand on heart",
    "shared playlist",
    "gratitude whisper",
  ]);
  const [selectedIng, setSelectedIng] = useState<string[]>([]);
  const alchemyOutcome = useMemo(() => {
    if (selectedIng.length < 2) return "Select 2–4 ingredients to craft a ritual.";
    const mood = selectedIng.includes("2-min silence") ? "calm" : "playful";
    const anchor = selectedIng.includes("hand on heart") ? "touch" : "voice";
    return `Ritual: a ${mood} ${anchor}-anchored minute with ${selectedIng.join(" + ")}. End with “what felt good?”`;
  }, [selectedIng]);

  // Rupture Bingo
  const bingoCells = [
    "Raised voice",
    "Interrupting",
    "Mind-reading",
    "Silent retreat",
    "Sarcasm",
    "Scorekeeping",
    "Whataboutism",
    "Fixing too fast",
    "Defensiveness",
  ];
  const [bingoState, setBingoState] = useState<string[]>([]);

  // Orbit builder
  const [orbits, setOrbits] = useState<OrbitBody[]>([
    { name: "Us", type: "planet", distance: 1 },
    { name: "Work", type: "planet", distance: 3 },
    { name: "Family", type: "planet", distance: 2 },
    { name: "Hobby", type: "moon", distance: 4 },
  ]);
  const [newOrbitName, setNewOrbitName] = useState("");
  const [newOrbitType, setNewOrbitType] = useState<"planet" | "moon">("planet");

  // Story roulette
  const [story, setStory] = useState<string | null>(null);

  // Red Button of Grace
  const [graceCount, setGraceCount] = useState(0);

  useEffect(() => setStatus(""), [bp, log, compose]);

  // Weather logic
  useEffect(() => {
    if (streak >= 10) setWeather("sunny");
    else if (streak >= 5) setWeather("breezy");
    else if (streak >= 2) setWeather("overcast");
    else setWeather("stormy");
  }, [streak]);

  const flagged = spoilers.filter(sp => compose.toLowerCase().includes(sp));

  // Local "scheduler"
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      const updated = capsules.map(c => {
        if (!c.sent && c.when && new Date(c.when) <= now) {
          return { ...c, sent: true };
        }
        return c;
      });
      setCapsules(updated);
    }, 5000);
    return () => clearInterval(t);
  }, [capsules]);

  async function saveBlueprint() {
    try {
      setSaving(true);
      const res = await fetch("/api/bonds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "blueprint", data: bp }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("✅ Blueprint saved");
    } catch (e: any) {
      setStatus("❌ " + (e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function saveRepairLog() {
    if (!log.trim()) return setStatus("⚠ Add a short note first");
    try {
      setSaving(true);
      const res = await fetch("/api/bonds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "repair", note: log }),
      });
      if (!res.ok) throw new Error(await res.text());
      setLog("");
      setStatus("✅ Repair logged");
      setStreak(s => s + 1);
      setGlowCoins(c => c + 3);
      setBondLevel(b => ((streak + 1) % 5 === 0 ? b + 1 : b));
    } catch (e: any) {
      setStatus("❌ " + (e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  function rollDare() {
    const pick = dareDeck[Math.floor(Math.random() * dareDeck.length)];
    setCompose(pick);
  }

  function spinStory() {
    const pick = storySeeds[Math.floor(Math.random() * storySeeds.length)];
    setStory(pick);
  }

  function addHandshakeStep() {
    if (!handEmoji.trim()) return;
    setHandshake([...handshake, handEmoji.trim()]);
    setHandEmoji("");
  }

  function toggleBoundary(key: string) {
    setBoundaries(bs => bs.map(b => b.key === key ? { ...b, on: !b.on } : b));
  }

  function scheduleCapsule() {
    if (!capsuleMsg.trim() || !capsuleWhen) return;
    setCapsules([...capsules, { msg: capsuleMsg.trim(), when: capsuleWhen }]);
    setCapsuleMsg("");
    setCapsuleWhen("");
  }

  function toggleBingo(cell: string) {
    setBingoState(s =>
      s.includes(cell) ? s.filter(x => x !== cell) : [...s, cell]
    );
  }

  const bingoWin = useMemo(() => bingoState.length >= 3, [bingoState]);

  function adjustOrbit(name: string, delta: number) {
    setOrbits(os => os.map(o => o.name === name ? { ...o, distance: Math.max(1, o.distance + delta) } : o));
  }

  function addOrbitBody() {
    if (!newOrbitName.trim()) return;
    setOrbits([...orbits, { name: newOrbitName.trim(), type: newOrbitType, distance: 3 }]);
    setNewOrbitName("");
    setNewOrbitType("planet");
  }

  function craftAlchemy(ing: string) {
    setSelectedIng(s => s.includes(ing) ? s.filter(x => x !== ing) : [...s, ing].slice(0, 4));
  }

  function spendGlowCoin() {
    if (glowCoins < 2) return;
    setGlowCoins(c => c - 2);
    setCompose("Redeem: 10-min back rub OR take over a chore tonight.");
  }

  function redButtonOfGrace() {
    setGraceCount(c => c + 1);
    setCompose("Grace Pact: ‘We’re resetting this moment. Breath in 4, out 6. Huddle in 60 minutes if needed.’");
    setStatus("🧯 Grace applied — heat cleared & pact logged.");
  }

  function generateAdventure() {
    const pick = microAdventureConstraints[Math.floor(Math.random() * microAdventureConstraints.length)];
    setCompose(`Micro-Adventure: ${pick}. Idea: Build a 2-scene play in the living room.`);
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
      {/* floating interactive shapes (decor only, css hover/animate) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="pointer-events-auto absolute top-8 right-16 h-24 w-24 rounded-full bg-indigo-400/25 mix-blend-multiply animate-pulse" />
        <div className="pointer-events-auto absolute -top-6 left-6 h-28 w-36 rounded-[2rem] bg-amber-400/25 rotate-6 transition duration-500 hover:rotate-0 hover:scale-110" />
        <div className="pointer-events-auto absolute bottom-16 left-10 h-20 w-20 rounded-xl bg-emerald-400/20 blur-[1px] transition duration-500 hover:scale-125" />
        <div className="pointer-events-auto absolute bottom-10 right-1/4 h-16 w-28 rounded-3xl bg-rose-400/20 -rotate-12 transition duration-500 hover:rotate-0 hover:scale-110" />
      </div>

      <div className="relative grid gap-6 lg:gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">💞 Bond Dashboard</h1>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-600 text-white text-sm px-3.5 py-1.5">level {bondLevel}</span>
            <span className="rounded-full bg-rose-600 text-white text-sm px-3.5 py-1.5">coins {glowCoins}</span>
          </div>
        </div>

        {/* tiles layout across full width */}
        <div className="grid gap-6 lg:gap-8 lg:[grid-template-columns:repeat(12,minmax(0,1fr))]">
          {/* Emotion Weather (wide) */}
          <section className="lg:col-span-5 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-6 grid gap-3 backdrop-blur">
            <h2 className="text-lg font-semibold">⛅ Emotion Weather</h2>
            <div className="text-2xl md:text-[30px]">
              {weather === "sunny" && "☀️ Sunny: momentum is strong"}
              {weather === "breezy" && "🌤️ Breezy: light & open"}
              {weather === "overcast" && "☁️ Overcast: watch for dips"}
              {weather === "stormy" && "⛈️ Stormy: consider a repair ritual"}
            </div>
            <div className="text-sm text-slate-500">Streak: {streak} | Level: {bondLevel}</div>
          </section>

          {/* Blueprint (tall) */}
          <section className="lg:col-span-7 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-6 grid gap-5 backdrop-blur">
            <h2 className="text-lg font-semibold">📝 Bond Blueprint</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Person</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5"
                  placeholder="Name / role"
                  value={bp.person}
                  onChange={(e) => setBp({ ...bp, person: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Shared Joys</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5"
                  placeholder="What lights you both up?"
                  value={bp.joys}
                  onChange={(e) => setBp({ ...bp, joys: e.target.value })}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Core Needs</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 h-28"
                  placeholder="What does this person need to feel safe/seen?"
                  value={bp.needs}
                  onChange={(e) => setBp({ ...bp, needs: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Rupture Signals</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 h-28"
                  placeholder="Early warning signs (tone, withdrawal, keywords)…"
                  value={bp.ruptureSignals}
                  onChange={(e) => setBp({ ...bp, ruptureSignals: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Repair Script</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 h-28"
                placeholder='“When X happened I felt Y, my need is Z. How did it land for you?”'
                value={bp.repairScript}
                onChange={(e) => setBp({ ...bp, repairScript: e.target.value })}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <button
                onClick={saveBlueprint}
                disabled={saving}
                className="rounded-full bg-slate-900 text-white px-6 py-3 text-sm hover:opacity-90 disabled:opacity-50"
              >
                Save blueprint
              </button>
              {status && <div className="text-sm text-slate-700">{status}</div>}
            </div>
          </section>

          {/* Micro-repair Log (horizontal small) */}
          <section className="lg:col-span-6 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-6 grid gap-4 backdrop-blur">
            <h2 className="text-lg font-semibold">🪄 Micro-repair Log</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5"
                placeholder="e.g., Paused, named impact, asked ‘what do you need now?’"
                value={log}
                onChange={(e) => setLog(e.target.value)}
              />
              <button
                onClick={saveRepairLog}
                disabled={saving}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Log
              </button>
            </div>
          </section>

          {/* Handshake Builder (compact) */}
          <section className="lg:col-span-6 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-6 grid gap-3 backdrop-blur">
            <h2 className="text-lg font-semibold">🤝 Secret Handshake Builder</h2>
            <div className="text-3xl">{handshake.join(" ")}</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="w-28 rounded-xl border border-slate-200 bg-white px-4 py-3.5"
                placeholder="Emoji"
                value={handEmoji}
                onChange={e=>setHandEmoji(e.target.value)}
              />
              <button
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm hover:bg-slate-50"
                onClick={addHandshakeStep}
              >
                + Step
              </button>
            </div>
            <div className="text-xs text-slate-500">
              Tip: include “🫶 🌀 ✨” to signal repair + reset + celebrate.
            </div>
          </section>

          {/* Story Seed Roulette */}
          <section className="lg:col-span-5 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-6 grid gap-3 backdrop-blur">
            <h2 className="text-lg font-semibold">🎡 Story Seed Roulette</h2>
            <button
              className="w-fit rounded-full bg-slate-900 text-white px-6 py-3 text-sm hover:opacity-90"
              onClick={spinStory}
            >
              Spin
            </button>
            {story && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[15px]">
                Seed: {story} — Write 5 lines together.
              </div>
            )}
          </section>

          {/* Rupture Bingo */}
          <section className="lg:col-span-7 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-6 grid gap-3 backdrop-blur">
            <h2 className="text-lg font-semibold">🧩 Rupture Bingo</h2>
            <div className="grid grid-cols-3 gap-2">
              {bingoCells.map(cell => (
                <button
                  key={cell}
                  onClick={() => toggleBingo(cell)}
                  className={`rounded-xl border px-2 py-3 text-sm transition ${
                    bingoState.includes(cell)
                      ? "bg-amber-50 border-amber-200"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {cell}
                </button>
              ))}
            </div>
            {bingoWin && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[15px]">
                Bingo! Repair task: 60 seconds of eye contact + “One thing I learned” + hug.
              </div>
            )}
          </section>

          {/* Boundaries Switchboard */}
          <section className="lg:col-span-6 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-6 grid gap-3 backdrop-blur">
            <h2 className="text-lg font-semibold">🚦 Boundaries Switchboard</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {boundaries.map(b => (
                <label
                  key={b.key}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <input type="checkbox" checked={b.on} onChange={() => toggleBoundary(b.key)} />
                  <span className="text-[15px]">{b.label}</span>
                </label>
              ))}
            </div>
            <div className="text-xs text-slate-500">Toggles generate scripts in Compose if needed.</div>
          </section>

          {/* Compose */}
          <section className="lg:col-span-6 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-6 grid gap-3 backdrop-blur">
            <h2 className="text-lg font-semibold">✍️ Compose (Soft Guards)</h2>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 h-32"
              placeholder="Draft a message…"
              value={compose}
              onChange={e => setCompose(e.target.value)}
            />
            {flagged.length > 0 && (
              <div className="text-xs text-rose-700">
                Consider rephrasing: {flagged.join(", ")}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm hover:bg-slate-50" onClick={rollDare}>
                Insert playful prompt
              </button>
              <button className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm hover:bg-slate-50" onClick={generateAdventure}>
                Micro-adventure
              </button>
              <button className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm hover:bg-slate-50 disabled:opacity-50" onClick={spendGlowCoin} disabled={glowCoins < 2}>
                Redeem Glow (2)
              </button>
              <button className="rounded-full bg-slate-900 text-white px-4 py-2.5 text-sm hover:opacity-90" onClick={redButtonOfGrace}>
                🧯 Red Button of Grace
              </button>
            </div>
          </section>

          {/* Time Capsule */}
          <section className="lg:col-span-7 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-6 grid gap-3 backdrop-blur">
            <h2 className="text-lg font-semibold">📦 Time Capsule Pings</h2>
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 sm:col-span-2"
                placeholder="Future message"
                value={capsuleMsg}
                onChange={e=>setCapsuleMsg(e.target.value)}
              />
              <input
                type="datetime-local"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3.5"
                value={capsuleWhen}
                onChange={e=>setCapsuleWhen(e.target.value)}
              />
            </div>
            <button
              className="w-fit rounded-full border border-slate-300 bg-white px-5 py-3 text-sm hover:bg-slate-50"
              onClick={scheduleCapsule}
            >
              Schedule
            </button>
            <div className="grid gap-2">
              {capsules.map((c, i) => (
                <div
                  key={i}
                  className="text-[15px] rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between"
                >
                  <span>
                    {c.msg} —{" "}
                    <span className="text-xs text-slate-500">{c.when}</span>
                  </span>
                  <span className="text-xs">{c.sent ? "📬 delivered" : "⏳ pending"}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Orbit Builder */}
          <section className="lg:col-span-5 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-6 grid gap-3 backdrop-blur">
            <h2 className="text-lg font-semibold">🪐 Orbit Builder</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {orbits.map(o => (
                <div
                  key={o.name}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <div className="text-[15px]">{o.name} {o.type === "moon" ? "🌙" : "🪐"}</div>
                    <div className="text-xs text-slate-500">Distance: {o.distance}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50" onClick={()=>adjustOrbit(o.name, -1)}>
                      ⬅️ closer
                    </button>
                    <button className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50" onClick={()=>adjustOrbit(o.name, +1)}>
                      ➡️ farther
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5"
                placeholder="Add orbit name"
                value={newOrbitName}
                onChange={e=>setNewOrbitName(e.target.value)}
              />
              <select
                className="rounded-xl border border-slate-200 bg-white px-4 py-3.5"
                value={newOrbitType}
                onChange={e=>setNewOrbitType(e.target.value as any)}
              >
                <option value="planet">planet</option>
                <option value="moon">moon</option>
              </select>
              <button
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm hover:bg-slate-50"
                onClick={addOrbitBody}
              >
                + Add
              </button>
            </div>
          </section>

          {/* Alchemy Lab */}
          <section className="lg:col-span-12 rounded-2xl bg-white/90 shadow-sm border border-slate-200 p-6 grid gap-3 backdrop-blur">
            <h2 className="text-lg font-semibold">🧪 Bond Alchemy Lab</h2>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing, i) => {
                const active = selectedIng.includes(ing);
                return (
                  <button
                    key={i}
                    onClick={() => craftAlchemy(ing)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${
                      active
                        ? "bg-violet-50 border-violet-200"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {ing}
                  </button>
                );
              })}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[15px]">
              {alchemyOutcome}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
