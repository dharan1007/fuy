// src/app/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Waves from "@/components/Waves";
import HomePageLayout from "@/components/HomePageLayout";

/**
 * Temporary type-escape for Next Link to work around duplicate @types/react
 * issues that cause TS to complain "Link cannot be used as a JSX component".
 * Remove this alias once duplicate-type issues are resolved and use `Link` directly.
 */
const NextLink: any = Link;

/* ---------------- DecryptedText (unchanged behaviour) ---------------- */
const styles: { wrapper: React.CSSProperties; srOnly: React.CSSProperties } = {
  wrapper: { display: "inline-block", whiteSpace: "pre-wrap" },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0,0,0,0)" as any,
    border: 0,
  },
};

function DecryptedText({
  text,
  speed = 120,
  maxIterations = 30,
  sequential = false,
  revealDirection = "start",
  useOriginalCharsOnly = false,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+",
  className = "",
  parentClassName = "",
  encryptedClassName = "decrypted-encrypted",
  animateOn = "view",
  ...props
}: {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: "start" | "end" | "center";
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: "hover" | "view" | "both";
  [k: string]: any;
}) {
  const [displayText, setDisplayText] = React.useState(text);
  const [isHovering, setIsHovering] = React.useState(false);
  const [isScrambling, setIsScrambling] = React.useState(false);
  const [revealedIndices] = React.useState<Set<number>>(new Set());
  const [hasAnimated, setHasAnimated] = React.useState(false);
  const containerRef = React.useRef<HTMLSpanElement | null>(null);

  React.useEffect(() => {
    let interval: number | undefined;
    let currentIteration = 0;

    const availableChars = useOriginalCharsOnly
      ? Array.from(new Set(text.split(""))).filter((c) => c !== " ")
      : characters.split("");

    const shuffleText = (originalText: string, currentRevealed: Set<number>) => {
      if (useOriginalCharsOnly) {
        const positions = originalText.split("").map((char, i) => ({
          char,
          isSpace: char === " ",
          index: i,
          isRevealed: currentRevealed.has(i),
        }));
        const nonSpaceChars = positions.filter((p) => !p.isSpace && !p.isRevealed).map((p) => p.char);
        for (let i = nonSpaceChars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [nonSpaceChars[i], nonSpaceChars[j]] = [nonSpaceChars[j], nonSpaceChars[i]];
        }
        let charIndex = 0;
        return positions
          .map((p) => {
            if (p.isSpace) return " ";
            if (p.isRevealed) return originalText[p.index];
            return nonSpaceChars[charIndex++];
          })
          .join("");
      } else {
        return originalText
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            if (currentRevealed.has(i)) return originalText[i];
            return availableChars[Math.floor(Math.random() * availableChars.length)];
          })
          .join("");
      }
    };

    if (isHovering) {
      setIsScrambling(true);
      interval = window.setInterval(() => {
        setDisplayText((prev) => {
          currentIteration++;
          if (currentIteration >= maxIterations && interval) {
            window.clearInterval(interval);
            setIsScrambling(false);
            return text;
          }
          return shuffleText(text, revealedIndices);
        });
      }, speed);
    } else {
      setDisplayText(text);
      setIsScrambling(false);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isHovering, text, speed, maxIterations, sequential, revealDirection, characters, useOriginalCharsOnly, revealedIndices]);

  React.useEffect(() => {
    if (animateOn !== "view" && animateOn !== "both") return;

    // Check if animation has already been shown in this session
    const hasShownAnimation = sessionStorage.getItem('decryption-animated');
    if (hasShownAnimation) {
      setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setIsHovering(true);
            setHasAnimated(true);
            sessionStorage.setItem('decryption-animated', 'true');
          }
        });
      },
      { threshold: 0.12 }
    );
    const cur = containerRef.current;
    if (cur) observer.observe(cur);
    return () => {
      if (cur) observer.unobserve(cur);
    };
  }, [animateOn, hasAnimated]);

  const hoverProps = animateOn === "hover" || animateOn === "both"
    ? { onMouseEnter: () => setIsHovering(true), onMouseLeave: () => setIsHovering(false) }
    : {};

  return (
    <span className={parentClassName} ref={containerRef} style={styles.wrapper} {...hoverProps} {...props}>
      <span style={styles.srOnly}>{displayText}</span>
      <span aria-hidden="true">
        {displayText.split("").map((char, index) => {
          const isRevealedOrDone = !isScrambling || !isHovering;
          return (
            <span key={index} className={isRevealedOrDone ? className : encryptedClassName}>
              {char}
            </span>
          );
        })}
      </span>
    </span>
  );
}

