"use client";

import Link from "next/link";

/* -------------------------------- Data -------------------------------- */

type Tile = {
  href: string;
  title: string;
  blurb: string;
  tag: string;
  emoji: string;
  kpi?: string;
  tone: "sky" | "emerald" | "amber" | "rose" | "violet";
};

const tiles: Tile[] = [
  { href: "/onboarding", title: "Vals ", blurb: "Surface what truly matters—then let it steer your week.", tag: "clarity", emoji: "🎴", kpi: "2 min", tone: "emerald" },
  { href: "/journal", title: "canvas", blurb: "Bookend your day with light prompts and photo/voice capture.", tag: "reflection", emoji: "📝", kpi: "daily", tone: "violet" },
  { href: "/awe-routes", title: "Awe Routes", blurb: "Micro-adventures with gentle attention cues out in the world.", tag: "wonder", emoji: "🗺️", kpi: "outdoors", tone: "sky" },
  { href: "/bonds", title: "Bonds", blurb: "Practice calm repair, then bring it into real conversations.", tag: "connection", emoji: "🤝", kpi: "together", tone: "rose" },
  { href: "/weekly-review", title: "Weekly Review", blurb: "A quick pulse on aliveness, connection, and wonder—no score shame.", tag: "progress", emoji: "📈", kpi: "5 min", tone: "sky" },
  { href: "/algorithmic-archaeology", title: "Algo-arch", blurb: "Mine your own data—on device—for honest patterns.", tag: "insight", emoji: "🧪", kpi: "local", tone: "violet" },
  { href: "/kinesphere", title: "Kinmao", blurb: "Trace micro-movements, gestures, and anchors in space.", tag: "embodiment", emoji: "🌀", kpi: "3 min", tone: "emerald" },
  { href: "/persona", title: "Persona", blurb: "Act without identity. See which motive shows up.", tag: "behavior", emoji: "🎭", kpi: "log", tone: "sky" },
  { href: "/alter-egos", title: "Algo", blurb: "Three lenses, one dilemma. Find the synthesis.", tag: "thinking", emoji: "🧠", kpi: "3×60s", tone: "rose" },

];

/* ------------------------------ Component ------------------------------ */

export default function HomePage() {
  return (
    <div className="relative">
      {/* Ambient background */}
      <Backdrop />

      <div className="relative mx-auto max-w-7xl px-4 py-8 md:py-14 lg:py-16">
        {/* HERO */}
        <section
          className="glass-card rounded-3xl p-6 md:p-10 overflow-hidden animate-in fade-in slide-in-from-bottom-2"
          aria-labelledby="hero-title"
        >
          {/* soft internal glows */}
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,theme(colors.sky.200/.75),transparent)] blur-2xl" />
          <div aria-hidden className="pointer-events-none absolute -left-24 -bottom-24 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,theme(colors.emerald.200/.7),transparent)] blur-2xl" />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="max-w-2xl">
              
              <h1 id="hero-title" className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight">
                fuy — <span className="text-stone-600">find yourself</span>
              </h1>

              <p className="mt-4 text-stone-700/90 text-base md:text-lg">
                Tiny, evidence-based actions that compound into clearer days, deeper bonds, and more ease.
                Designed to be gentle, playful, and private-by-default.
              </p>

             

              {/* Feature chips */}
              <div className="mt-6 flex flex-wrap gap-2 text-sm">
                <Chip label="values" tone="emerald" />
                <Chip label="awe" tone="sky" />
                <Chip label="joy" tone="amber" />
                <Chip label="repair" tone="rose" />
                <Chip label="progress" tone="stone" />
              </div>
            </div>

            {/* Animated calm card */}
            <HeroPreview />
          </div>

          {/* trust / micro highlights (now toned) */}
          <HeroHighlights />
        </section>

        {/* “How it works” — compact, informative with subtle color accents */}
        <HowItWorks />

        {/* QUICK LINKS grid with toned feature cards */}
        <section className="mt-10 md:mt-12">
          <SectionHeader kicker="start anywhere" title="Tools that fit your day" subtitle="Each starts in under two minutes. The app learns what helps you." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {tiles.map((t, i) => (
              <FeatureCard key={t.href} tile={t} index={i} />
            ))}
          </div>
        </section>

        {/* What you’ll find — more information */}
        <WhatYoullFind />

        {/* Social & safety section (with gentle tint panels) */}
        <SocialAndSafety />

        {/* FAQ (minimal, 3 Qs) */}
        <FAQ />

        {/* Footer CTA */}
        <section className="mt-12 md:mt-16">
          <div className="rounded-3xl ring-1 ring-black/5 bg-white/70 backdrop-blur p-6 md:p-10 relative overflow-hidden">
            <div aria-hidden className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,theme(colors.amber.200/.7),transparent)] blur-3xl" />
            <h3 className="text-2xl font-semibold tracking-tight">Ready when you are</h3>
            <p className="mt-3 text-stone-700/90 max-w-2xl">
               Step in, do a tiny thing, and step out. That’s how compounding calm happens.
            </p>
         
          </div>
        </section>
      </div>

      {/* Scoped styles for animations & glass (fallback; safe to keep) */}
      <StyleBlock />
    </div>
  );
}

