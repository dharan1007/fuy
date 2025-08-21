"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Types
type Archetype =
  | "Warrior"
  | "Sage"
  | "Visionary"
  | "Trickster"
  | "Muse"
  | "Healer"
  | "Ruler"
  | "Explorer"
  | "Lover"
  | "Magician"
  | "Everyperson"
  | "Creator"
  | "Shadow";

type Persona = {
  name: string;
  symbol: string; // emoji or short sigil
  archetype: Archetype;
  appearancePrompt: string; // used to generate avatar image
  avatarUrl?: string; // set after generation
  traits: string[];
  strengths: string[];
  shadows: string[];
  voice: string; // how they speak
  evolution: number; // 1..10
};

type DiaryEntry = { role: "YOU" | "ALTER"; text: string; ts: number };

type Quest = {
  id: string;
  title: string;
  archetype: Archetype;
  instructions: string;
  status: "locked" | "active" | "completed";
  logs: string[];
  feedback?: string;
};

type Scenario = {
  id: string;
  title: string;
  prompt: string;
  rehearsal: string;
  integration: string;
};

type SharePost = {
  id: string;
  title: string;
  content: string;
  personaSnapshot: Partial<Persona>;
  ts: number;
  hearts: number;
};

// Utility: pseudo-AI response seeded by persona
function personaReply(input: string, p: Persona): string {
  const tonesByArchetype: Partial<Record<Archetype, string[]>> = {
    Warrior: [
      "Steel your breath. Simplicity, directness, courage.",
      "Draw a clear line. Step across it.",
      "Fear is a compass pointing to your frontier.",
    ],
    Sage: [
      "Slow the mind: clarity emerges in quiet inquiry.",
      "What assumption here needs dissolving?",
      "Remember: the question shapes the horizon.",
    ],
    Visionary: [
      "See the future. Now behave as if it’s already true.",
      "Name the possibility aloud three times.",
      "Invent the ritual that makes this inevitable.",
    ],
    Trickster: [
      "Flip it. If it were funny, what would you do?",
      "Break one polite rule today.",
      "Chaos is a paintbrush. Splash it wisely.",
    ],
    Muse: [
      "Make beauty the answer.",
      "Exaggerate the color until it sings.",
      "What if delight were your teacher?",
    ],
    Healer: [
      "Place your hand on the wound and breathe.",
      "Whisper: ‘I forgive the delay.’",
      "Rest is action in slow motion.",
    ],
    Ruler: [
      "Set the standard. Announce it publicly.",
      "Delegate what drains, guard what matters.",
      "Design the system; the system designs you.",
    ],
    Explorer: [
      "Pick a direction you’ve never taken. Walk 10 minutes.",
      "Curiosity before certainty.",
      "Map the edges; gold hides there.",
    ],
    Lover: [
      "Choose the most alive option.",
      "Let tenderness be your superpower.",
      "Savor detail; devotion clarifies.",
    ],
    Magician: [
      "Name the pattern; change the spell.",
      "Transmute fear into focus.",
      "A small daily ritual unlocks large doors.",
    ],
    Everyperson: [
      "Ask for help out loud.",
      "Ordinary steps compound into miracles.",
      "Be human on purpose.",
    ],
    Creator: [
      "Make a rough draft in 10 minutes.",
      "Ship something imperfect today.",
      "Constraints are your muse.",
    ],
    Shadow: [
      "What do you refuse to feel? Feel 1% of it now.",
      "Own the envy; find the unlived wish within it.",
      "Power arrives when you stop pretending.",
    ],
  };

  const pool =
    tonesByArchetype[p.archetype] ??
    ["I am the voice you hide and the strength you seek. Begin."];

  const seed = Math.max(0, input.length + p.traits.join("").length) % pool.length;
  const voiceLead = p.voice ? `(${p.voice}) ` : "";
  return `${voiceLead}${pool[seed]}`;
}

// Utility: id
const uid = () => Math.random().toString(36).slice(2, 9);