/* ---------------- Data + small UI pieces ---------------- */
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
  { href: "/journal", title: "canvas", blurb: "Bookend your day with light prompts and photo/voice capture.", tag: "reflection", emoji: "📝", kpi: "daily", tone: "violet" },
  { href: "/awe-routes", title: "Hopln", blurb: "Plan routes & travel with friends — pin spots, add notes, share & invite.", tag: "wonder", emoji: "🗺️", kpi: "outdoors", tone: "sky" },
  { href: "/bonds", title: "Knot", blurb: "Practice calm repair, then bring it into real conversations.", tag: "connection", emoji: "🤝", kpi: "together", tone: "rose" },
  { href: "/onboarding", title: "Essenz", blurb: "Surface what truly matters—then let it steer your week.", tag: "clarity", emoji: "🎴", kpi: "2 min", tone: "emerald" },
  { href: "/algorithmic-archaeology", title: "Axiz", blurb: "Mine your own data—on device—for honest patterns.", tag: "insight", emoji: "🧪", kpi: "local", tone: "violet" },
  { href: "/alter-egos", title: "Parall", blurb: "Create and explore alternate selves — try on new perspectives.", tag: "thinking", emoji: "🧠", kpi: "3×60s", tone: "rose" },
];

function Chip({ labelElement, tone }: { labelElement?: React.ReactNode; tone: "emerald" | "sky" | "amber" | "rose" | "stone" }) {
  const toneMap: Record<typeof tone, string> = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    stone: "bg-stone-50 text-stone-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 ${toneMap[tone]} shadow-sm`} style={{ borderColor: "rgba(15, 23, 42, 0.06)" }}>
      {labelElement}
    </span>
  );
}

function InfoCard({ titleElement, pointsElements, tone }: { titleElement: React.ReactNode; pointsElements: React.ReactNode[]; tone: string }) {
  return (
    <div
      className={`feature-info rounded-3xl p-6 shadow-[0_6px_30px_rgba(15,23,42,0.06)] tone-${tone}`}
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,250,252,0.98) 100%)",
        border: "1px solid rgba(15,23,42,0.04)",
        color: "#0f172a",
        backdropFilter: "blur(6px)",
      }}
    >
      <h3 className="font-semibold text-lg" style={{ color: "#0f172a" }}>{titleElement}</h3>
      <ul className="mt-3 space-y-2 text-sm" style={{ color: "rgba(15,23,42,0.7)" }}>
        {pointsElements.map((p, i) => <li key={i}>• {p}</li>)}
      </ul>
    </div>
  );
}

function SocialChip({ labelElement }: { labelElement: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: "rgba(255,255,255,0.95)", color: "rgba(15,23,42,0.95)", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
      <span className="block h-2 w-2 rounded-full" style={{ background: "#8AA8FF" }} />
      <span className="text-sm">{labelElement}</span>
    </div>
  );
}

function FAQItem({ qElement, aElement }: { qElement: React.ReactNode; aElement: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.98)", color: "#0f172a", boxShadow: "0 6px 20px rgba(15,23,42,0.04)" }}>
      <div className="font-medium" style={{ color: "#0f172a" }}>{qElement}</div>
      <p className="mt-1 text-sm" style={{ color: "rgba(15,23,42,0.7)" }}>{aElement}</p>
    </div>
  );
}

