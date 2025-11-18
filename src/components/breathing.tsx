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
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px) translateX(0px); }
      50% { transform: translateY(-20px) translateX(10px); }
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.6; }
    }
    @keyframes dotGrow {
      0% {
        r: 2px;
        opacity: 0.8;
        filter: blur(0px);
      }
      50% {
        opacity: 1;
      }
      100% {
        r: 8px;
        opacity: 0;
        filter: blur(1px);
      }
    }
    @keyframes dotGlitch {
      0%, 100% {
        transform: translate(0, 0);
      }
      20% {
        transform: translate(-2px, 2px);
      }
      40% {
        transform: translate(2px, -2px);
      }
      60% {
        transform: translate(-1px, 1px);
      }
      80% {
        transform: translate(1px, -1px);
      }
    }
    @keyframes chainReaction {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      100% {
        transform: scale(2);
        opacity: 0;
      }
    }
    .animate-fadeIn {
      animation: fadeIn 0.5s ease-out;
    }
    .animate-float {
      animation: float 6s ease-in-out infinite;
    }
    .animate-pulse-glow {
      animation: pulse-glow 4s ease-in-out infinite;
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
    likes: number;
    dislikes: number;
    opinions: string[];
  };
};

type PhaseKey = "inhale" | "hold1" | "exhale" | "hold2";
type ReactionType = "like" | "dislike" | "opinion";