/* -------------------------------- sections -------------------------------- */

function Kicker({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-stone-500 bg-white/70 ring-1 ring-black/5 rounded-full px-2 py-1">
      <span className="block h-1.5 w-1.5 rounded-full bg-stone-400" />
      {children}
    </span>
  );
}

function SectionHeader({ kicker, title, subtitle }:{
  kicker: string; title: string; subtitle?: string;
}) {
  return (
    <div className="mb-4 md:mb-6 px-1">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-2 text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="text-stone-600 text-sm md:text-base">{subtitle}</p>}
    </div>
  );
}

/* ----- HERO HIGHLIGHTS (tinted) ----- */
function HeroHighlights() {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-3">
 
    </div>
  );
}

function MiniTile({ title, text, tone }:{
  title: string; text: string; tone: "sky"|"emerald"|"amber";
}) {
  return (
    <div className={`mini-tile tone-${tone}`}>
      <div className="mini-bar" aria-hidden />
      <div className="mini-dot" />
      <div>
        <div className="mini-title">{title}</div>
        <div className="mini-body">{text}</div>
      </div>
    </div>
  );
}

/* ----- HOW IT WORKS (tinted steps) ----- */
function HowItWorks() {
  return (
    <section className="mt-8 md:mt-12">
      <div className="glass-row rounded-3xl p-5 md:p-7">
        <div className="grid md:grid-cols-3 gap-5">
          <Step n={1} tone="emerald" title="Tiny wins" text="Pick one small action—gratitude, ITP plan, or a 25-min focus sprint. We reward starts, not streaks." />
          <Step n={2} tone="sky"     title="Gentle reflection" text="Log the feeling or outcome. The app connects dots: people, places, and practices that help." />
          <Step n={3} tone="amber"   title="Share the good" text="Friends & groups amplify positives. Post publicly, to friends, or keep it private." />
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, text, tone }:{
  n: number; title: string; text: string; tone: "sky"|"emerald"|"amber";
}) {
  return (
    <div className={`group relative rounded-2xl ring-1 ring-tint bg-white/65 backdrop-blur p-4 md:p-5 overflow-hidden tone-${tone} tone-surface`}>
      <div aria-hidden className="tone-spot absolute -right-8 -top-8 h-20 w-20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 grid place-items-center rounded-2xl bg-white/80 ring-1 ring-black/5 font-semibold">
          {n}
        </div>
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <p className="mt-1 text-sm text-stone-600">{text}</p>
        </div>
      </div>
    </div>
  );
}

/* ----- INFO SECTIONS ----- */
function WhatYoullFind() {
  return (
    <section className="mt-10 md:mt-12">
      <SectionHeader kicker="more than a mood app" title="What you’ll find inside" />
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        <InfoCard tone="sky"     title="Focus & Flow" points={["Pomodoro with rhythm-aware breaks (no nagging).","Ambient focus visuals that stay out of your way.","Progress pulses instead of streaks."]} />
        <InfoCard tone="emerald" title="Grounding & Calm" points={["Interactive Stress Map with targeted micro-releases.","Switchboard mini-games that disrupt rumination.","Calm Builder: grow a scene you can return to."]} />
        <InfoCard tone="amber"   title="Meaning & Connection" points={["Values card-sort to steer your week.","Bond Blueprints for softer repairs.","Groups & friends that amplify good news."]} />
      </div>
    </section>
  );
}