/* ---------------- Bright pastel circles (darker / clearer) ---------------- */
function BrightCircles() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1, // below Waves (we will render Waves at zIndex=2)
          pointerEvents: "none",
          overflow: "hidden",
        }}
        aria-hidden
      >
        <div className="bc-circle bc1" />
        <div className="bc-circle bc2" />
        <div className="bc-circle bc3" />
        <div className="bc-circle bc4 bc-hide-md" />
        <div className="bc-circle bc5 bc-hide-md" />

        {/* Updated circle styles: smaller sizes and pastel colours */}
        <style>{`
          .bc-circle {
            position: absolute;
            border-radius: 9999px;
            filter: blur(10px);
            opacity: 0.95;
            transform: translate3d(0,0,0);
            pointer-events: none;
            box-shadow: 0 18px 40px rgba(2,6,23,0.06);
          }

          /* pastel radial centers for a softer appearance, reduced sizes */
          .bc1 { left: -6%; top: 6%; width: 320px; height: 320px;
            background: radial-gradient(circle at 35% 30%, rgba(255,182,193,0.95) 0%, rgba(255,182,193,0.75) 40%, rgba(255,182,193,0.45) 70%);
            animation: bc1 11s ease-in-out infinite;
          }
          .bc2 { right: -4%; top: 2%; width: 260px; height: 260px;
            background: radial-gradient(circle at 35% 30%, rgba(173,216,230,0.95) 0%, rgba(173,216,230,0.78) 40%, rgba(173,216,230,0.45) 75%);
            animation: bc2 14s ease-in-out infinite;
          }
          .bc3 { left: 12%; bottom: -4%; width: 220px; height: 220px;
            background: radial-gradient(circle at 35% 35%, rgba(152,251,152,0.95) 0%, rgba(152,251,152,0.78) 44%, rgba(152,251,152,0.4) 80%);
            animation: bc3 12s ease-in-out infinite;
          }
          .bc4 { right: 18%; bottom: 6%; width: 180px; height: 180px;
            background: radial-gradient(circle at 35% 30%, rgba(255,239,153,0.95) 0%, rgba(255,239,153,0.78) 42%, rgba(255,239,153,0.4) 78%);
            animation: bc4 16s ease-in-out infinite;
          }
          .bc5 { left: 50%; top: 28%; width: 140px; height: 140px;
            background: radial-gradient(circle at 35% 35%, rgba(221,160,221,0.95) 0%, rgba(221,160,221,0.78) 40%, rgba(221,160,221,0.4) 78%);
            animation: bc5 9s ease-in-out infinite;
            transform: translate3d(-10%,0,0);
          }

          @keyframes bc1 { 0% { transform: translateY(0) } 50% { transform: translateY(-18px) } 100% { transform: translateY(0) } }
          @keyframes bc2 { 0% { transform: translateY(0) } 50% { transform: translateY(22px) } 100% { transform: translateY(0) } }
          @keyframes bc3 { 0% { transform: translateY(0) } 50% { transform: translateY(-15px) } 100% { transform: translateY(0) } }
          @keyframes bc4 { 0% { transform: translateY(0) } 50% { transform: translateY(18px) } 100% { transform: translateY(0) } }
          @keyframes bc5 { 0% { transform: translateY(0) } 50% { transform: translateY(-10px) } 100% { transform: translateY(0) } }

          /* hide the larger decorative circles on smaller screens to reduce clutter */
          @media (max-width: 768px) {
            .bc-hide-md { display: none; }
            .bc1, .bc2 { opacity: 0.95; filter: blur(9px); }
          }
        `}</style>
      </div>
    </>
  );
}