type UserReaction = {
  techniqueId: number;
  type: "like" | "dislike" | null;
};

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
    reactions: { likes: 342, dislikes: 521, opinions: [] },
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
    reactions: { likes: 456, dislikes: 623, opinions: [] },
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
    reactions: { likes: 234, dislikes: 456, opinions: [] },
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
    reactions: { likes: 173, dislikes: 354, opinions: [] },
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
    reactions: { likes: 381, dislikes: 379, opinions: [] },
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
    reactions: { likes: 283, dislikes: 672, opinions: [] },
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
    reactions: { likes: 259, dislikes: 674, opinions: [] },
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
    reactions: { likes: 282, dislikes: 649, opinions: [] },
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
    reactions: { likes: 212, dislikes: 381, opinions: [] },
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
    reactions: { likes: 433, dislikes: 389, opinions: [] },
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
    reactions: { likes: 377, dislikes: 440, opinions: [] },
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
    reactions: { likes: 302, dislikes: 488, opinions: [] },
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
    reactions: { likes: 525, dislikes: 630, opinions: [] },
    
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
    reactions: { likes: 180, dislikes: 365, opinions: [] },
    
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
    reactions: { likes: 265, dislikes: 605, opinions: [] },
    
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
    reactions: { likes: 109, dislikes: 506, opinions: [] },
    
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
    reactions: { likes: 303, dislikes: 468, opinions: [] },
    
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
    reactions: { likes: 188, dislikes: 292, opinions: [] },
    
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
    reactions: { likes: 287, dislikes: 246, opinions: [] },
    
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
    reactions: { likes: 453, dislikes: 324, opinions: [] },
    
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
    reactions: { likes: 396, dislikes: 254, opinions: [] },
    
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
    reactions: { likes: 519, dislikes: 610, opinions: [] },
    
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
    reactions: { likes: 481, dislikes: 640, opinions: [] },
    
  },
  {
    id: 24,
    name: "Triangle Breathing",
    instructions:
      "Inhale for 4 counts, hold for 4 counts, exhale for 4 counts. Form a mental triangle.",
    primaryUses: ["Focus", "Calm", "WREX"],
    category: "Visualization",
    difficulty: "Beginner",
    animationStyle: "pulse",
    reactions: { likes: 225, dislikes: 442, opinions: [] },

  },
  {
    id: 25,
    name: "5-4-3-2-1 Sensory Breathing",
    instructions:
      "Breathe while focusing on 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.",
    primaryUses: ["Anxiety", "Presence", "WREX"],
    category: "Mindfulness",
    difficulty: "Intermediate",
    animationStyle: "spiral",
    reactions: { likes: 557, dislikes: 401, opinions: [] },

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
    reactions: { likes: 475, dislikes: 423, opinions: [] },
    
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
    reactions: { likes: 172, dislikes: 411, opinions: [] },
    
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
    reactions: { likes: 196, dislikes: 697, opinions: [] },
    
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
    reactions: { likes: 544, dislikes: 199, opinions: [] },
    
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
    reactions: { likes: 431, dislikes: 380, opinions: [] },
    
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
    reactions: { likes: 274, dislikes: 681, opinions: [] },
    
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
    reactions: { likes: 457, dislikes: 544, opinions: [] },
    
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
    reactions: { likes: 260, dislikes: 638, opinions: [] },
    
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
    reactions: { likes: 214, dislikes: 484, opinions: [] },
    
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
    reactions: { likes: 364, dislikes: 440, opinions: [] },
    
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
    reactions: { likes: 392, dislikes: 154, opinions: [] },
    
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
    reactions: { likes: 463, dislikes: 258, opinions: [] },
    
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
    reactions: { likes: 236, dislikes: 400, opinions: [] },
    
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
    reactions: { likes: 457, dislikes: 587, opinions: [] },
    
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
    reactions: { likes: 265, dislikes: 251, opinions: [] },
    
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
    reactions: { likes: 150, dislikes: 743, opinions: [] },
    
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
    reactions: { likes: 137, dislikes: 579, opinions: [] },
    
  },
  {
    id: 43,
    name: "WREX Breath",
    instructions:
      "Feel feet on ground. Breathe deeply while visualizing roots extending from body into earth.",
    primaryUses: ["WREX", "Anxiety", "Presence"],
    category: "Mindfulness",
    difficulty: "Beginner",
    animationStyle: "spiral",
    reactions: { likes: 338, dislikes: 482, opinions: [] },

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
    reactions: { likes: 553, dislikes: 596, opinions: [] },
    
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
    reactions: { likes: 225, dislikes: 446, opinions: [] },
    
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
    reactions: { likes: 577, dislikes: 215, opinions: [] },
    
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
    reactions: { likes: 324, dislikes: 362, opinions: [] },
    
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
    reactions: { likes: 120, dislikes: 542, opinions: [] },
    
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
    reactions: { likes: 378, dislikes: 440, opinions: [] },
    
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
    reactions: { likes: 123, dislikes: 559, opinions: [] },
    
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
    reactions: { likes: 332, dislikes: 185, opinions: [] },
    
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
    reactions: { likes: 252, dislikes: 242, opinions: [] },
    
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
    reactions: { likes: 104, dislikes: 411, opinions: [] },
    
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
    reactions: { likes: 411, dislikes: 459, opinions: [] },
    
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
  techniqueId,
  likes,
  dislikes,
  userLiked,
  userDisliked,
  onLike,
  onDislike,
  onOpenOpinions,
}: {
  techniqueId: number;
  likes: number;
  dislikes: number;
  userLiked: boolean;
  userDisliked: boolean;
  onLike: () => void;
  onDislike: () => void;
  onOpenOpinions: () => void;
}) {
  return (
    <div className="flex gap-2">
      {/* Like Button */}
      <button
        onClick={onLike}
        className={`cursor-target flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
          userLiked
            ? "bg-emerald-500 text-white shadow-sm"
            : "bg-white/50 hover:bg-white/80 text-gray-700"
        }`}
      >
        <svg
          className="w-4 h-4"
          fill={userLiked ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 10h4.764a2 2 0 011.789 2.894l-3.646 7.23a2 2 0 01-1.789 1.106H9m0 0H7a2 2 0 01-2-2v-6a2 2 0 012-2h2.4c1.075 0 2.073.86 2.236 1.954m0 0h.02"
          />
        </svg>
        <span className="text-xs font-medium">{likes}</span>
      </button>

      {/* Dislike Button */}
      <button
        onClick={onDislike}
        className={`cursor-target flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
          userDisliked
            ? "bg-red-500 text-white shadow-sm"
            : "bg-white/50 hover:bg-white/80 text-gray-700"
        }`}
      >
        <svg
          className="w-4 h-4"
          fill={userDisliked ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14H5.236a2 2 0 01-1.789-2.894l3.646-7.23a2 2 0 011.789-1.106H15m0 0h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.4c-1.075 0-2.073-.86-2.236-1.954m0 0h-.02"
          />
        </svg>
        <span className="text-xs font-medium">{dislikes}</span>
      </button>

      {/* Opinion Button */}
      <button
        onClick={onOpenOpinions}
        className="cursor-target flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 text-gray-700 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="text-xs font-medium">Opinion</span>
      </button>
    </div>
  );
}

/** ==================== Duplicating Dots Background Animation ==================== */

function DuplicatingDotsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    // Pastel color palette
    const pastelColors = [
      "#FFB3BA", // pastel pink
      "#FFCCCB", // pastel light pink
      "#FFE0B2", // pastel peach
      "#FFFACD", // pastel pale yellow
      "#B4E7FF", // pastel light blue
      "#C1FFF0", // pastel mint
      "#E0BBE4", // pastel lavender
      "#D4F1F4", // pastel cyan
      "#F8B4D6", // pastel rose
      "#FFFEC1", // pastel yellow
    ];

    interface Particle {
      x: number;
      y: number;
      size: number;
      maxSize: number;
      age: number;
      duration: number;
      color: string;
      vx: number;
      vy: number;
      glitchAmount: number;
    }

    const particles: Particle[] = [];

    // Create initial seed particles
    const createInitialParticles = () => {
      const particleCount = 8;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 2,
          maxSize: 2 + Math.random() * 8,
          age: 0,
          duration: 2000 + Math.random() * 2000,
          color: pastelColors[Math.floor(Math.random() * pastelColors.length)],
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          glitchAmount: 0,
        });
      }
    };

    createInitialParticles();

    let lastSpawnTime = Date.now();

    const animate = () => {
      // Clear canvas with slight fade
      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();

      // Spawn new particles at intervals (chain reaction effect)
      if (now - lastSpawnTime > 800) {
        lastSpawnTime = now;
        const randomParticle = particles[Math.floor(Math.random() * particles.length)];
        if (randomParticle) {
          // Create duplicate particles around the parent
          for (let i = 0; i < 2; i++) {
            particles.push({
              x: randomParticle.x + (Math.random() - 0.5) * 30,
              y: randomParticle.y + (Math.random() - 0.5) * 30,
              size: 2,
              maxSize: 2 + Math.random() * 8,
              age: 0,
              duration: 2000 + Math.random() * 2000,
              color: pastelColors[Math.floor(Math.random() * pastelColors.length)],
              vx: (Math.random() - 0.5) * 0.8,
              vy: (Math.random() - 0.5) * 0.8,
              glitchAmount: 0,
            });
          }
        }

        // Limit particle count
        if (particles.length > 150) {
          particles.splice(0, 5);
        }
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += 16; // Approximate delta time

        // Calculate progress (0 to 1)
        const progress = p.age / p.duration;

        // Size animation
        p.size = p.maxSize * Math.sin(progress * Math.PI);

        // Glitch effect
        p.glitchAmount = Math.sin(p.age * 0.01) * 2;
        if (Math.random() < 0.05) {
          p.glitchAmount = (Math.random() - 0.5) * 6;
        }

        // Movement
        p.x += p.vx;
        p.y += p.vy;

        // Slow down over time
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Opacity based on progress
        const opacity = Math.max(0, 1 - progress);

        // Draw particle
        ctx.fillStyle = p.color;
        ctx.globalAlpha = opacity * 0.6;
        ctx.beginPath();
        ctx.arc(p.x + p.glitchAmount, p.y + p.glitchAmount, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw glow/halo
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = opacity * 0.2;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x + p.glitchAmount, p.y + p.glitchAmount, p.size + 2, 0, Math.PI * 2);
        ctx.stroke();

        // Remove dead particles
        if (progress >= 1) {
          particles.splice(i, 1);
        }
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", setCanvasSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
}

/** ==================== Opinion Modal Component ==================== */

function OpinionModal({
  techniqueName,
  opinions,
  onClose,
}: {
  techniqueName: string;
  opinions: string[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl animate-fadeIn">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-black">
            Opinions on "{techniqueName}"
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {opinions.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No opinions shared yet. Be the first to share your thoughts!
            </p>
          ) : (
            opinions.map((opinion, idx) => (
              <div
                key={idx}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="text-gray-800 text-sm leading-relaxed">"{opinion}"</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function BreathingCard({
  technique,
  isExpanded,
  onToggle,
  onStart,
  userLiked,
  userDisliked,
  onLike,
  onDislike,
  onOpenOpinions,
}: {
  technique: BreathingTechnique;
  isExpanded: boolean;
  onToggle: () => void;
  onStart: () => void;
  userLiked: boolean;
  userDisliked: boolean;
  onLike: () => void;
  onDislike: () => void;
  onOpenOpinions: () => void;
}) {
  return (
    <div className="bg-white/70 backdrop-blur border border-white/50 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 animate-fadeIn group">
      <button
        onClick={onToggle}
        className="cursor-target w-full px-6 py-5 text-left hover:bg-white/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {technique.name}
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {technique.difficulty && (
                <DifficultyBadge difficulty={technique.difficulty} />
              )}
              {technique.category && (
                <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full font-medium">
                  {technique.category}
                </span>
              )}
            </div>

            {/* Reaction Icons */}
            {technique.reactions && (
              <ReactionIcon
                techniqueId={technique.id}
                likes={technique.reactions.likes}
                dislikes={technique.reactions.dislikes}
                userLiked={userLiked}
                userDisliked={userDisliked}
                onLike={onLike}
                onDislike={onDislike}
                onOpenOpinions={onOpenOpinions}
              />
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
        <div className="border-t border-white/40 px-6 py-6 bg-white/50 space-y-5">
          <div>
            <h4 className="font-semibold text-sm text-gray-900 mb-2.5 uppercase tracking-wide">Instructions</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {technique.instructions}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-gray-900 mb-2.5 uppercase tracking-wide">Benefits</h4>
            <div className="flex flex-wrap gap-2">
              {technique.primaryUses.map((use, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-full font-medium"
                >
                  {use}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={onStart}
            className="cursor-target w-full mt-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
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
            className="cursor-target px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
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
            className="cursor-target px-4 py-2 rounded-lg bg-white/60 hover:bg-white/80 text-black transition-colors"
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
              className="cursor-target px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
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
              className="cursor-target px-8 py-3 bg-white/60 hover:bg-white/80 text-black font-semibold rounded-xl transition-colors"
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
  const [sortBy, setSortBy] = useState<"name" | "likes" | "dislikes">("name");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [userReactions, setUserReactions] = useState<Map<number, "like" | "dislike" | null>>(new Map());
  const [selectedOpinionTechnique, setSelectedOpinionTechnique] = useState<BreathingTechnique | null>(null);
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
    if (sortBy === "likes") return b.reactions.likes - a.reactions.likes;
    if (sortBy === "dislikes") return b.reactions.dislikes - a.reactions.dislikes;
    return 0;
  });

  // Get unique categories
  const categories = Array.from(
    new Set(breathingTechniques.map((t) => t.category).filter((c): c is string => Boolean(c)))
  );

  const scrollHorizontally = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amt = 200;
    scrollRef.current.scrollBy({
      left: dir === "right" ? amt : -amt,
      behavior: "smooth",
    });
  };

  const handleLike = (techniqueId: number) => {
    setUserReactions((prev) => {
      const newReactions = new Map(prev);
      const currentReaction = newReactions.get(techniqueId);

      if (currentReaction === "like") {
        // Toggle off - remove the like
        newReactions.delete(techniqueId);
      } else {
        // Set to like
        newReactions.set(techniqueId, "like");
      }
      return newReactions;
    });
  };

  const handleDislike = (techniqueId: number) => {
    setUserReactions((prev) => {
      const newReactions = new Map(prev);
      const currentReaction = newReactions.get(techniqueId);

      if (currentReaction === "dislike") {
        // Toggle off - remove the dislike
        newReactions.delete(techniqueId);
      } else {
        // Set to dislike
        newReactions.set(techniqueId, "dislike");
      }
      return newReactions;
    });
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
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 text-neutral-900">
      {/* Duplicating Dots Canvas Animation */}
      <DuplicatingDotsBackground />

      {/* Decorative background with cursor parallax - pastel blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top-right blob - follows cursor - pastel pink */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl transition-transform duration-500"
          style={{
            background: "radial-gradient(circle, rgba(255, 179, 186, 0.25), transparent 70%)",
            transform: typeof window !== "undefined" ? `translate(${(mousePos.x / window.innerWidth) * 50}px, ${(mousePos.y / window.innerHeight) * 50}px)` : undefined,
          }}
        />
        {/* Bottom-left blob - inverse parallax - pastel blue */}
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl transition-transform duration-500"
          style={{
            background: "radial-gradient(circle, rgba(180, 231, 255, 0.25), transparent 70%)",
            transform: typeof window !== "undefined" ? `translate(${-(mousePos.x / window.innerWidth) * 50}px, ${-(mousePos.y / window.innerHeight) * 50}px)` : undefined,
          }}
        />
        {/* Center blob - subtle movement - pastel lavender */}
        <div
          className="absolute top-1/2 left-1/2 w-72 h-72 rounded-full blur-3xl transition-transform duration-700"
          style={{
            background: "radial-gradient(circle, rgba(224, 187, 228, 0.15), transparent 70%)",
            transform: typeof window !== "undefined" ? `translate(-50%, -50%) translate(${(mousePos.x / window.innerWidth) * 20}px, ${(mousePos.y / window.innerHeight) * 20}px)` : undefined,
          }}
        />
      </div>

      {/* Fade overlay for depth */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-white/10" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-black mb-4">
            Breathing Practices
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl font-light">
            Discover 54 breathing techniques designed for any need. From foundational practices to advanced yoga techniques.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-10 space-y-5">
          {/* Sort Options */}
          <div className="flex gap-3 flex-wrap items-center">
            <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Sort:</span>
            <button
              onClick={() => setSortBy("name")}
              className={clsx(
                "cursor-target px-5 py-2.5 rounded-full font-medium transition-all text-sm",
                sortBy === "name"
                  ? "bg-emerald-500 text-white shadow-md hover:shadow-lg"
                  : "bg-white/70 backdrop-blur border border-white/50 text-black hover:bg-white/80"
              )}
            >
              Name
            </button>
            <button
              onClick={() => setSortBy("likes")}
              className={clsx(
                "cursor-target px-5 py-2.5 rounded-full font-medium transition-all text-sm",
                sortBy === "likes"
                  ? "bg-emerald-500 text-white shadow-md hover:shadow-lg"
                  : "bg-white/70 backdrop-blur border border-white/50 text-black hover:bg-white/80"
              )}
            >
              Most Liked
            </button>
            <button
              onClick={() => setSortBy("dislikes")}
              className={clsx(
                "cursor-target px-5 py-2.5 rounded-full font-medium transition-all text-sm",
                sortBy === "dislikes"
                  ? "bg-emerald-500 text-white shadow-md hover:shadow-lg"
                  : "bg-white/70 backdrop-blur border border-white/50 text-black hover:bg-white/80"
              )}
            >
              Most Disliked
            </button>
          </div>

          {/* Search Input */}
          <div className="relative max-w-2xl">
            <input
              type="text"
              placeholder="Search by name, benefit, or technique..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-3.5 bg-white/70 backdrop-blur border border-white/50 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-black placeholder-gray-600 transition-all"
            />
            <svg
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
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
            <div className="mb-3 flex items-center">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Category:</span>
            </div>
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollBehavior: "smooth" }}
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className={clsx(
                  "cursor-target snap-center flex-shrink-0 px-6 py-2.5 rounded-full font-medium transition-all whitespace-nowrap text-sm",
                  selectedCategory === null
                    ? "bg-emerald-500 text-white shadow-md hover:shadow-lg"
                    : "bg-white/70 backdrop-blur border border-white/50 text-black hover:bg-white/80"
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
                      "cursor-target snap-center flex-shrink-0 px-6 py-2.5 rounded-full font-medium transition-all whitespace-nowrap text-sm",
                      selectedCategory === cat
                        ? "bg-emerald-500 text-white shadow-md hover:shadow-lg"
                        : "bg-white/70 backdrop-blur border border-white/50 text-black hover:bg-white/80"
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
              className="cursor-target absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/70 backdrop-blur border border-white/50 hover:bg-white"
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
              className="cursor-target absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/70 backdrop-blur border border-white/50 hover:bg-white"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 mb-12">
            {filteredTechniques.map((technique) => (
              <BreathingCard
                key={technique.id}
                technique={technique}
                isExpanded={expandedId === technique.id}
                onToggle={() =>
                  setExpandedId(expandedId === technique.id ? null : technique.id)
                }
                onStart={() => setSessionTechnique(technique)}
                userLiked={userReactions.get(technique.id) === "like"}
                userDisliked={userReactions.get(technique.id) === "dislike"}
                onLike={() => handleLike(technique.id)}
                onDislike={() => handleDislike(technique.id)}
                onOpenOpinions={() => setSelectedOpinionTechnique(technique)}
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

        {/* Opinion Modal */}
        {selectedOpinionTechnique && selectedOpinionTechnique.reactions && (
          <OpinionModal
            techniqueName={selectedOpinionTechnique.name}
            opinions={selectedOpinionTechnique.reactions.opinions}
            onClose={() => setSelectedOpinionTechnique(null)}
          />
        )}
      </div>
    </div>
  );
}
