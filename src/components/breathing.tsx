"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import clsx from "clsx";

/** ==================== Types ==================== */

type BreathingTechnique = {
  id: number;
  name: string;
  instructions: string;
  primaryUses: string[];
  category?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
};

type PhaseKey = "inhale" | "hold1" | "exhale" | "hold2";

/** ==================== Breathing Techniques Data ==================== */

const breathingTechniques: BreathingTechnique[] = [
  {
    id: 1,
    name: "Box Breathing",
    instructions:
      "Inhale for 4 counts, hold for 4 counts, exhale for 4 counts, hold for 4 counts. Repeat the cycle.",
    primaryUses: ["Stress Relief", "Focus", "Sleep"],
    category: "Foundational",
    difficulty: "Beginner",
  },
  {
    id: 2,
    name: "4-7-8 Breathing",
    instructions:
      "Inhale for 4 counts, hold for 7 counts, exhale slowly for 8 counts. Repeat 4 times.",
    primaryUses: ["Sleep", "Relaxation", "Anxiety"],
    category: "Relaxation",
    difficulty: "Intermediate",
  },
  {
    id: 3,
    name: "Physiological Sigh",
    instructions:
      "Take two quick inhales through the nose, then exhale slowly through the mouth for 6 counts.",
    primaryUses: ["Stress Relief", "Quick Calm", "Anxiety"],
    category: "Quick Reset",
    difficulty: "Beginner",
  },
  {
    id: 4,
    name: "Diaphragmatic Breathing",
    instructions:
      "Place one hand on chest, one on belly. Breathe so only the belly hand moves. Inhale for 5 counts, exhale for 5 counts.",
    primaryUses: ["Deep Relaxation", "Blood Pressure", "Energy"],
    category: "Foundational",
    difficulty: "Beginner",
  },
  {
    id: 5,
    name: "Alternate Nostril Breathing",
    instructions:
      "Close right nostril, inhale left for 4 counts. Close left, exhale right for 4 counts. Alternate sides.",
    primaryUses: ["Balance", "Mental Clarity", "Calm"],
    category: "Yoga",
    difficulty: "Intermediate",
  },
  {
    id: 6,
    name: "Pursed-Lip Breathing",
    instructions:
      "Inhale slowly through nose for 2 counts, then exhale through pursed lips for 4 counts.",
    primaryUses: ["Control", "Anxiety", "COPD Support"],
    category: "Therapeutic",
    difficulty: "Beginner",
  },
  {
    id: 7,
    name: "Resonance Breathing",
    instructions:
      "Breathe at a steady rate of 5-6 breaths per minute. Inhale for 5 counts, exhale for 5 counts.",
    primaryUses: ["Calm", "Heart Health", "Balance"],
    category: "Advanced",
    difficulty: "Intermediate",
  },
  {
    id: 8,
    name: "Breath of Fire (Kapalabhati)",
    instructions:
      "Forceful exhales through nose with passive inhales. Pump the belly rapidly. Start with 20 reps, rest, repeat.",
    primaryUses: ["Energy", "Mental Clarity", "Detox"],
    category: "Yoga",
    difficulty: "Advanced",
  },
  {
    id: 9,
    name: "Lion's Breath (Simhasana)",
    instructions:
      "Inhale deeply, then exhale forcefully through the mouth while sticking out tongue. Make a 'ha' sound.",
    primaryUses: ["Energy", "Face Tension", "Confidence"],
    category: "Yoga",
    difficulty: "Intermediate",
  },
  {
    id: 10,
    name: "Bhramari (Bee Breath)",
    instructions:
      "Inhale deeply. As you exhale, make a humming bee sound. Keep chin tucked slightly.",
    primaryUses: ["Sleep", "Headache", "Throat Chakra"],
    category: "Yoga",
    difficulty: "Beginner",
  },
  {
    id: 11,
    name: "Ujjayi Breathing",
    instructions:
      "Partially constrict throat to create oceanic sound. Inhale and exhale through nose, maintaining sound throughout.",
    primaryUses: ["Focus", "Warmth", "Meditation"],
    category: "Yoga",
    difficulty: "Intermediate",
  },
  {
    id: 12,
    name: "Anulom Vilom",
    instructions:
      "Alternate nostril breathing. Close right, inhale left. Close left, exhale right. Continue switching.",
    primaryUses: ["Balance", "Energy", "Sleep"],
    category: "Yoga",
    difficulty: "Intermediate",
  },
  {
    id: 13,
    name: "Extended Exhale Breathing",
    instructions:
      "Inhale for 4 counts, exhale for 8 counts. The exhale should be twice as long as inhale.",
    primaryUses: ["Sleep", "Relaxation", "Stress"],
    category: "Relaxation",
    difficulty: "Beginner",
  },
  {
    id: 14,
    name: "Coherent Breathing",
    instructions:
      "Breathe at 5 breaths per minute. Inhale for 6 counts, exhale for 6 counts steadily.",
    primaryUses: ["Heart Rate", "Stress", "Balance"],
    category: "Scientific",
    difficulty: "Intermediate",
  },
  {
    id: 15,
    name: "Alternate Paced Breathing",
    instructions:
      "Inhale slowly, hold, then exhale quickly. Varies the pace between inhale and exhale.",
    primaryUses: ["Energy", "Focus", "Alertness"],
    category: "Energizing",
    difficulty: "Intermediate",
  },
  {
    id: 16,
    name: "Sama Vritti (Equal Breathing)",
    instructions:
      "Make all parts of breath equal. Inhale for 4, hold for 4, exhale for 4, hold for 4.",
    primaryUses: ["Balance", "Calm", "Meditation"],
    category: "Yoga",
    difficulty: "Beginner",
  },
  {
    id: 17,
    name: "Wim Hof Breathing",
    instructions:
      "Do 30-40 deep breaths rapidly. Breathe in fully through nose, exhale through mouth. Then hold after last exhale.",
    primaryUses: ["Energy", "Immune System", "Cold Exposure"],
    category: "Advanced",
    difficulty: "Advanced",
  },
  {
    id: 18,
    name: "Nadi Shodhana (Nostril Cleansing)",
    instructions:
      "Alternate nostril breathing focusing on cleansing energy channels. Inhale left, exhale right, vice versa.",
    primaryUses: ["Balance", "Purity", "Meditation"],
    category: "Yoga",
    difficulty: "Intermediate",
  },
  {
    id: 19,
    name: "Bumble Bee Breath",
    instructions:
      "Make a low humming sound during exhale. Keep mouth closed. Feel vibrations in head.",
    primaryUses: ["Anxiety", "Sleep", "Clarity"],
    category: "Yoga",
    difficulty: "Beginner",
  },
  {
    id: 20,
    name: "Vinchasana Breath",
    instructions:
      "Hold a specific body lock while breathing. Engage mula bandha (pelvic floor). Breathe deeply.",
    primaryUses: ["Energy", "Control", "Advanced Practice"],
    category: "Yoga",
    difficulty: "Advanced",
  },
  {
    id: 21,
    name: "Shitali Breathing (Cooling)",
    instructions:
      "Curl tongue, inhale through curled tongue. Exhale through nose. Creates cooling effect.",
    primaryUses: ["Cool Down", "Heat", "Stress"],
    category: "Yoga",
    difficulty: "Intermediate",
  },
  {
    id: 22,
    name: "Sitkari Breathing",
    instructions:
      "Inhale through teeth with tongue between them, creating 'sss' sound. Exhale through nose.",
    primaryUses: ["Cooling", "Anxiety", "Digestion"],
    category: "Yoga",
    difficulty: "Intermediate",
  },
  {
    id: 23,
    name: "Nostril Flaring Breath",
    instructions:
      "Breathe through nose with nostrils flared open. Focus on nasal airway expansion.",
    primaryUses: ["Nasal Health", "Energy", "Awareness"],
    category: "Technique",
    difficulty: "Beginner",
  },
  {
    id: 24,
    name: "Triangle Breathing",
    instructions:
      "Inhale for 4 counts, hold for 4 counts, exhale for 4 counts. Form a mental triangle.",
    primaryUses: ["Focus", "Calm", "Grounding"],
    category: "Visualization",
    difficulty: "Beginner",
  },
  {
    id: 25,
    name: "5-4-3-2-1 Sensory Breathing",
    instructions:
      "Breathe while focusing on 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.",
    primaryUses: ["Anxiety", "Presence", "Grounding"],
    category: "Mindfulness",
    difficulty: "Intermediate",
  },
  {
    id: 26,
    name: "Long Exhale Breathing",
    instructions:
      "Exhale for much longer than inhale. Inhale for 4, exhale for 8. Signals relaxation to nervous system.",
    primaryUses: ["Sleep", "Relaxation", "Calm"],
    category: "Relaxation",
    difficulty: "Beginner",
  },
  {
    id: 27,
    name: "Bellows Breath (Bhastrika)",
    instructions:
      "Pump the belly forcefully while breathing. Quick, powerful breaths. Do 10 reps, rest, repeat.",
    primaryUses: ["Energy", "Heat", "Stamina"],
    category: "Yoga",
    difficulty: "Advanced",
  },
  {
    id: 28,
    name: "Counting Breath",
    instructions:
      "Count breaths to 10, then start over. If mind wanders, restart at 1. Builds focus.",
    primaryUses: ["Meditation", "Focus", "Mindfulness"],
    category: "Meditation",
    difficulty: "Beginner",
  },
  {
    id: 29,
    name: "Visualization Breathing",
    instructions:
      "As you inhale, visualize clean air entering. As you exhale, visualize stress leaving.",
    primaryUses: ["Stress Relief", "Relaxation", "Healing"],
    category: "Visualization",
    difficulty: "Intermediate",
  },
  {
    id: 30,
    name: "Straw Breathing",
    instructions:
      "Inhale normally through nose, exhale slowly through pursed lips as if breathing through a straw.",
    primaryUses: ["Control", "Pressure", "Calm"],
    category: "Therapeutic",
    difficulty: "Beginner",
  },
  {
    id: 31,
    name: "Slow Breathing",
    instructions:
      "Breathe at 6 breaths per minute. Very slow, deep, mindful breaths. Great for baseline calm.",
    primaryUses: ["Sleep", "Meditation", "Baseline"],
    category: "Foundational",
    difficulty: "Beginner",
  },
  {
    id: 32,
    name: "Energizing Breath",
    instructions:
      "Rapid, shallow breaths through the nose. Pump energy into the body. 20-30 quick breaths.",
    primaryUses: ["Energy", "Alertness", "Focus"],
    category: "Energizing",
    difficulty: "Intermediate",
  },
  {
    id: 33,
    name: "Lunar Breathing (Left Nostril)",
    instructions:
      "Breathe only through left nostril for 5 minutes. Creates cooling, calming energy.",
    primaryUses: ["Sleep", "Calm", "Feminine Energy"],
    category: "Yoga",
    difficulty: "Intermediate",
  },
  {
    id: 34,
    name: "Solar Breathing (Right Nostril)",
    instructions:
      "Breathe only through right nostril for 5 minutes. Creates warming, energizing effect.",
    primaryUses: ["Energy", "Warmth", "Masculine Energy"],
    category: "Yoga",
    difficulty: "Intermediate",
  },
  {
    id: 35,
    name: "Heart-Centered Breathing",
    instructions:
      "Place hand on heart. Breathe deeply while focusing attention on heart center. Feel love.",
    primaryUses: ["Compassion", "Love", "Healing"],
    category: "Mindfulness",
    difficulty: "Beginner",
  },
  {
    id: 36,
    name: "Rhythmic Breathing",
    instructions:
      "Establish a rhythm: inhale 1-2-3-4, hold 1-2-3-4, exhale 1-2-3-4-5-6-7-8.",
    primaryUses: ["Balance", "Meditation", "Calm"],
    category: "Foundational",
    difficulty: "Intermediate",
  },
  {
    id: 37,
    name: "Abdominal Breathing",
    instructions:
      "Breathe so the abdomen expands on inhale and contracts on exhale. Keep chest still.",
    primaryUses: ["Deep Relaxation", "Awareness", "Calm"],
    category: "Foundational",
    difficulty: "Beginner",
  },
  {
    id: 38,
    name: "Chest Breathing",
    instructions:
      "Breathe so the chest expands on inhale. Used for alertness and some athletic activities.",
    primaryUses: ["Energy", "Alertness", "Athletic"],
    category: "Energizing",
    difficulty: "Beginner",
  },
  {
    id: 39,
    name: "Full Yogic Breathing",
    instructions:
      "Three-part breath: first fill abdomen, then mid-chest, then upper chest. Exhale in reverse.",
    primaryUses: ["Complete Oxygenation", "Capacity", "Healing"],
    category: "Yoga",
    difficulty: "Intermediate",
  },
  {
    id: 40,
    name: "Alternate Nostril with Retention",
    instructions:
      "Alternate nostril breathing with a 4-count hold between inhale and exhale.",
    primaryUses: ["Advanced Practice", "Balance", "Energy"],
    category: "Yoga",
    difficulty: "Advanced",
  },
  {
    id: 41,
    name: "Fear Release Breathing",
    instructions:
      "Inhale courage, hold briefly. Exhale fear. Focus on emotional release with each breath.",
    primaryUses: ["Fear Release", "Courage", "Confidence"],
    category: "Emotional Release",
    difficulty: "Intermediate",
  },
  {
    id: 42,
    name: "Gratitude Breathing",
    instructions:
      "Breathe in gratitude, breathe out worry. Focus on appreciation with each exhale.",
    primaryUses: ["Appreciation", "Mood", "Positivity"],
    category: "Mindfulness",
    difficulty: "Beginner",
  },
  {
    id: 43,
    name: "Grounding Breath",
    instructions:
      "Feel feet on ground. Breathe deeply while visualizing roots extending from body into earth.",
    primaryUses: ["Grounding", "Anxiety", "Presence"],
    category: "Mindfulness",
    difficulty: "Beginner",
  },
  {
    id: 44,
    name: "Sky Gazing Breath",
    instructions:
      "Breathe while looking at the sky. Visualize breath connecting you to infinite space.",
    primaryUses: ["Expansion", "Peace", "Perspective"],
    category: "Nature",
    difficulty: "Beginner",
  },
  {
    id: 45,
    name: "Compassion Breathing",
    instructions:
      "Breathe in compassion for others. Breathe out healing light. Extends love outward.",
    primaryUses: ["Compassion", "Empathy", "Healing"],
    category: "Spiritual",
    difficulty: "Intermediate",
  },
  {
    id: 46,
    name: "Self-Love Breathing",
    instructions:
      "Breathe in love for yourself. Breathe out self-judgment. Focus on self-acceptance.",
    primaryUses: ["Self-Love", "Confidence", "Healing"],
    category: "Emotional",
    difficulty: "Beginner",
  },
  {
    id: 47,
    name: "Tension Release Breathing",
    instructions:
      "Scan body for tension. Breathe into tense areas. Exhale to release. Progressive relaxation.",
    primaryUses: ["Muscle Tension", "Relaxation", "Awareness"],
    category: "Therapeutic",
    difficulty: "Intermediate",
  },
  {
    id: 48,
    name: "Energetic Breath",
    instructions:
      "Breathe in expansively. Feel energy filling your body. Breathe out to radiate energy.",
    primaryUses: ["Energy", "Confidence", "Presence"],
    category: "Energizing",
    difficulty: "Intermediate",
  },
  {
    id: 49,
    name: "Pain Management Breathing",
    instructions:
      "Breathe into areas of discomfort. Exhale to reduce pain sensation. Combines visualization.",
    primaryUses: ["Pain Relief", "Comfort", "Healing"],
    category: "Therapeutic",
    difficulty: "Intermediate",
  },
  {
    id: 50,
    name: "Wound Healing Breath",
    instructions:
      "Direct breath to areas needing healing. Visualize golden light promoting recovery.",
    primaryUses: ["Healing", "Recovery", "Wellness"],
    category: "Spiritual",
    difficulty: "Intermediate",
  },
  {
    id: 51,
    name: "Nadis Breathing",
    instructions:
      "Advanced nostril work with specific energy channel focus. Left and right nadi awareness.",
    primaryUses: ["Energy Balance", "Advanced Practice", "Chakras"],
    category: "Yoga",
    difficulty: "Advanced",
  },
  {
    id: 52,
    name: "Chakra Breathing",
    instructions:
      "Breathe while focusing on each chakra from root to crown. Visualize colored light.",
    primaryUses: ["Chakra Activation", "Energy", "Spirituality"],
    category: "Spiritual",
    difficulty: "Advanced",
  },
  {
    id: 53,
    name: "Mantra Breathing",
    instructions:
      "Repeat a mantra while breathing. Inhale with first half, exhale with second half.",
    primaryUses: ["Meditation", "Focus", "Spirituality"],
    category: "Meditation",
    difficulty: "Intermediate",
  },
  {
    id: 54,
    name: "Conscious Breath Awareness",
    instructions:
      "Simply observe your natural breathing without trying to change it. Build awareness first.",
    primaryUses: ["Mindfulness", "Meditation", "Foundation"],
    category: "Mindfulness",
    difficulty: "Beginner",
  },
];