/* ---------------- Main page ---------------- */
export default function HomePage() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const decryptProps = {
    speed: 120,
    maxIterations: 30,
    animateOn: "view" as const,
    sequential: false,
    revealDirection: "start" as const,
    className: "decrypted-visible",
    encryptedClassName: "decrypted-encrypted",
  };

  const sectionStyle: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#ffffff", // <-- changed to white background
    color: "black",
    zIndex: 0,
    minHeight: "100vh",
    padding: "4rem 0",
  };

  const contentZ: React.CSSProperties = {
    position: "relative",
    zIndex: 3, // above Waves (2) and circles (1)
    padding: "0 1rem",
    maxWidth: "1200px",
    margin: "0 auto",
    pointerEvents: "none", // allow underlying waves to receive pointer events
  };

  const interactiveStyle: React.CSSProperties = { pointerEvents: "auto" };

  return (
    <HomePageLayout>
      <section style={sectionStyle}>
        {/* Brighter/darker pastel circles (zIndex 1) */}
        <BrightCircles />

        {/* Waves container (zIndex 2) */}
        <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "auto" }}>
          <Waves
            lineColor="#000000"
            backgroundColor="transparent"
            waveSpeedX={0.018}
            waveSpeedY={0.006}
            waveAmpX={28}
            waveAmpY={14}
            xGap={18}
            yGap={36}
          />
        </div>

        {/* Foreground content (zIndex 3) */}
        <div className="section-content text-center" style={contentZ}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6" style={{ color: "#0f172a", ...interactiveStyle }}>
            <DecryptedText text="fuy — find yourself" {...decryptProps} />
          </h1>
          <p className="text-lg sm:text-xl mb-8" style={{ color: "rgba(15,23,42,0.9)", ...interactiveStyle }}>
            <DecryptedText text="Tiny, evidence-based actions that compound into clearer days, deeper bonds, and more ease. Designed to be gentle, playful, and private-by-default." {...decryptProps} />
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-16" style={interactiveStyle}>
            <Chip labelElement={<DecryptedText text="values" {...decryptProps} />} tone="emerald" />
            <Chip labelElement={<DecryptedText text="awe" {...decryptProps} />} tone="sky" />
            <Chip labelElement={<DecryptedText text="joy" {...decryptProps} />} tone="amber" />
            <Chip labelElement={<DecryptedText text="repair" {...decryptProps} />} tone="rose" />
            <Chip labelElement={<DecryptedText text="progress" {...decryptProps} />} tone="stone" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8" style={interactiveStyle}>
            {tiles.map((t) => (
              <InfoCard
                key={t.href}
                tone={t.tone}
                titleElement={<DecryptedText text={t.title} {...decryptProps} />}
                pointsElements={[
                  <DecryptedText key={1} text={t.blurb} {...decryptProps} />,
                  <div key={2} className="flex flex-wrap items-center gap-2 mt-3">
                    <Chip labelElement={<DecryptedText text={t.tag} {...decryptProps} />} tone={t.tone as any} />
                    {t.kpi && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs" style={{ background: "rgba(15,23,42,0.04)", color: "#0f172a" }}>
                        <DecryptedText text={t.kpi} {...decryptProps} />
                      </span>
                    )}
                    <NextLink href={t.href} className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors" style={{ marginLeft: 6 }}>
                      <DecryptedText text="Open" {...decryptProps} />
                    </NextLink>
                  </div>
                ]}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: reuse visuals */}
      <section style={sectionStyle}>
        <BrightCircles />
        <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "auto" }}>
          <Waves
            lineColor="#000000"
            backgroundColor="transparent"
            waveSpeedX={0.01}
            waveSpeedY={0.0045}
            waveAmpX={20}
            waveAmpY={12}
            xGap={22}
            yGap={30}
          />
        </div>

        <div className="section-content" style={contentZ}>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-6" style={{ color: "#0f172a", ...interactiveStyle }}>
            <DecryptedText text="A gentle social layer" {...decryptProps} />
          </h2>
          <p className="text-center text-lg sm:text-xl mb-8" style={{ color: "rgba(15,23,42,0.9)", ...interactiveStyle }}>
            <DecryptedText text="Invite a few friends, or join a small group. Share little wins, not hot takes." {...decryptProps} />
          </p>

          <div className="flex justify-center gap-5 mb-20" style={interactiveStyle}>
            <SocialChip labelElement={<DecryptedText text="Friends feed" {...decryptProps} />} />
            <SocialChip labelElement={<DecryptedText text="Tiny groups" {...decryptProps} />} />
            <SocialChip labelElement={<DecryptedText text="Kind rankings" {...decryptProps} />} />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8" style={{ color: "#0f172a", ...interactiveStyle }}>
            <DecryptedText text="FAQ" {...decryptProps} />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20" style={interactiveStyle}>
            <FAQItem
              qElement={<DecryptedText text="Is my data private?" {...decryptProps} />}
              aElement={<DecryptedText text="Yes. Everything is private by default; you choose per-post visibility. You can export all data anytime (PDF + JSON)." {...decryptProps} />}
            />
            <FAQItem
              qElement={<DecryptedText text="What if I miss days?" {...decryptProps} />}
              aElement={<DecryptedText text="Nothing breaks. We reward starts, not streaks. Tiny actions compound over time." {...decryptProps} />}
            />
            <FAQItem
              qElement={<DecryptedText text="Will this feel like work?" {...decryptProps} />}
              aElement={<DecryptedText text="No. Sessions are playful and light: mini-games, maps, and short reflections that teach you what actually helps." {...decryptProps} />}
            />
          </div>

          <div className="text-center" style={interactiveStyle}>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6" style={{ color: "#0f172a" }}>
              <DecryptedText text="Ready when you are" {...decryptProps} />
            </h3>
            <p className="text-lg sm:text-xl mb-8" style={{ color: "rgba(15,23,42,0.9)" }}>
              <DecryptedText text="Step in, do a tiny thing, and step out. That's how compounding calm happens." {...decryptProps} />
            </p>
            {isAuthenticated ? (
              <NextLink
                className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
                href="/onboarding"
              >
                <DecryptedText text="Get started" {...decryptProps} />
              </NextLink>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                <NextLink
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
                  href="/signup"
                >
                  <DecryptedText text="Sign Up" {...decryptProps} />
                </NextLink>
                <NextLink
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition-colors text-sm sm:text-base"
                  href="/login"
                >
                  <DecryptedText text="Login" {...decryptProps} />
                </NextLink>
              </div>
            )}
          </div>
        </div>
      </section>
    </HomePageLayout>
  );
}