function InfoCard({ title, points, tone }:{
  title: string; points: string[]; tone: "sky"|"emerald"|"amber";
}) {
  return (
    <div className={`feature-info rounded-3xl p-5 ring-1 ring-black/5 tone-${tone}`}>
      <h3 className="font-medium tracking-tight">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm text-stone-700/90">
        {points.map((p, i) => <li key={i}>• {p}</li>)}
      </ul>
    </div>
  );
}

/* ----- SOCIAL / SAFETY ----- */
function SocialAndSafety() {
  return (
    <section className="mt-10 md:mt-14 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      {/* Social layer preview */}
      <div className="rounded-3xl ring-1 ring-black/5 bg-white/70 backdrop-blur p-6 relative overflow-hidden tone-sky">
        <div aria-hidden className="tone-veil absolute -left-20 -bottom-16 h-64 w-64 rounded-full blur-3xl" />
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight">A gentle social layer</h3>
        <p className="mt-2 text-stone-700/90">
          Invite a few friends, or join a small group. Share little wins, not hot takes.
          Rankings are playful, weighted to recent posts so it stays kind.
        </p>
        <div className="mt-5 grid sm:grid-cols-3 gap-3">
          <SocialChip label="Friends feed" />
          <SocialChip label="Tiny groups" />
          <SocialChip label="Kind rankings" />
        </div>
      
      </div>

      {/* Safety & ethos */}
      <div className="rounded-3xl ring-1 ring-black/5 bg-white/70 backdrop-blur p-6 relative overflow-hidden tone-emerald">
        <div aria-hidden className="tone-veil absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl" />
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight">Safe by design</h3>
        <ul className="mt-3 space-y-2 text-stone-700/90 text-sm">
          <li>• Private by default. Visibility per post: Public / Friends / Private.</li>
          
          <li>• One-tap export (PDF + JSON). Your data is yours.</li>
          <li>• No perfection pressure. Humans first, metrics last.</li>
        </ul>
        
      </div>
    </section>
  );
}

/* ----- FAQ ----- */
function FAQ() {
  return (
    <section className="mt-10 md:mt-14">
      <SectionHeader kicker="quick answers" title="FAQ" />
      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        <FAQItem q="Is my data private?" a="Yes. Everything is private by default; you choose per-post visibility. You can export all data anytime (PDF + JSON)." />
        <FAQItem q="What if I miss days?" a="Nothing breaks. We reward starts, not streaks. Tiny actions compound over time." />
        <FAQItem q="Will this feel like work?" a="No. Sessions are playful and light: mini-games, maps, and short reflections that teach you what actually helps." />
      </div>
    </section>
  );
}

function FAQItem({ q, a }:{ q: string; a: string }) {
  return (
    <div className="rounded-3xl ring-1 ring-black/5 bg-white/75 backdrop-blur p-5">
      <div className="font-medium">{q}</div>
      <p className="mt-1 text-sm text-stone-700/90">{a}</p>
    </div>
  );
}

function SocialChip({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/70 ring-1 ring-black/5 px-3 py-2">
      <span className="block h-2 w-2 rounded-full bg-stone-400" />
      <span className="text-sm text-stone-700">{label}</span>
    </div>
  );
}

/* ------------------------------- UI bits ------------------------------- */