/** ==================== Component ==================== */

function DifficultyBadge({ difficulty }: { difficulty?: string }) {
  if (!difficulty) return null;
  const colorMap = {
    Beginner: "bg-green-100 text-green-800",
    Intermediate: "bg-blue-100 text-blue-800",
    Advanced: "bg-purple-100 text-purple-800",
  };
  const color =
    colorMap[difficulty as keyof typeof colorMap] ||
    "bg-gray-100 text-gray-800";
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>
      {difficulty}
    </span>
  );
}

function BreathingCard({
  technique,
  isExpanded,
  onToggle,
}: {
  technique: BreathingTechnique;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white/60 backdrop-blur border border-white/70 rounded-2xl overflow-hidden hover:shadow-lg transition-all">
      <button
        onClick={onToggle}
        className="w-full p-6 text-left hover:bg-white/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-black mb-2">
              {technique.name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {technique.difficulty && (
                <DifficultyBadge difficulty={technique.difficulty} />
              )}
              {technique.category && (
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                  {technique.category}
                </span>
              )}
            </div>
          </div>
          <div className="text-gray-400 flex-shrink-0">
            {isExpanded ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-white/50 px-6 py-6 bg-white/30 space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-black mb-2">How to Do It</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {technique.instructions}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-black mb-2">Primary Uses</h4>
            <div className="flex flex-wrap gap-2">
              {technique.primaryUses.map((use, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-full"
                >
                  {use}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BreathingSession() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter techniques
  const filteredTechniques = breathingTechniques.filter((tech) => {
    const matchesSearch =
      searchQuery === "" ||
      tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.instructions.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.primaryUses.some((use) =>
        use.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === null || tech.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(
    new Set(breathingTechniques.map((t) => t.category).filter(Boolean))
  ) as string[];

  const scrollHorizontally = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amt = 200;
    scrollRef.current.scrollBy({
      left: dir === "right" ? amt : -amt,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-emerald-50 text-neutral-900">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl p-6 md:p-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-black mb-3">
            Breathing Practices
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Discover 54 breathing techniques for any need. From foundational practices to advanced yoga techniques.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search techniques by name, benefit, or how to do..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 bg-white/60 backdrop-blur border border-white/70 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-black placeholder-gray-500"
            />
            <svg
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
              style={{ scrollBehavior: "smooth" }}
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className={clsx(
                  "snap-center flex-shrink-0 px-5 py-2 rounded-full font-medium transition-all whitespace-nowrap",
                  selectedCategory === null
                    ? "bg-emerald-500 text-white shadow-lg"
                    : "bg-white/60 backdrop-blur border border-white/70 text-black hover:bg-white/80"
                )}
              >
                All ({breathingTechniques.length})
              </button>
              {categories.map((cat) => {
                const count = breathingTechniques.filter(
                  (t) => t.category === cat
                ).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={clsx(
                      "snap-center flex-shrink-0 px-5 py-2 rounded-full font-medium transition-all whitespace-nowrap",
                      selectedCategory === cat
                        ? "bg-emerald-500 text-white shadow-lg"
                        : "bg-white/60 backdrop-blur border border-white/70 text-black hover:bg-white/80"
                    )}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Scroll arrows */}
            <button
              onClick={() => scrollHorizontally("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/70 backdrop-blur border border-white/50 hover:bg-white"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scrollHorizontally("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/70 backdrop-blur border border-white/50 hover:bg-white"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 text-sm text-gray-600">
          Showing {filteredTechniques.length} of {breathingTechniques.length}{" "}
          techniques
        </div>

        {/* Techniques Grid */}
        {filteredTechniques.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {filteredTechniques.map((technique) => (
              <BreathingCard
                key={technique.id}
                technique={technique}
                isExpanded={expandedId === technique.id}
                onToggle={() =>
                  setExpandedId(expandedId === technique.id ? null : technique.id)
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-500 text-lg">
              No breathing techniques found matching your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
