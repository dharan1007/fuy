"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

// Global animations helper (initialized in component useEffect)
const addGlobalAnimations = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById("breathing-animations")) return;

  const style = document.createElement("style");
  style.id = "breathing-animations";
  style.textContent = `
    @keyframes slideGrid {
      0% { background-position: 0 0; }
      100% { background-position: 50px 50px; }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.5s ease-out;
    }
  `;
  document.head.appendChild(style);
};

/** ==================== Types ==================== */

type BreathingTechnique = {
  id: number;
  name: string;
  instructions: string;
  primaryUses: string[];
  category?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  animationStyle?: "box" | "wave" | "pulse" | "spiral" | "flower" | "infinity";
  reactions?: {
    loved: number;
    helpful: number;
    peaceful: number;
  };
};

type PhaseKey = "inhale" | "hold1" | "exhale" | "hold2";
type ReactionType = "loved" | "helpful" | "peaceful";

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
    animationStyle: "box",
    reactions: { loved: 342, helpful: 521, peaceful: 389 },
  },
  {
    id: 2,
    name: "4-7-8 Breathing",
    instructions:
      "Inhale for 4 counts, hold for 7 counts, exhale slowly for 8 counts. Repeat 4 times.",
    primaryUses: ["Sleep", "Relaxation", "Anxiety"],
    category: "Relaxation",
    difficulty: "Intermediate",
    animationStyle: "wave",
    reactions: { loved: 456, helpful: 623, peaceful: 567 },
  },
  {
    id: 3,
    name: "Physiological Sigh",
    instructions:
      "Take two quick inhales through the nose, then exhale slowly through the mouth for 6 counts.",
    primaryUses: ["Stress Relief", "Quick Calm", "Anxiety"],
    category: "Quick Reset",
    difficulty: "Beginner",
    animationStyle: "pulse",
    reactions: { loved: 234, helpful: 456, peaceful: 289 },
  },
  {
    id: 4,
    name: "Diaphragmatic Breathing",
    instructions:
      "Place one hand on chest, one on belly. Breathe so only the belly hand moves. Inhale for 5 counts, exhale for 5 counts.",
    primaryUses: ["Deep Relaxation", "Blood Pressure", "Energy"],
    category: "Foundational",
    difficulty: "Beginner",
    animationStyle: "box",
    reactions: { loved: 173, helpful: 354, peaceful: 197 },
  },
  {
    id: 5,
    name: "Alternate Nostril Breathing",
    instructions:
      "Close right nostril, inhale left for 4 counts. Close left, exhale right for 4 counts. Alternate sides.",
    primaryUses: ["Balance", "Mental Clarity", "Calm"],
    category: "Yoga",
    difficulty: "Intermediate",
    animationStyle: "wave",
    reactions: { loved: 381, helpful: 379, peaceful: 575 },
  },
  {
    id: 6,
    name: "Pursed-Lip Breathing",
    instructions:
      "Inhale slowly through nose for 2 counts, then exhale through pursed lips for 4 counts.",
    primaryUses: ["Control", "Anxiety", "COPD Support"],
    category: "Therapeutic",
    difficulty: "Beginner",
    animationStyle: "pulse",
    reactions: { loved: 283, helpful: 672, peaceful: 562 },
  },
  {
    id: 7,
    name: "Resonance Breathing",
    instructions:
      "Breathe at a steady rate of 5-6 breaths per minute. Inhale for 5 counts, exhale for 5 counts.",
    primaryUses: ["Calm", "Heart Health", "Balance"],
    category: "Advanced",
    difficulty: "Intermediate",
    animationStyle: "spiral",
    reactions: { loved: 259, helpful: 674, peaceful: 470 },
  },
  {
    id: 8,
    name: "Breath of Fire (Kapalabhati)",
    instructions:
      "Forceful exhales through nose with passive inhales. Pump the belly rapidly. Start with 20 reps, rest, repeat.",
    primaryUses: ["Energy", "Mental Clarity", "Detox"],
    category: "Yoga",
    difficulty: "Advanced",
    animationStyle: "flower",
    reactions: { loved: 282, helpful: 649, peaceful: 451 },
  },
  {
    id: 9,
    name: "Lion's Breath (Simhasana)",
    instructions:
      "Inhale deeply, then exhale forcefully through the mouth while sticking out tongue. Make a 'ha' sound.",
    primaryUses: ["Energy", "Face Tension", "Confidence"],
    category: "Yoga",
    difficulty: "Intermediate",
    animationStyle: "infinity",
    reactions: { loved: 212, helpful: 381, peaceful: 540 },
  },
  {
    id: 10,
    name: "Bhramari (Bee Breath)",
    instructions:
      "Inhale deeply. As you exhale, make a humming bee sound. Keep chin tucked slightly.",
    primaryUses: ["Sleep", "Headache", "Throat Chakra"],
    category: "Yoga",
    difficulty: "Beginner",
    animationStyle: "box",
    reactions: { loved: 433, helpful: 389, peaceful: 409 },
  },
  {
    id: 11,
    name: "Ujjayi Breathing",
    instructions:
      "Partially constrict throat to create oceanic sound. Inhale and exhale through nose, maintaining sound throughout.",
    primaryUses: ["Focus", "Warmth", "Meditation"],
    category: "Yoga",
    difficulty: "Intermediate",
    animationStyle: "wave",
    reactions: { loved: 377, helpful: 440, peaceful: 260 },
  },
  {
    id: 12,
    name: "Anulom Vilom",
    instructions:
      "Alternate nostril breathing. Close right, inhale left. Close left, exhale right. Continue switching.",
    primaryUses: ["Balance", "Energy", "Sleep"],
    category: "Yoga",
    difficulty: "Intermediate",
    animationStyle: "pulse",
    reactions: { loved: 302, helpful: 488, peaceful: 490 },
  },
  {
    id: 13,
    name: "Extended Exhale Breathing",
    instructions:
      "Inhale for 4 counts, exhale for 8 counts. The exhale should be twice as long as inhale.",
    primaryUses: ["Sleep", "Relaxation", "Stress"],
    category: "Relaxation",
    difficulty: "Beginner",
    animationStyle: "spiral",
    reactions: { loved: 525, helpful: 630, peaceful: 573 },
    
  },
  {
    id: 14,
    name: "Coherent Breathing",
    instructions:
      "Breathe at 5 breaths per minute. Inhale for 6 counts, exhale for 6 counts steadily.",
    primaryUses: ["Heart Rate", "Stress", "Balance"],
    category: "Scientific",
    difficulty: "Intermediate",
    animationStyle: "flower",
    reactions: { loved: 180, helpful: 365, peaceful: 569 },
    
  },
  {
    id: 15,
    name: "Alternate Paced Breathing",
    instructions:
      "Inhale slowly, hold, then exhale quickly. Varies the pace between inhale and exhale.",
    primaryUses: ["Energy", "Focus", "Alertness"],
    category: "Energizing",
    difficulty: "Intermediate",
    animationStyle: "infinity",
    reactions: { loved: 265, helpful: 605, peaceful: 499 },
    
  },
  {
    id: 16,
    name: "Sama Vritti (Equal Breathing)",
    instructions:
      "Make all parts of breath equal. Inhale for 4, hold for 4, exhale for 4, hold for 4.",
    primaryUses: ["Balance", "Calm", "Meditation"],
    category: "Yoga",
    difficulty: "Beginner",
    animationStyle: "box",
    reactions: { loved: 109, helpful: 506, peaceful: 425 },
    
  },
  {
    id: 17,
    name: "Wim Hof Breathing",
    instructions:
      "Do 30-40 deep breaths rapidly. Breathe in fully through nose, exhale through mouth. Then hold after last exhale.",
    primaryUses: ["Energy", "Immune System", "Cold Exposure"],
    category: "Advanced",
    difficulty: "Advanced",
    animationStyle: "wave",
    reactions: { loved: 303, helpful: 468, peaceful: 123 },
    
  },
  {
    id: 18,
    name: "Nadi Shodhana (Nostril Cleansing)",
    instructions:
      "Alternate nostril breathing focusing on cleansing energy channels. Inhale left, exhale right, vice versa.",
    primaryUses: ["Balance", "Purity", "Meditation"],
    category: "Yoga",
    difficulty: "Intermediate",
    animationStyle: "pulse",
    reactions: { loved: 188, helpful: 292, peaceful: 174 },
    
  },
  {
    id: 19,
    name: "Bumble Bee Breath",
    instructions:
      "Make a low humming sound during exhale. Keep mouth closed. Feel vibrations in head.",
    primaryUses: ["Anxiety", "Sleep", "Clarity"],
    category: "Yoga",
    difficulty: "Beginner",
    animationStyle: "spiral",
    reactions: { loved: 287, helpful: 246, peaceful: 420 },
    
  },
  {
    id: 20,
    name: "Vinchasana Breath",
    instructions:
      "Hold a specific body lock while breathing. Engage mula bandha (pelvic floor). Breathe deeply.",
    primaryUses: ["Energy", "Control", "Advanced Practice"],
    category: "Yoga",
    difficulty: "Advanced",
    animationStyle: "flower",
    reactions: { loved: 453, helpful: 324, peaceful: 152 },
    
  },
  {
    id: 21,
    name: "Shitali Breathing (Cooling)",
    instructions:
      "Curl tongue, inhale through curled tongue. Exhale through nose. Creates cooling effect.",
    primaryUses: ["Cool Down", "Heat", "Stress"],
    category: "Yoga",
    difficulty: "Intermediate",
    animationStyle: "infinity",
    reactions: { loved: 396, helpful: 254, peaceful: 348 },
    
  },
  {
    id: 22,
    name: "Sitkari Breathing",
    instructions:
      "Inhale through teeth with tongue between them, creating 'sss' sound. Exhale through nose.",
    primaryUses: ["Cooling", "Anxiety", "Digestion"],
    category: "Yoga",
    difficulty: "Intermediate",
    animationStyle: "box",
    reactions: { loved: 519, helpful: 610, peaceful: 152 },
    
  },
  {
    id: 23,
    name: "Nostril Flaring Breath",
    instructions:
      "Breathe through nose with nostrils flared open. Focus on nasal airway expansion.",
    primaryUses: ["Nasal Health", "Energy", "Awareness"],
    category: "Technique",
    difficulty: "Beginner",
    animationStyle: "wave",
    reactions: { loved: 481, helpful: 640, peaceful: 475 },
    
  },
  {
    id: 24,
    name: "Triangle Breathing",
    instructions:
      "Inhale for 4 counts, hold for 4 counts, exhale for 4 counts. Form a mental triangle.",
    primaryUses: ["Focus", "Calm", "Grounding"],
    category: "Visualization",
    difficulty: "Beginner",
    animationStyle: "pulse",
    reactions: { loved: 225, helpful: 442, peaceful: 229 },
    
  },
  {
    id: 25,
    name: "5-4-3-2-1 Sensory Breathing",
    instructions:
      "Breathe while focusing on 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.",
    primaryUses: ["Anxiety", "Presence", "Grounding"],
    category: "Mindfulness",
    difficulty: "Intermediate",
    animationStyle: "spiral",
    reactions: { loved: 557, helpful: 401, peaceful: 393 },
    
  },
  {
    id: 26,
    name: "Long Exhale Breathing",
    instructions:
      "Exhale for much longer than inhale. Inhale for 4, exhale for 8. Signals relaxation to nervous system.",
    primaryUses: ["Sleep", "Relaxation", "Calm"],
    category: "Relaxation",
    difficulty: "Beginner",
    animationStyle: "flower",
    reactions: { loved: 475, helpful: 423, peaceful: 184 },
    
  },
  {
    id: 27,
    name: "Bellows Breath (Bhastrika)",
    instructions:
      "Pump the belly forcefully while breathing. Quick, powerful breaths. Do 10 reps, rest, repeat.",
    primaryUses: ["Energy", "Heat", "Stamina"],
    category: "Yoga",
    difficulty: "Advanced",
    animationStyle: "infinity",
    reactions: { loved: 172, helpful: 411, peaceful: 423 },
    
  },
  {
    id: 28,
    name: "Counting Breath",
    instructions:
      "Count breaths to 10, then start over. If mind wanders, restart at 1. Builds focus.",
    primaryUses: ["Meditation", "Focus", "Mindfulness"],
    category: "Meditation",
    difficulty: "Beginner",
    animationStyle: "box",
    reactions: { loved: 196, helpful: 697, peaceful: 375 },
    
  },
  {
    id: 29,
    name: "Visualization Breathing",
    instructions:
      "As you inhale, visualize clean air entering. As you exhale, visualize stress leaving.",
    primaryUses: ["Stress Relief", "Relaxation", "Healing"],
    category: "Visualization",
    difficulty: "Intermediate",
    animationStyle: "wave",
    reactions: { loved: 544, helpful: 199, peaceful: 568 },
    
  },
  {
    id: 30,
    name: "Straw Breathing",
    instructions:
      "Inhale normally through nose, exhale slowly through pursed lips as if breathing through a straw.",
    primaryUses: ["Control", "Pressure", "Calm"],
    category: "Therapeutic",
    difficulty: "Beginner",
    animationStyle: "pulse",
    reactions: { loved: 431, helpful: 380, peaceful: 351 },
    
  },
  {
    id: 31,
    name: "Slow Breathing",
    instructions:
      "Breathe at 6 breaths per minute. Very slow, deep, mindful breaths. Great for baseline calm.",
    primaryUses: ["Sleep", "Meditation", "Baseline"],
    category: "Foundational",
    difficulty: "Beginner",
    animationStyle: "spiral",
    reactions: { loved: 274, helpful: 681, peaceful: 219 },
    
  },
  {
    id: 32,
    name: "Energizing Breath",
    instructions:
      "Rapid, shallow breaths through the nose. Pump energy into the body. 20-30 quick breaths.",
    primaryUses: ["Energy", "Alertness", "Focus"],
    category: "Energizing",
    difficulty: "Intermediate",
    animationStyle: "flower",
    reactions: { loved: 457, helpful: 544, peaceful: 254 },
    
  },
  {
    id: 33,
    name: "Lunar Breathing (Left Nostril)",
    instructions:
      "Breathe only through left nostril for 5 minutes. Creates cooling, calming energy.",
    primaryUses: ["Sleep", "Calm", "Feminine Energy"],
    category: "Yoga",
    difficulty: "Intermediate",
    animationStyle: "infinity",
    reactions: { loved: 260, helpful: 638, peaceful: 226 },
    
  },
  {
    id: 34,
    name: "Solar Breathing (Right Nostril)",
    instructions:
      "Breathe only through right nostril for 5 minutes. Creates warming, energizing effect.",
    primaryUses: ["Energy", "Warmth", "Masculine Energy"],
    category: "Yoga",
    difficulty: "Intermediate",
    animationStyle: "box",
    reactions: { loved: 214, helpful: 484, peaceful: 132 },
    
  },
  {
    id: 35,
    name: "Heart-Centered Breathing",
    instructions:
      "Place hand on heart. Breathe deeply while focusing attention on heart center. Feel love.",
    primaryUses: ["Compassion", "Love", "Healing"],
    category: "Mindfulness",
    difficulty: "Beginner",
    animationStyle: "wave",
    reactions: { loved: 364, helpful: 440, peaceful: 119 },
    
  },
  {
    id: 36,
    name: "Rhythmic Breathing",
    instructions:
      "Establish a rhythm: inhale 1-2-3-4, hold 1-2-3-4, exhale 1-2-3-4-5-6-7-8.",
    primaryUses: ["Balance", "Meditation", "Calm"],
    category: "Foundational",
    difficulty: "Intermediate",
    animationStyle: "pulse",
    reactions: { loved: 392, helpful: 154, peaceful: 217 },
    
  },
  {
    id: 37,
    name: "Abdominal Breathing",
    instructions:
      "Breathe so the abdomen expands on inhale and contracts on exhale. Keep chest still.",
    primaryUses: ["Deep Relaxation", "Awareness", "Calm"],
    category: "Foundational",
    difficulty: "Beginner",
    animationStyle: "spiral",
    reactions: { loved: 463, helpful: 258, peaceful: 167 },
    
  },
  {
    id: 38,
    name: "Chest Breathing",
    instructions:
      "Breathe so the chest expands on inhale. Used for alertness and some athletic activities.",
    primaryUses: ["Energy", "Alertness", "Athletic"],
    category: "Energizing",
    difficulty: "Beginner",
    animationStyle: "flower",
    reactions: { loved: 236, helpful: 400, peaceful: 406 },
    
  },
  {
    id: 39,
    name: "Full Yogic Breathing",
    instructions:
      "Three-part breath: first fill abdomen, then mid-chest, then upper chest. Exhale in reverse.",
    primaryUses: ["Complete Oxygenation", "Capacity", "Healing"],
    category: "Yoga",
    difficulty: "Intermediate",
    animationStyle: "infinity",
    reactions: { loved: 457, helpful: 587, peaceful: 427 },
    
  },
  {
    id: 40,
    name: "Alternate Nostril with Retention",
    instructions:
      "Alternate nostril breathing with a 4-count hold between inhale and exhale.",
    primaryUses: ["Advanced Practice", "Balance", "Energy"],
    category: "Yoga",
    difficulty: "Advanced",
    animationStyle: "box",
    reactions: { loved: 265, helpful: 251, peaceful: 346 },
    
  },
  {
    id: 41,
    name: "Fear Release Breathing",
    instructions:
      "Inhale courage, hold briefly. Exhale fear. Focus on emotional release with each breath.",
    primaryUses: ["Fear Release", "Courage", "Confidence"],
    category: "Emotional Release",
    difficulty: "Intermediate",
    animationStyle: "wave",
    reactions: { loved: 150, helpful: 743, peaceful: 484 },
    
  },
  {
    id: 42,
    name: "Gratitude Breathing",
    instructions:
      "Breathe in gratitude, breathe out worry. Focus on appreciation with each exhale.",
    primaryUses: ["Appreciation", "Mood", "Positivity"],
    category: "Mindfulness",
    difficulty: "Beginner",
    animationStyle: "pulse",
    reactions: { loved: 137, helpful: 579, peaceful: 392 },
    
  },
  {
    id: 43,
    name: "Grounding Breath",
    instructions:
      "Feel feet on ground. Breathe deeply while visualizing roots extending from body into earth.",
    primaryUses: ["Grounding", "Anxiety", "Presence"],
    category: "Mindfulness",
    difficulty: "Beginner",
    animationStyle: "spiral",
    reactions: { loved: 338, helpful: 482, peaceful: 160 },
    
  },
  {
    id: 44,
    name: "Sky Gazing Breath",
    instructions:
      "Breathe while looking at the sky. Visualize breath connecting you to infinite space.",
    primaryUses: ["Expansion", "Peace", "Perspective"],
    category: "Nature",
    difficulty: "Beginner",
    animationStyle: "flower",
    reactions: { loved: 553, helpful: 596, peaceful: 283 },
    
  },
  {
    id: 45,
    name: "Compassion Breathing",
    instructions:
      "Breathe in compassion for others. Breathe out healing light. Extends love outward.",
    primaryUses: ["Compassion", "Empathy", "Healing"],
    category: "Spiritual",
    difficulty: "Intermediate",
    animationStyle: "infinity",
    reactions: { loved: 225, helpful: 446, peaceful: 541 },
    
  },
  {
    id: 46,
    name: "Self-Love Breathing",
    instructions:
      "Breathe in love for yourself. Breathe out self-judgment. Focus on self-acceptance.",
    primaryUses: ["Self-Love", "Confidence", "Healing"],
    category: "Emotional",
    difficulty: "Beginner",
    animationStyle: "box",
    reactions: { loved: 577, helpful: 215, peaceful: 268 },
    
  },
  {
    id: 47,
    name: "Tension Release Breathing",
    instructions:
      "Scan body for tension. Breathe into tense areas. Exhale to release. Progressive relaxation.",
    primaryUses: ["Muscle Tension", "Relaxation", "Awareness"],
    category: "Therapeutic",
    difficulty: "Intermediate",
    animationStyle: "wave",
    reactions: { loved: 324, helpful: 362, peaceful: 490 },
    
  },
  {
    id: 48,
    name: "Energetic Breath",
    instructions:
      "Breathe in expansively. Feel energy filling your body. Breathe out to radiate energy.",
    primaryUses: ["Energy", "Confidence", "Presence"],
    category: "Energizing",
    difficulty: "Intermediate",
    animationStyle: "pulse",
    reactions: { loved: 120, helpful: 542, peaceful: 524 },
    
  },
  {
    id: 49,
    name: "Pain Management Breathing",
    instructions:
      "Breathe into areas of discomfort. Exhale to reduce pain sensation. Combines visualization.",
    primaryUses: ["Pain Relief", "Comfort", "Healing"],
    category: "Therapeutic",
    difficulty: "Intermediate",
    animationStyle: "spiral",
    reactions: { loved: 378, helpful: 440, peaceful: 295 },
    
  },
  {
    id: 50,
    name: "Wound Healing Breath",
    instructions:
      "Direct breath to areas needing healing. Visualize golden light promoting recovery.",
    primaryUses: ["Healing", "Recovery", "Wellness"],
    category: "Spiritual",
    difficulty: "Intermediate",
    animationStyle: "flower",
    reactions: { loved: 123, helpful: 559, peaceful: 460 },
    
  },
  {
    id: 51,
    name: "Nadis Breathing",
    instructions:
      "Advanced nostril work with specific energy channel focus. Left and right nadi awareness.",
    primaryUses: ["Energy Balance", "Advanced Practice", "Chakras"],
    category: "Yoga",
    difficulty: "Advanced",
    animationStyle: "infinity",
    reactions: { loved: 332, helpful: 185, peaceful: 596 },
    
  },
  {
    id: 52,
    name: "Chakra Breathing",
    instructions:
      "Breathe while focusing on each chakra from root to crown. Visualize colored light.",
    primaryUses: ["Chakra Activation", "Energy", "Spirituality"],
    category: "Spiritual",
    difficulty: "Advanced",
    animationStyle: "box",
    reactions: { loved: 252, helpful: 242, peaceful: 191 },
    
  },
  {
    id: 53,
    name: "Mantra Breathing",
    instructions:
      "Repeat a mantra while breathing. Inhale with first half, exhale with second half.",
    primaryUses: ["Meditation", "Focus", "Spirituality"],
    category: "Meditation",
    difficulty: "Intermediate",
    animationStyle: "wave",
    reactions: { loved: 104, helpful: 411, peaceful: 482 },
    
  },
  {
    id: 54,
    name: "Conscious Breath Awareness",
    instructions:
      "Simply observe your natural breathing without trying to change it. Build awareness first.",
    primaryUses: ["Mindfulness", "Meditation", "Foundation"],
    category: "Mindfulness",
    difficulty: "Beginner",
    animationStyle: "pulse",
    reactions: { loved: 411, helpful: 459, peaceful: 428 },
    
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

/** ==================== Reaction Icons Component ==================== */

function ReactionIcon({
  type,
  count,
  onReact,
}: {
  type: ReactionType;
  count: number;
  onReact: (type: ReactionType) => void;
}) {
  const icons = {
    loved: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    helpful: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    peaceful: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14.828 14.828a4 4 0 01-5.656 0M17.657 17.657a8 8 0 00-11.314-11.314M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const labels = {
    loved: "Loved",
    helpful: "Helpful",
    peaceful: "Peaceful",
  };

  const colors = {
    loved: "text-red-500 hover:bg-red-50",
    helpful: "text-emerald-500 hover:bg-emerald-50",
    peaceful: "text-blue-500 hover:bg-blue-50",
  };

  return (
    <button
      onClick={() => onReact(type)}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${colors[type]}`}
    >
      {icons[type]}
      <span className="text-xs font-medium">{count}</span>
      <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">{labels[type]}</span>
    </button>
  );
}

function BreathingCard({
  technique,
  isExpanded,
  onToggle,
  onStart,
  onReact,
}: {
  technique: BreathingTechnique;
  isExpanded: boolean;
  onToggle: () => void;
  onStart: () => void;
  onReact: (type: ReactionType) => void;
}) {
  return (
    <div className="bg-white/60 backdrop-blur border border-white/70 rounded-2xl overflow-hidden hover:shadow-lg transition-all animate-fadeIn">
      <button
        onClick={onToggle}
        className="w-full p-6 text-left hover:bg-white/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-black mb-2">
              {technique.name}
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {technique.difficulty && (
                <DifficultyBadge difficulty={technique.difficulty} />
              )}
              {technique.category && (
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                  {technique.category}
                </span>
              )}
            </div>

            {/* Reaction Icons */}
            {technique.reactions && (
              <div className="flex gap-2">
                <ReactionIcon
                  type="loved"
                  count={technique.reactions.loved}
                  onReact={onReact}
                />
                <ReactionIcon
                  type="helpful"
                  count={technique.reactions.helpful}
                  onReact={onReact}
                />
                <ReactionIcon
                  type="peaceful"
                  count={technique.reactions.peaceful}
                  onReact={onReact}
                />
              </div>
            )}
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

          <button
            onClick={onStart}
            className="w-full mt-4 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Start Practice
          </button>
        </div>
      )}
    </div>
  );
}

/** ==================== Breathing Session Screen ==================== */

interface BreathingConfig {
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
}

function extractTimingFromInstructions(instructions: string): BreathingConfig {
  // Default config
  let config: BreathingConfig = { inhale: 4, hold1: 0, exhale: 4, hold2: 0 };

  const numbers = (instructions.match(/\d+/g) || []).map(Number);
  if (numbers.length >= 4) {
    config.inhale = numbers[0];
    config.hold1 = numbers[1] || 0;
    config.exhale = numbers[2];
    config.hold2 = numbers[3] || 0;
  } else if (numbers.length === 3) {
    config.inhale = numbers[0];
    config.hold1 = numbers[1];
    config.exhale = numbers[2];
  } else if (numbers.length === 2) {
    config.inhale = numbers[0];
    config.exhale = numbers[1];
  }

  return config;
}

/** ==================== Breathing Visualizers by Style ==================== */

function BreathingVisualizer({
  phase,
  progress,
  style = "pulse",
}: {
  phase: PhaseKey;
  progress: number;
  style?: string;
}) {
  const scale = (() => {
    if (phase === "inhale") return 0.7 + 0.5 * progress;
    if (phase === "exhale") return 1.2 - 0.5 * progress;
    if (phase === "hold1" || phase === "hold2") return 1.2;
    return 0.7;
  })();

  const opacity = (() => {
    if (phase === "hold1" || phase === "hold2") return 0.9;
    return 0.8 + 0.2 * (1 - Math.abs(progress - 0.5) * 2);
  })();

  // Box visualization
  if (style === "box") {
    return (
      <div className="relative w-80 h-80 flex items-center justify-center">
        <div
          className="absolute border-4 border-emerald-500 transition-all duration-75"
          style={{
            width: `${100 * scale}px`,
            height: `${100 * scale}px`,
            opacity: opacity,
            borderRadius: "8px",
          }}
        />
        <div
          className="absolute bg-emerald-500/20 transition-all duration-75"
          style={{
            width: `${100 * scale}px`,
            height: `${100 * scale}px`,
            opacity: opacity * 0.3,
            borderRadius: "8px",
          }}
        />
      </div>
    );
  }

  // Wave visualization
  if (style === "wave") {
    return (
      <div className="relative w-80 h-80 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border-2 border-emerald-500 transition-all duration-75"
            style={{
              width: `${80 + i * 60 + progress * 40}px`,
              height: `${80 + i * 60 + progress * 40}px`,
              opacity: Math.max(0, 0.6 - i * 0.2),
            }}
          />
        ))}
        <div
          className="absolute rounded-full bg-emerald-500/30 transition-all duration-75"
          style={{
            width: `${120 * scale}px`,
            height: `${120 * scale}px`,
            opacity: opacity,
          }}
        />
      </div>
    );
  }

  // Spiral visualization
  if (style === "spiral") {
    return (
      <div className="relative w-80 h-80 flex items-center justify-center">
        <svg width="320" height="320" viewBox="0 0 320 320" className="absolute">
          <path
            d="M 160 160 Q 160 80, 240 80 Q 240 160, 160 160"
            fill="none"
            stroke="rgb(16, 185, 129)"
            strokeWidth="4"
            opacity={opacity}
            style={{
              strokeDasharray: `${200 * progress} 200`,
              transform: `rotate(${progress * 360}deg)`,
              transformOrigin: "160px 160px",
              transition: "stroke-dasharray 0.1s linear",
            }}
          />
        </svg>
        <div
          className="absolute rounded-full bg-gradient-to-br from-emerald-400 to-teal-400"
          style={{
            width: `${80 * scale}px`,
            height: `${80 * scale}px`,
            opacity: opacity * 0.5,
          }}
        />
      </div>
    );
  }

  // Flower visualization
  if (style === "flower") {
    return (
      <div className="relative w-80 h-80 flex items-center justify-center">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute rounded-full bg-emerald-500 transition-all duration-75"
            style={{
              width: `${50 * scale}px`,
              height: `${50 * scale}px`,
              opacity: opacity,
              transform: `rotate(${(i * 72) + progress * 360}deg) translateY(-80px)`,
            }}
          />
        ))}
        <div
          className="absolute rounded-full bg-emerald-600 transition-all duration-75"
          style={{
            width: `${40 * scale}px`,
            height: `${40 * scale}px`,
            opacity: opacity,
          }}
        />
      </div>
    );
  }

  // Infinity visualization
  if (style === "infinity") {
    return (
      <div className="relative w-80 h-80 flex items-center justify-center">
        <svg width="320" height="200" viewBox="0 0 320 200" className="absolute">
          <path
            d="M 80 100 Q 100 80, 120 100 T 160 100 M 160 100 Q 180 80, 200 100 T 240 100"
            fill="none"
            stroke="rgb(16, 185, 129)"
            strokeWidth="4"
            opacity={opacity}
            style={{
              strokeDasharray: `${400 * progress} 400`,
              transition: "stroke-dasharray 0.1s linear",
            }}
          />
        </svg>
        <div
          className="absolute rounded-full blur-2xl bg-emerald-400"
          style={{
            width: `${150 * scale}px`,
            height: `${75 * scale}px`,
            opacity: opacity * 0.2,
          }}
        />
      </div>
    );
  }

  // Default pulse visualization
  return (
    <div className="relative w-80 h-80 flex items-center justify-center">
      {/* Outer glow circle */}
      <div
        className="absolute rounded-full blur-3xl bg-gradient-to-br from-emerald-400 to-teal-400 transition-all duration-75"
        style={{
          width: `${200 * scale}px`,
          height: `${200 * scale}px`,
          opacity: opacity * 0.3,
        }}
      />

      {/* Main breathing blob */}
      <div
        className="absolute rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-2xl transition-all duration-75"
        style={{
          width: `${160 * scale}px`,
          height: `${160 * scale}px`,
          opacity: opacity,
          filter: `drop-shadow(0 0 ${30 * scale}px rgba(16,185,129,0.5))`,
        }}
      />

      {/* Center text */}
      <div className="absolute text-center z-10">
        <div className="text-white/80 text-sm font-medium uppercase tracking-widest mb-2">
          {phase === "hold1" || phase === "hold2" ? "Hold" : phase}
        </div>
      </div>
    </div>
  );
}

function ActiveBreathingSession({
  technique,
  onComplete,
}: {
  technique: BreathingTechnique;
  onComplete: () => void;
}) {
  const config = extractTimingFromInstructions(technique.instructions);
  const [isRunning, setIsRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [duration, setDuration] = useState(5); // 5 minutes default
  const [phase, setPhase] = useState<PhaseKey>("inhale");
  const [phaseProgress, setPhaseProgress] = useState(0);

  const cycleDuration = config.inhale + config.hold1 + config.exhale + config.hold2;
  const totalDuration = duration * 60; // Convert minutes to seconds

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= totalDuration) {
          setIsRunning(false);
          return totalDuration;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, totalDuration]);

  useEffect(() => {
    const posInCycle = elapsed % cycleDuration;
    let currentPhase: PhaseKey = "inhale";
    let phaseStart = 0;
    let phaseDuration = config.inhale;

    if (posInCycle >= config.inhale) {
      phaseStart = config.inhale;
      currentPhase = "hold1";
      phaseDuration = config.hold1;

      if (posInCycle >= config.inhale + config.hold1) {
        phaseStart = config.inhale + config.hold1;
        currentPhase = "exhale";
        phaseDuration = config.exhale;

        if (
          posInCycle >=
          config.inhale + config.hold1 + config.exhale
        ) {
          phaseStart = config.inhale + config.hold1 + config.exhale;
          currentPhase = "hold2";
          phaseDuration = config.hold2;
        }
      }
    }

    setPhase(currentPhase);
    const progress = phaseDuration > 0 ? (posInCycle - phaseStart) / phaseDuration : 0;
    setPhaseProgress(Math.max(0, Math.min(1, progress)));

    const newCycles = Math.floor(elapsed / cycleDuration);
    setCycles(newCycles);
  }, [elapsed, config, cycleDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isComplete = elapsed >= totalDuration;

  if (isComplete) {
    return (
      <div className="relative min-h-[100svh] w-full overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center z-20">
          <div className="mb-8">
            <svg className="w-24 h-24 mx-auto text-emerald-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-black mb-3">
            Great Work!
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            You completed {cycles} cycles of {technique.name}
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Total time: {formatTime(totalDuration)}
          </p>
          <button
            onClick={onComplete}
            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
          >
            Back to Techniques
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center p-6">
        {/* Header */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
          <button
            onClick={onComplete}
            className="px-4 py-2 rounded-lg bg-white/60 hover:bg-white/80 text-black transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-black">{technique.name}</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>

        {/* Main content */}
        <div className="flex flex-col items-center gap-8 max-w-2xl">
          {/* Visualizer */}
          <BreathingVisualizer
            phase={phase}
            progress={phaseProgress}
            style={technique.animationStyle}
          />

          {/* Phase display */}
          <div className="text-center">
            <div className="text-6xl font-bold text-black mb-2">
              {phase === "hold1" || phase === "hold2" ? "Hold" : phase.charAt(0).toUpperCase() + phase.slice(1)}
            </div>
            <div className="text-2xl font-semibold text-gray-600">
              {Math.ceil((phase === "inhale" ? config.inhale : phase === "exhale" ? config.exhale : phase === "hold1" ? config.hold1 : config.hold2) * (1 - phaseProgress))} seconds
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-12 justify-center bg-white/60 backdrop-blur px-8 py-6 rounded-2xl">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">{cycles}</div>
              <div className="text-sm text-gray-600 mt-1">Cycles</div>
            </div>
            <div className="border-l border-white/40" />
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">{formatTime(elapsed)}</div>
              <div className="text-sm text-gray-600 mt-1">Elapsed</div>
            </div>
            <div className="border-l border-white/40" />
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">{formatTime(totalDuration - elapsed)}</div>
              <div className="text-sm text-gray-600 mt-1">Remaining</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-4">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Resume
                </>
              )}
            </button>
            <button
              onClick={onComplete}
              className="px-8 py-3 bg-white/60 hover:bg-white/80 text-black font-semibold rounded-xl transition-colors"
            >
              Exit
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-6 bg-white/60 backdrop-blur rounded-2xl max-w-lg text-center">
            <h3 className="font-semibold text-black mb-2">Instructions</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {technique.instructions}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BreathingSession() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sessionTechnique, setSessionTechnique] = useState<BreathingTechnique | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "helpful" | "peaceful" | "loved">("name");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize animations and track mouse for parallax effect
  useEffect(() => {
    addGlobalAnimations();

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Filter techniques
  let filteredTechniques = breathingTechniques.filter((tech) => {
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

  // Sort techniques
  filteredTechniques = [...filteredTechniques].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (!a.reactions || !b.reactions) return 0;
    if (sortBy === "helpful") return b.reactions.helpful - a.reactions.helpful;
    if (sortBy === "peaceful") return b.reactions.peaceful - a.reactions.peaceful;
    if (sortBy === "loved") return b.reactions.loved - a.reactions.loved;
    return 0;
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

  const handleReaction = (techniqueId: number, reactionType: ReactionType) => {
    // This would integrate with backend in production
    console.log(`User reacted to technique ${techniqueId} with: ${reactionType}`);
  };

  // Show active session if a technique has been selected
  if (sessionTechnique) {
    return (
      <ActiveBreathingSession
        technique={sessionTechnique}
        onComplete={() => setSessionTechnique(null)}
      />
    );
  }

  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-emerald-50 text-neutral-900">
      {/* Grid background animation */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(16, 185, 129, .1) 25%, rgba(16, 185, 129, .1) 26%, transparent 27%, transparent 74%, rgba(16, 185, 129, .1) 75%, rgba(16, 185, 129, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(16, 185, 129, .1) 25%, rgba(16, 185, 129, .1) 26%, transparent 27%, transparent 74%, rgba(16, 185, 129, .1) 75%, rgba(16, 185, 129, .1) 76%, transparent 77%, transparent)`,
          backgroundSize: "50px 50px",
          animation: "slideGrid 20s linear infinite",
        }}
      />

      {/* Decorative background with parallax */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl transition-transform duration-300"
          style={typeof window !== "undefined" ? {
            transform: `translate(${(mousePos.x / window.innerWidth) * 30}px, ${(mousePos.y / window.innerHeight) * 30}px)`,
          } : undefined}
        />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl transition-transform duration-300"
          style={typeof window !== "undefined" ? {
            transform: `translate(${-(mousePos.x / window.innerWidth) * 30}px, ${-(mousePos.y / window.innerHeight) * 30}px)`,
          } : undefined}
        />
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
          {/* Sort Options */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSortBy("name")}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium transition-all",
                sortBy === "name"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "bg-white/60 backdrop-blur border border-white/70 text-black hover:bg-white/80"
              )}
            >
              Name
            </button>
            <button
              onClick={() => setSortBy("helpful")}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium transition-all",
                sortBy === "helpful"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "bg-white/60 backdrop-blur border border-white/70 text-black hover:bg-white/80"
              )}
            >
              Most Helpful
            </button>
            <button
              onClick={() => setSortBy("peaceful")}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium transition-all",
                sortBy === "peaceful"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "bg-white/60 backdrop-blur border border-white/70 text-black hover:bg-white/80"
              )}
            >
              Most Peaceful
            </button>
            <button
              onClick={() => setSortBy("loved")}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium transition-all",
                sortBy === "loved"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "bg-white/60 backdrop-blur border border-white/70 text-black hover:bg-white/80"
              )}
            >
              Most Loved
            </button>
          </div>

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
                onStart={() => setSessionTechnique(technique)}
                onReact={(reactionType) => handleReaction(technique.id, reactionType)}
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