function Chip({ label, tone }: { label: string; tone: "emerald" | "sky" | "amber" | "rose" | "stone" }) {
  const toneMap: Record<typeof tone, string> = {
    emerald: "bg-emerald-100 text-emerald-900 border-emerald-200",
    sky: "bg-sky-100 text-sky-900 border-sky-200",
    amber: "bg-amber-100 text-amber-900 border-amber-200",
    rose: "bg-rose-100 text-rose-900 border-rose-200",
    stone: "bg-stone-100 text-stone-900 border-stone-200",
  } as any;
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 ${toneMap[tone]} shadow-[inset_0_1px_0_0_rgba(255,255,255,.6)]`}>
      {label}
    </span>
  );
}

function HeroPreview() {
  // Deterministic, hydration-safe animated SVG
  return (
    <div className="relative isolate shrink-0 w-full md:w-[460px] aspect-[4/3] rounded-3xl overflow-hidden ring-1 ring-black/5 bg-white/60 backdrop-blur hero-shadow">
      {/* gradient wash */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-sky-50 via-emerald-50 to-amber-50" />
      {/* glass shine */}
      <div aria-hidden className="absolute inset-x-0 -top-16 h-20 bg-white/40 blur-2xl" />
      {/* waves */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 450" preserveAspectRatio="none" role="img" aria-label="Calm animated waves">
        <path d="M0,260 C90,220 150,300 240,260 C330,220 390,300 480,260 C540,235 570,240 600,230 L600,450 L0,450 Z"
              fill="url(#g1)" className="animate-wave-slow" />
        <path d="M0,280 C90,240 150,320 240,280 C330,240 390,320 480,280 C540,255 570,260 600,250 L600,450 L0,450 Z"
              fill="url(#g2)" className="animate-wave-fast opacity-70" />
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#bbf7d0" />
          </linearGradient>
          <linearGradient id="g2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
        </defs>
      </svg>

      {/* corner caption */}
      <div className="absolute bottom-3 right-3 text-[11px] text-stone-600 bg-white/70 rounded-full px-2 py-1 ring-1 ring-black/5">
        ambient focus
      </div>
    </div>
  );
}

function FeatureCard({ tile, index }: { tile: Tile; index: number }) {
  return (
    <Link
      href={tile.href}
      className={`group feature-card rounded-3xl p-5 md:p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 tone-${tile.tone}`}
      style={{ animationDelay: `${70 * index}ms` }}
      aria-label={`${tile.title} — ${tile.blurb}`}
    >
      {/* colored shimmer bar */}
      <div aria-hidden className="tone-bar absolute left-0 top-0 h-1 w-full" />
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 grid place-items-center rounded-2xl bg-white/70 ring-1 ring-black/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,.7)]">
          <span aria-hidden className="text-lg">{tile.emoji}</span>
        </div>
        <div className="min-w-0">
          <h3 className="font-medium tracking-tight text-[17px]">{tile.title}</h3>
          <p className="mt-1 text-sm text-stone-600 line-clamp-2">{tile.blurb}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-[11px] text-stone-700 ring-1 ring-black/5">
              <span className="block h-1.5 w-1.5 rounded-full bg-stone-400 group-hover:bg-stone-600 transition-colors" />
              {tile.tag}
            </span>
            {tile.kpi && (
              <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-1 text-[11px] text-stone-700 ring-1 ring-black/5">
                {tile.kpi}
              </span>
            )}
          </div>
        </div>
      </div>
      {/* subtle hover bloom */}
      <div aria-hidden className="pointer-events-none absolute -right-8 -bottom-8 h-24 w-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 tone-bloom blur-xl" />
    </Link>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="bg-orbs fixed inset-0 -z-10">
      {/* soft gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-50 via-white to-stone-50" />
      {/* floating orbs (respect reduced motion) */}
      <div className="pointer-events-none absolute -top-16 -left-10 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,theme(colors.sky.100/.8),transparent)] blur-3xl motion-safe:animate-orb-1" />
      <div className="pointer-events-none absolute -bottom-16 -right-10 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,theme(colors.emerald.100/.8),transparent)] blur-3xl motion-safe:animate-orb-2" />
    </div>
  );
}

/* ------------------------------ Style block ----------------------------- */
/* (ok to keep; if you copied the globals below you already have these) */
function StyleBlock() {
  return (
    <style jsx global>{`
      .glass-card {
        background: radial-gradient(120% 140% at 10% 10%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.72) 40%, rgba(255,255,255,0.62) 100%);
        border: 1px solid rgba(0,0,0,.06);
        box-shadow: 0 10px 30px rgba(0,0,0,.05), inset 0 1px 0 rgba(255,255,255,.5);
      }
      .glass-row {
        background: linear-gradient(180deg, rgba(255,255,255,.82), rgba(255,255,255,.7));
        border: 1px solid rgba(0,0,0,.06);
        box-shadow: 0 10px 24px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,.6);
      }
      .feature-card {
        position: relative;
        background: linear-gradient(180deg, rgba(255,255,255,.88), rgba(255,255,255,.78));
        border: 1px solid rgba(0,0,0,.06);
        box-shadow: 0 10px 24px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,.6);
        transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        animation: fadeUp .55s ease both;
      }
      .feature-card:hover { transform: translateY(-2px); box-shadow: 0 16px 32px rgba(0,0,0,.09); border-color: rgba(0,0,0,.1); }

      @keyframes orb1 { 0%{transform:translate3d(0,0,0)} 50%{transform:translate3d(12px,10px,0)} 100%{transform:translate3d(0,0,0)} }
      @keyframes orb2 { 0%{transform:translate3d(0,0,0)} 50%{transform:translate3d(-12px,-10px,0)} 100%{transform:translate3d(0,0,0)} }
      .animate-orb-1 { animation: orb1 14s ease-in-out infinite; }
      .animate-orb-2 { animation: orb2 16s ease-in-out infinite; }

      @keyframes waveSlow { 0% { transform: translateY(0) } 50% { transform: translateY(6px) } 100% { transform: translateY(0) } }
      @keyframes waveFast { 0% { transform: translateY(0) } 50% { transform: translateY(-6px) } 100% { transform: translateY(0) } }
      .animate-wave-slow { animation: waveSlow 6s ease-in-out infinite; }
      .animate-wave-fast { animation: waveFast 8s ease-in-out infinite; }

      @keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }

      /* tone system (subtle tints) */
      .tone-sky    { --tint: 186 230 253; --line: 14 165 233; }
      .tone-emerald{ --tint: 209 250 229; --line: 16 185 129; }
      .tone-amber  { --tint: 254 243 199; --line: 217 119 6; }
      .tone-rose   { --tint: 254 226 226; --line: 225 29 72; }
      .tone-violet { --tint: 237 233 254; --line: 139 92 246; }

      .tone-bar   { background: linear-gradient(90deg, rgba(var(--line)/.35), rgba(var(--line)/.15)); }
      .tone-bloom { background: radial-gradient(closest-side, rgba(var(--tint)/.8), transparent); }
      .tone-spot  { background: radial-gradient(closest-side, rgba(var(--tint)/.9), transparent); }
      .tone-veil  { background: radial-gradient(closest-side, rgba(var(--tint)/.85), transparent); }
      .tone-surface { background: linear-gradient(180deg, rgba(var(--tint)/.18), rgba(255,255,255,.75)); }
      .ring-tint { border-color: rgba(var(--line)/.25) !important; }

      /* mini tiles tint */
      .mini-tile { display:flex; gap:.6rem; align-items:flex-start; padding:.9rem; border-radius:1.25rem; background: rgba(255,255,255,.75); border:1px solid rgba(0,0,0,.06); backdrop-filter: blur(4px); position:relative; overflow:hidden; }
      .mini-dot  { width:.6rem; height:.6rem; border-radius:9999px; background:#c1c1c1; margin-top:.35rem; }
      .mini-title{ font-weight:600; font-size:.95rem; }
      .mini-body { color: rgb(87 83 78 / .9); font-size:.85rem; }
      .mini-bar  { position:absolute; top:0; left:0; right:0; height:2px; opacity:.9; }

      .tone-emerald .mini-bar { background: linear-gradient(90deg, rgba(var(--line)/.35), rgba(var(--line)/.1)); }
      .tone-sky .mini-bar     { background: linear-gradient(90deg, rgba(var(--line)/.35), rgba(var(--line)/.1)); }
      .tone-amber .mini-bar   { background: linear-gradient(90deg, rgba(var(--line)/.35), rgba(var(--line)/.1)); }

      .tone-emerald.mini-tile { border-color: rgba(var(--line)/.22); background: linear-gradient(180deg, rgba(var(--tint)/.26), rgba(255,255,255,.78)); }
      .tone-sky.mini-tile     { border-color: rgba(var(--line)/.22); background: linear-gradient(180deg, rgba(var(--tint)/.26), rgba(255,255,255,.78)); }
      .tone-amber.mini-tile   { border-color: rgba(var(--line)/.22); background: linear-gradient(180deg, rgba(var(--tint)/.26), rgba(255,255,255,.78)); }

      .tone-emerald .mini-dot { background: rgb(var(--line)); }
      .tone-sky .mini-dot     { background: rgb(var(--line)); }
      .tone-amber .mini-dot   { background: rgb(var(--line)); }

      /* feature-info keeps a soft tint */
      .feature-info { background: linear-gradient(180deg, rgba(var(--tint)/.30), rgba(255,255,255,.75)); }
    `}</style>
  );
}