// Simple local “backend”
async function savePost(url: string, data: any) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export default function AlterEgoLab() {
  const [phase, setPhase] = useState<
    | "mirror"
    | "builder"
    | "dialogue"
    | "quests"
    | "arena"
    | "dashboard"
    | "community"
  >("mirror");

  const [persona, setPersona] = useState<Persona>({
    name: "",
    symbol: "🪞",
    archetype: "Visionary",
    appearancePrompt: "",
    traits: [],
    strengths: [],
    shadows: [],
    voice: "luminous, grounded, a little mischievous",
    evolution: 1,
  });

  const [mirrorState, setMirrorState] = useState({
    vision: "",
    fearlessness: "",
    entrance: "",
  });

  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [inputText, setInputText] = useState("");

  const [quests, setQuests] = useState<Quest[]>(() => generateQuests());
  const [scenarios] = useState<Scenario[]>(() => defaultScenarios());

  const [community, setCommunity] = useState<SharePost[]>([]);
  const [duel, setDuel] = useState<{ left: Persona; right: Persona; topic: string } | null>(null);

  // Avatar generation stub (hook up to your image API here)
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const generateAvatar = async () => {
    setIsGeneratingAvatar(true);
    // TODO: integrate with your /api/image-gen endpoint
    // fallback: compose a data URL with initials
    const initials =
      (persona.name || "Alter Ego")
        .split(" ")
        .map((w) => w[0]?.toUpperCase())
        .slice(0, 2)
        .join("") || "AE";

    // create a simple SVG data URL
    const color = ["#6D28D9", "#0EA5E9", "#059669", "#F59E0B", "#EF4444"][persona.evolution % 5];
    const svg = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'>
        <defs>
          <radialGradient id='g' cx='50%' cy='50%' r='70%'>
            <stop offset='0%' stop-color='${color}' stop-opacity='0.95'/>
            <stop offset='100%' stop-color='#0f0f14' stop-opacity='1'/>
          </radialGradient>
        </defs>
        <rect width='100%' height='100%' fill='url(#g)'/>
        <text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-family='serif' font-size='160' fill='white'>${initials}</text>
      </svg>`
    );
    const url = `data:image/svg+xml;utf8,${svg}`;
    setPersona((p) => ({ ...p, avatarUrl: url }));
    setIsGeneratingAvatar(false);
  };

  // Mirror: convert guided answers into a first sketch
  const crystallizeFromMirror = () => {
    const name = deriveName(mirrorState);
    const traits = deriveTraits(mirrorState);
    const voice = deriveVoice(mirrorState);

    setPersona((p) => ({
      ...p,
      name,
      traits: Array.from(new Set([...p.traits, ...traits])).slice(0, 8),
      voice,
      appearancePrompt: mirrorState.entrance,
      evolution: Math.min(10, p.evolution + 1),
    }));
    setPhase("builder");
  };

  // Dialogue send
  const sendToAlter = () => {
    if (!inputText.trim()) return;
    const user: DiaryEntry = { role: "YOU", text: inputText, ts: Date.now() };
    const replyText = personaReply(inputText, persona);
    const alter: DiaryEntry = { role: "ALTER", text: replyText, ts: Date.now() + 1 };
    setDiary((d) => [...d, user, alter]);
    setInputText("");
  };

  // Quests: activate, log, complete
  const activateQuest = (id: string) =>
    setQuests((qs) =>
      qs.map((q) => (q.id === id ? { ...q, status: "active" } : q))
    );
  const completeQuest = (id: string, log: string) =>
    setQuests((qs) =>
      qs.map((q) =>
        q.id === id
          ? {
              ...q,
              status: "completed",
              logs: [...q.logs, log],
              feedback: generateQuestFeedback(q, persona),
            }
          : q
      )
    );

  // Duel of Egos
  const startDuel = (topic: string) => {
    const left: Persona = persona;
    const right: Persona = {
      ...persona,
      name: persona.name ? `${persona.name} (Shadow)` : "Shadow Twin",
      archetype: "Shadow",
      voice: "low, direct, unafraid of taboo",
      symbol: "🜨",
    };
    setDuel({ left, right, topic });
  };
  const endDuel = () => setDuel(null);

  // Community post
  const shareBreakthrough = async (title: string, content: string) => {
    const post: SharePost = {
      id: uid(),
      title,
      content,
      personaSnapshot: {
        name: persona.name,
        archetype: persona.archetype,
        symbol: persona.symbol,
        evolution: persona.evolution,
      },
      ts: Date.now(),
      hearts: 0,
    };
    setCommunity((c) => [post, ...c]);
    // wire to backend if desired
    await savePost("/api/posts", {
      feature: "ALTER_EGO_LAB_SHARE",
      content: `${title}\n\n${content}`,
    });
  };

  // Dashboard constellation layout
  const constellation = useMemo(
    () => buildConstellation(persona, quests, diary),
    [persona, quests, diary]
  );

  return (
    <section className="mx-auto max-w-5xl p-6 grid gap-6">
      <header className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-indigo-700/80 to-fuchsia-700/70 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            The Alter Ego Lab
          </h1>
          <span className="px-3 py-1 rounded-full bg-black/20 border border-white/20 text-sm">
            dreamlike practice
          </span>
        </div>
        <p className="mt-2 text-white/90 text-sm md:text-base">
          Step into a surreal mirror. Shape, train, and converse with the Other You. Integrate their power into your life.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2">
          <Tab label="Mirror" active={phase === "mirror"} onClick={() => setPhase("mirror")} />
          <Tab label="Persona Builder" active={phase === "builder"} onClick={() => setPhase("builder")} />
          <Tab label="Dialogue" active={phase === "dialogue"} onClick={() => setPhase("dialogue")} />
          <Tab label="Quests" active={phase === "quests"} onClick={() => setPhase("quests")} />
          <Tab label="Training Arena" active={phase === "arena"} onClick={() => setPhase("arena")} />
          <Tab label="Dashboard" active={phase === "dashboard"} onClick={() => setPhase("dashboard")} />
          <Tab label="Community + Rituals" active={phase === "community"} onClick={() => setPhase("community")} />
        </nav>
      </header>

      {phase === "mirror" && (
        <section className="glass-card rounded-3xl p-6 ring-1 ring-black/5 bg-white/70 backdrop-blur">
          <h2 className="text-2xl font-medium">The Mirror of Selves</h2>
          <p className="text-stone-700/90 mt-1">
            Close your eyes. Imagine the fearless version of you entering a room.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <MirrorPrompt
              label="If you lived without fear, how would you present yourself?"
              placeholder="Describe attire, posture, micro-expressions, scent of the scene..."
              value={mirrorState.vision}
              onChange={(v) => setMirrorState((s) => ({ ...s, vision: v }))}
            />
            <MirrorPrompt
              label="What would your voice sound like?"
              placeholder="Timbre, cadence, first sentence you’d say..."
              value={mirrorState.fearlessness}
              onChange={(v) => setMirrorState((s) => ({ ...s, fearlessness: v }))}
            />
            <MirrorPrompt
              label="Describe the entrance."
              placeholder="Door, lighting, who notices, what changes in the air..."
              value={mirrorState.entrance}
              onChange={(v) => setMirrorState((s) => ({ ...s, entrance: v }))}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary" onClick={crystallizeFromMirror}>
              Crystallize Persona
            </button>
            <span className="text-xs text-stone-600">
              Your words will seed the first sketch of your alter ego.
            </span>
          </div>
        </section>
      )}

      {phase === "builder" && (
        <section className="rounded-3xl p-6 ring-1 ring-black/5 bg-white/80 backdrop-blur grid gap-5">
          <h2 className="text-2xl font-medium">Persona Builder</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl ring-1 ring-black/5">
              <label className="text-sm text-stone-600">Name or Sigil</label>
              <input
                className="input w-full mt-1"
                placeholder="e.g., Shadowfox, The Radiant One, Oracle of Sparks"
                value={persona.name}
                onChange={(e) => setPersona({ ...persona, name: e.target.value })}
              />
              <label className="text-sm text-stone-600 mt-3 block">Symbol</label>
              <input
                className="input w-full mt-1"
                placeholder="emoji or rune"
                value={persona.symbol}
                onChange={(e) => setPersona({ ...persona, symbol: e.target.value })}
              />
              <label className="text-sm text-stone-600 mt-3 block">Archetype</label>
              <select
                className="input w-full mt-1"
                value={persona.archetype}
                onChange={(e) => setPersona({ ...persona, archetype: e.target.value as Archetype })}
              >
                {ARCHETYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-2xl ring-1 ring-black/5">
              <label className="text-sm text-stone-600">Traits</label>
              <TagInput
                placeholder="curious, decisive, playful..."
                values={persona.traits}
                onAdd={(v) => setPersona((p) => ({ ...p, traits: uniqPush(p.traits, v) }))}
                onRemove={(i) => setPersona((p) => ({ ...p, traits: removeIndex(p.traits, i) }))}
              />
              <label className="text-sm text-stone-600 mt-3 block">Strengths</label>
              <TagInput
                placeholder="focus, empathy, boldness..."
                values={persona.strengths}
                onAdd={(v) => setPersona((p) => ({ ...p, strengths: uniqPush(p.strengths, v) }))}
                onRemove={(i) => setPersona((p) => ({ ...p, strengths: removeIndex(p.strengths, i) }))}
              />
              <label className="text-sm text-stone-600 mt-3 block">Shadows</label>
              <TagInput
                placeholder="impatience, avoidance, perfectionism..."
                values={persona.shadows}
                onAdd={(v) => setPersona((p) => ({ ...p, shadows: uniqPush(p.shadows, v) }))}
                onRemove={(i) => setPersona((p) => ({ ...p, shadows: removeIndex(p.shadows, i) }))}
              />
            </div>

            <div className="p-4 rounded-2xl ring-1 ring-black/5">
              <label className="text-sm text-stone-600">Appearance (Art Prompt)</label>
              <textarea
                className="input w-full min-h-[92px] mt-1"
                placeholder="e.g. neon shawl, geometric mask, starfield cloak..."
                value={persona.appearancePrompt}
                onChange={(e) => setPersona({ ...persona, appearancePrompt: e.target.value })}
              />
              <div className="mt-3 flex items-center gap-2">
                <button className="btn btn-primary" onClick={generateAvatar} disabled={isGeneratingAvatar}>
                  {isGeneratingAvatar ? "Conjuring..." : "Generate Avatar"}
                </button>
                {persona.avatarUrl && (
                  <img
                    src={persona.avatarUrl}
                    alt="avatar"
                    className="w-16 h-16 rounded-xl ring-1 ring-black/10 object-cover"
                  />
                )}
              </div>
              <label className="text-sm text-stone-600 mt-3 block">Voice</label>
              <input
                className="input w-full mt-1"
                placeholder="e.g., calm, sly, poetic, grounded"
                value={persona.voice}
                onChange={(e) => setPersona({ ...persona, voice: e.target.value })}
              />
              <div className="mt-3 text-sm">
                Evolution: <b>{persona.evolution}</b>/10
                <button
                  className="btn btn-ghost ml-2"
                  onClick={() =>
                    setPersona((p) => ({ ...p, evolution: Math.min(10, p.evolution + 1) }))
                  }
                >
                  Level Up
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn" onClick={() => setPhase("dialogue")}>
              Continue to Dialogue
            </button>
            <button className="btn btn-ghost" onClick={() => setPhase("quests")}>
              Visit Quests
            </button>
          </div>
        </section>
      )}

      {phase === "dialogue" && (
        <section className="rounded-3xl p-6 ring-1 ring-black/5 bg-white/80 backdrop-blur">
          <h2 className="text-2xl font-medium">Dual Diary: You × {persona.name || "Alter Ego"}</h2>
          <p className="text-stone-700/90 text-sm mt-1">Two columns. Two voices. Discover the synthesis.</p>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl ring-1 ring-black/5 bg-white">
              <div className="text-sm text-stone-600 mb-1">You</div>
              <textarea
                className="input w-full min-h-[120px]"
                placeholder="Confess a dilemma, desire, or block..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button className="btn btn-primary mt-2" onClick={sendToAlter}>
                Speak & Receive
              </button>
            </div>
            <div className="p-4 rounded-2xl ring-1 ring-black/5 bg-gradient-to-b from-indigo-50 to-fuchsia-50">
              <div className="text-sm text-stone-600 mb-1">{persona.name || "Alter Ego"}</div>
              <div className="min-h-[120px] whitespace-pre-wrap">
                {diary.filter((d) => d.role === "ALTER").slice(-1)[0]?.text || "…awaiting your words"}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="font-medium">Conversation Log</h3>
            <div className="mt-2 grid gap-2">
              {diary.map((d, i) => (
                <div key={i} className="text-sm">
                  <span className={`px-2 py-0.5 rounded-full mr-2 ${d.role === "YOU" ? "bg-stone-100" : "bg-indigo-100"}`}>
                    {d.role}
                  </span>
                  <span className="whitespace-pre-wrap">{d.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn" onClick={() => setPhase("arena")}>Training Arena</button>
            <button className="btn btn-ghost" onClick={() => setPhase("dashboard")}>Open Dashboard</button>
          </div>
        </section>
      )}

      {phase === "quests" && (
        <section className="rounded-3xl p-6 ring-1 ring-black/5 bg-white/80 backdrop-blur">
          <h2 className="text-2xl font-medium">Archetype Exploration Quests</h2>
          <p className="text-stone-700/90 text-sm mt-1">
            Embodiment missions inspired by Jungian and narrative therapy.
          </p>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            {quests.map((q) => (
              <div key={q.id} className="p-4 rounded-2xl ring-1 ring-black/5 bg-white">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{q.title}</div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100">{q.archetype}</span>
                </div>
                <p className="text-sm text-stone-700/90 mt-1">{q.instructions}</p>

                {q.status === "locked" && (
                  <button className="btn btn-ghost mt-2" onClick={() => activateQuest(q.id)}>
                    Begin
                  </button>
                )}

                {q.status === "active" && (
                  <QuestLogger
                    onComplete={(log) => completeQuest(q.id, log)}
                    label="Log your experience and complete"
                  />
                )}

                {q.status === "completed" && (
                  <div className="mt-3 text-sm">
                    <div className="text-stone-600">Logs</div>
                    <ul className="list-disc ml-5 mt-1">
                      {q.logs.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                    <div className="mt-2 p-3 bg-indigo-50 rounded-xl">
                      <div className="text-stone-700">Feedback</div>
                      <div className="text-stone-800 mt-1">{q.feedback}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button className="btn" onClick={() => setPhase("dialogue")}>Return to Dialogue</button>
          </div>
        </section>
      )}

      {phase === "arena" && (
        <section className="rounded-3xl p-6 ring-1 ring-black/5 bg-white/80 backdrop-blur grid gap-5">
          <h2 className="text-2xl font-medium">Alter Ego Training Arena</h2>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Embodiment */}
            <div className="p-4 rounded-2xl ring-1 ring-black/5 bg-white">
              <h3 className="font-medium">Embodiment</h3>
              <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
                <li>Voice practice: read a paragraph in {persona.name || "your alter ego"}’s tone.</li>
                <li>Posture drill: 2 minutes in the stance that signals courage or grace.</li>
                <li>Micro-ritual: a gesture to summon presence before tough moments.</li>
              </ul>
            </div>
            {/* Scenario rehearsals */}
            <div className="p-4 rounded-2xl ring-1 ring-black/5 bg-white">
              <h3 className="font-medium">Scenario Rehearsals</h3>
              <div className="mt-2 grid gap-2">
                {scenarios.map((s) => (
                  <div key={s.id} className="border rounded-xl p-3">
                    <div className="text-sm font-medium">{s.title}</div>
                    <div className="text-xs text-stone-600 mt-1">{s.prompt}</div>
                    <textarea
                      className="input w-full mt-2 min-h-[72px]"
                      placeholder="Write your rehearsal as the alter ego..."
                      onChange={(e) => (s.rehearsal = e.target.value)}
                    />
                    <textarea
                      className="input w-full mt-2 min-h-[56px]"
                      placeholder="Integration: what does your everyday self keep?"
                      onChange={(e) => (s.integration = e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* Integration rituals */}
            <div className="p-4 rounded-2xl ring-1 ring-black/5 bg-white">
              <h3 className="font-medium">Integration Rituals</h3>
              <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
                <li>Evening synthesis: 3 lines from them, 1 line from you.</li>
                <li>Token carry: a small object that embodies the alter ego.</li>
                <li>Boundary spell: define what the alter ego does not decide.</li>
              </ul>
            </div>
          </div>

          <div>
            <button className="btn btn-ghost" onClick={() => setPhase("dashboard")}>
              View Self-Discovery Dashboard
            </button>
          </div>
        </section>
      )}

      {phase === "dashboard" && (
        <section className="rounded-3xl p-6 ring-1 ring-black/5 bg-white/80 backdrop-blur">
          <h2 className="text-2xl font-medium">Self-Discovery Dashboard</h2>
          <p className="text-stone-700/90 text-sm mt-1">
            A living constellation of identities—self, alter ego, strengths, fears, and evolving shadows.
          </p>

          <ConstellationView data={constellation} />

          <div className="mt-4 flex gap-2">
            <button className="btn" onClick={() => setPhase("community")}>
              Community + Ritual Space
            </button>
            <button className="btn btn-ghost" onClick={() => setPhase("dialogue")}>
              Back to Dialogue
            </button>
          </div>
        </section>
      )}

      {phase === "community" && (
        <section className="rounded-3xl p-6 ring-1 ring-black/5 bg-white/80 backdrop-blur grid gap-5">
          <h2 className="text-2xl font-medium">Community + Ritual Space</h2>
          <p className="text-stone-700/90 text-sm">
            Anonymous circles, shared wisdom, improv rituals, and duels of egos.
          </p>

          {/* Sharing */}
          <ShareComposer onShare={shareBreakthrough} persona={persona} />

          {/* Duel of Egos */}
          <div className="p-4 rounded-2xl ring-1 ring-black/5 bg-white">
            <h3 className="font-medium">Duel of Egos (Improv)</h3>
            {!duel ? (
              <DuelStarter onStart={startDuel} />
            ) : (
              <DuelStage duel={duel} onEnd={endDuel} />
            )}
          </div>

          {/* Stream */}
          <div className="p-4 rounded-2xl ring-1 ring-black/5 bg-white">
            <h3 className="font-medium">Anonymous Stream</h3>
            <div className="grid gap-3 mt-2">
              {community.map((post) => (
                <div key={post.id} className="p-3 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{post.title}</div>
                    <div className="text-xs text-stone-500">
                      {new Date(post.ts).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm mt-1 whitespace-pre-wrap">{post.content}</div>
                  <div className="text-xs text-stone-600 mt-2">
                    {post.personaSnapshot.symbol || "🔮"} {post.personaSnapshot.name || "Alter Ego"} ·{" "}
                    {post.personaSnapshot.archetype}
                  </div>
                </div>
              ))}
              {community.length === 0 && (
                <div className="text-sm text-stone-600">Be the first to share a ritual or breakthrough.</div>
              )}
            </div>
          </div>
        </section>
      )}
    </section>
  );
}

/* ---------- UI Subcomponents ---------- */

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`px-3 py-1 rounded-full border ${
        active ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MirrorPrompt({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="p-4 rounded-2xl ring-1 ring-black/5 bg-white">
      <div className="text-sm text-stone-600">{label}</div>
      <textarea
        className="input w-full min-h-[100px] mt-2"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TagInput({
  values,
  onAdd,
  onRemove,
  placeholder,
}: {
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder?: string;
}) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (v) onAdd(v);
    setVal("");
  };
  return (
    <div>
      <div className="flex gap-2 mt-1">
        <input
          className="input flex-1"
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn" onClick={add}>
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {values.map((t, i) => (
          <span key={i} className="px-2 py-1 rounded-full bg-stone-100 text-sm">
            {t}
            <button className="ml-2 text-stone-500" onClick={() => onRemove(i)}>
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function QuestLogger({ onComplete, label }: { onComplete: (log: string) => void; label: string }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-2">
      <textarea
        className="input w-full min-h-[88px]"
        placeholder="What did you try? What changed? What surprised you?"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="btn btn-primary mt-2"
        onClick={() => {
          if (text.trim()) onComplete(text.trim());
          setText("");
        }}
      >
        {label}
      </button>
    </div>
  );
}

function ConstellationView({
  data,
}: {
  data: { nodes: Array<{ id: string; label: string; group: string }>; edges: Array<{ a: string; b: string; w: number }> };
}) {
  // Simple force layout-ish positions (deterministic)
  const width = 900;
  const height = 420;
  const centerX = width / 2;
  const centerY = height / 2;

  const groups = Array.from(new Set(data.nodes.map((n) => n.group)));
  const radiusByGroup: Record<string, number> = {};
  groups.forEach((g, i) => {
    radiusByGroup[g] = 80 + i * 70;
  });

  const positioned = data.nodes.map((n, i) => {
    const angle = (i / data.nodes.length) * Math.PI * 2;
    const r = radiusByGroup[n.group] ?? 120;
    const x = centerX + Math.cos(angle) * r + jitter(i, 14);
    const y = centerY + Math.sin(angle) * r + jitter(i + 99, 14);
    return { ...n, x, y };
  });

  const nodeById: Record<string, any> = Object.fromEntries(positioned.map((p) => [p.id, p]));

  return (
    <div className="w-full overflow-auto">
      <svg width={width} height={height} className="rounded-2xl ring-1 ring-black/10 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.9),rgba(230,230,255,0.6))]">
        {data.edges.map((e, i) => {
          const a = nodeById[e.a];
          const b = nodeById[e.b];
          const stroke = `rgba(99,102,241,${0.2 + e.w * 0.6})`;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={1 + e.w * 2} />;
        })}
        {positioned.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={11} fill={colorForGroup(n.group)} />
            <text x={n.x + 14} y={n.y + 4} fontSize={12} fill="#111827">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="text-xs text-stone-600 mt-2">Edges indicate energetic connections; thickness shows strength. Groups: Self, Ego, Strengths, Shadows, Practices.</div>
    </div>
  );
}

function ShareComposer({
  onShare,
  persona,
}: {
  onShare: (title: string, content: string) => void;
  persona: Persona;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  return (
    <div className="p-4 rounded-2xl ring-1 ring-black/5 bg-white">
      <h3 className="font-medium">Anonymous Sharing Circle</h3>
      <div className="grid md:grid-cols-2 gap-3 mt-2">
        <input
          className="input"
          placeholder="Breakthrough title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="input"
          placeholder="Optional tag, e.g., ‘mask-making’, ‘shadow dialogue’"
          onChange={() => {}}
        />
      </div>
      <textarea
        className="input w-full min-h-[100px] mt-2"
        placeholder="Describe the ritual, the felt shift, or the wisdom your alter ego gave you."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <button
          className="btn btn-primary"
          onClick={() => {
            if (title.trim() && content.trim()) onShare(title.trim(), content.trim());
            setTitle("");
            setContent("");
          }}
        >
          Share Anonymously
        </button>
        <span className="text-xs text-stone-600">
          You’ll appear as {persona.symbol} {persona.name || "Anonymous Ego"}.
        </span>
      </div>
    </div>
  );
}

function DuelStarter({ onStart }: { onStart: (topic: string) => void }) {
  const [topic, setTopic] = useState("");
  return (
    <div>
      <div className="text-sm text-stone-700">Pick a prompt for improv debate:</div>
      <input
        className="input w-full mt-2"
        placeholder="e.g., Should I take the leap? Ask for the raise? Start the project?"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />
      <button className="btn btn-primary mt-2" onClick={() => topic.trim() && onStart(topic.trim())}>
        Start Duel
      </button>
    </div>
  );
}

function DuelStage({
  duel,
  onEnd,
}: {
  duel: { left: Persona; right: Persona; topic: string };
  onEnd: () => void;
}) {
  const [leftLines, setLeftLines] = useState<string[]>([]);
  const [rightLines, setRightLines] = useState<string[]>([]);
  const [round, setRound] = useState(1);

  const volley = () => {
    const L = personaReply(duel.topic + " " + round, duel.left);
    const R = personaReply(duel.topic + " " + round, duel.right);
    setLeftLines((x) => [...x, L]);
    setRightLines((x) => [...x, R]);
    setRound((r) => r + 1);
  };

  return (
    <div>
      <div className="text-sm text-stone-700">Topic: {duel.topic}</div>
      <div className="grid md:grid-cols-2 gap-3 mt-2">
        <div className="p-3 border rounded-xl">
          <div className="font-medium">{duel.left.symbol} {duel.left.name}</div>
          <div className="mt-2 text-sm space-y-2">
            {leftLines.map((l, i) => (
              <div key={i} className="p-2 bg-stone-50 rounded">{l}</div>
            ))}
          </div>
        </div>
        <div className="p-3 border rounded-xl">
          <div className="font-medium">{duel.right.symbol} {duel.right.name}</div>
          <div className="mt-2 text-sm space-y-2">
            {rightLines.map((l, i) => (
              <div key={i} className="p-2 bg-stone-50 rounded">{l}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button className="btn" onClick={volley}>Next Volley</button>
        <button className="btn btn-ghost" onClick={onEnd}>End Duel</button>
      </div>
    </div>
  );
}

/* ---------- Data + Helpers ---------- */

const ARCHETYPES: Archetype[] = [
  "Warrior",
  "Sage",
  "Visionary",
  "Trickster",
  "Muse",
  "Healer",
  "Ruler",
  "Explorer",
  "Lover",
  "Magician",
  "Everyperson",
  "Creator",
  "Shadow",
];

function deriveName(m: { vision: string; fearlessness: string; entrance: string }) {
  const words = (m.vision + " " + m.fearlessness + " " + m.entrance)
    .split(/\W+/)
    .filter(Boolean);
  const seeds = ["Radiant", "Shadow", "Oracle", "Fox", "Lion", "Nova", "Echo", "Vesper", "Sable", "Quartz", "Zephyr"];
  const tail = ["One", "Warden", "Scribe", "Walker", "Caller", "Weaver", "Seer", "Bearer"];
  const s1 = words[0]?.slice(0, 1)?.toUpperCase() || seeds[Math.floor(Math.random() * seeds.length)];
  const s2 = seeds[(words.length + 3) % seeds.length];
  const t = tail[(words.length + 5) % tail.length];
  return `${s1}${s2} ${t}`;
}
function deriveTraits(m: { vision: string; fearlessness: string; entrance: string }) {
  const src = (m.vision + " " + m.fearlessness + " " + m.entrance).toLowerCase();
  const pool = ["decisive", "playful", "forgiving", "bold", "curious", "precise", "mysterious", "generous", "relentless", "serene"];
  return pool.filter((_, i) => (src.length + i) % 3 === 0).slice(0, 4);
}
function deriveVoice(m: { vision: string; fearlessness: string; entrance: string }) {
  const tones = ["calm", "sly", "poetic", "commanding", "tender", "lucid", "grounded", "mischievous"];
  return `${tones[(m.entrance.length + m.vision.length) % tones.length]}, ${tones[(m.fearlessness.length + 2) % tones.length]}`;
}

function uniqPush(arr: string[], v: string) {
  if (!v) return arr;
  if (arr.includes(v)) return arr;
  return [...arr, v];
}
function removeIndex<T>(arr: T[], idx: number): T[] {
  return arr.filter((_, i) => i !== idx);
}
function jitter(seed: number, amp: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * amp * (Math.random() > 0.5 ? 1 : -1);
}
function colorForGroup(g: string) {
  switch (g) {
    case "Self":
      return "#10B981";
    case "Ego":
      return "#6366F1";
    case "Strengths":
      return "#F59E0B";
    case "Shadows":
      return "#EF4444";
    case "Practices":
      return "#0EA5E9";
    default:
      return "#6B7280";
  }
}

function generateQuests(): Quest[] {
  return [
    {
      id: uid(),
      title: "Speak as the Visionary Self",
      archetype: "Visionary",
      instructions:
        "For one day, make one decision ‘as-if’ your bold future is already true. Log the moment and the felt shift.",
      status: "locked",
      logs: [],
    },
    {
      id: uid(),
      title: "Warrior Boundary",
      archetype: "Warrior",
      instructions:
        "Decline one misaligned request with clarity and kindness. Note the body sensation before and after.",
      status: "locked",
      logs: [],
    },
    {
      id: uid(),
      title: "Trickster Rule-Bend",
      archetype: "Trickster",
      instructions:
        "Break a tiny rule (harmless) to open creative flow. Log the surprise it created.",
      status: "locked",
      logs: [],
    },
    {
      id: uid(),
      title: "Healer’s Rest",
      archetype: "Healer",
      instructions:
        "Schedule 20 minutes of intentional rest. Describe what softened, and what returned.",
      status: "locked",
      logs: [],
    },
  ];
}

function generateQuestFeedback(q: Quest, p: Persona): string {
  // Reflective feedback flavored by persona archetype
  const lead = personaReply(q.logs.join("\n").slice(-140), p);
  return `${lead}\nYour ${q.archetype} quest strengthens your ${p.strengths[0] || "core"} and reveals a pattern in your ${p.shadows || "shadow"}.`;
}

function defaultScenarios(): Scenario[] {
  return [
    {
      id: uid(),
      title: "High-Stakes Conversation",
      prompt: "As your alter ego, script the first 4 sentences you’ll say in a tough conversation.",
      rehearsal: "",
      integration: "",
    },
    {
      id: uid(),
      title: "Big-Creative Leap",
      prompt: "You have 72 hours to ship a messy first version. What’s the minimum bold step?",
      rehearsal: "",
      integration: "",
    },
    {
      id: uid(),
      title: "Saying No With Grace",
      prompt: "Decline something misaligned. Draft the boundary message in your ego’s voice.",
      rehearsal: "",
      integration: "",
    },
  ];
}

function buildConstellation(
  p: Persona,
  quests: Quest[],
  diary: DiaryEntry[]
): {
  nodes: Array<{ id: string; label: string; group: string }>;
  edges: Array<{ a: string; b: string; w: number }>;
} {
  const nodes = [
    { id: "self", label: "You", group: "Self" },
    { id: "ego", label: p.name || "Alter Ego", group: "Ego" },
    ...p.strengths.map((s, i) => ({ id: `str${i}`, label: s, group: "Strengths" })),
    ...p.shadows.map((s, i) => ({ id: `sh${i}`, label: s, group: "Shadows" })),
    ...quests
      .filter((q) => q.status !== "locked")
      .map((q, i) => ({ id: `pr${i}`, label: q.title.split(" ").slice(0, 2).join(" "), group: "Practices" })),
  ];

  // Edge weights from activity
  const talkIntensity = Math.min(1, diary.length / 12);
  const questIntensity = Math.min(1, quests.filter((q) => q.status === "completed").length / 4);

  const edges: Array<{ a: string; b: string; w: number }> = [
    { a: "self", b: "ego", w: 0.4 + 0.6 * talkIntensity },
    ...p.strengths.map((_, i) => ({ a: "ego", b: `str${i}`, w: 0.5 })),
    ...p.shadows.map((_, i) => ({ a: "ego", b: `sh${i}`, w: 0.35 })),
    ...quests
      .filter((q) => q.status !== "locked")
      .map((_, i) => ({ a: "ego", b: `pr${i}`, w: 0.3 + 0.4 * questIntensity })),
  ];

  return { nodes, edges };
}
