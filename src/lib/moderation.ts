// @ts-ignore
import { Filter } from 'bad-words';


// Custom list of high-risk keywords (terrorism, violence, illegal)
// This is a basic list and should be expanded or replaced with an AI API for better accuracy.
const HIGH_RISK_KEYWORDS = [
  "bomb", "kill", "suicide", "murder", "terrorist", "terrorism", "isis", "al-qaeda", "jihad",
  "assassinate", "explosive", "weapon", "gun", "shoot", "attack", "die", "death to",
  "nazi", "hitler", "racist", "sex", "porn", "xxx", "fuck", "shit", "bitch", "bastard"
];

const filter = new Filter();
// Add custom keywords to the filter
filter.addWords(...HIGH_RISK_KEYWORDS);

export type ModerationResult = {
  flagged: boolean;
  reason?: string;
};


// Wrapper to match expected interface in legacy route
export function moderateContent(content: string, title?: string): { isAllowed: boolean; violations: string[]; severity: string } {
  const textToCheck = (title + " " + content).trim();
  const result = analyzeContent(textToCheck);

  if (result.flagged) {
    return {
      isAllowed: false,
      violations: [result.reason || "Content Violation"],
      severity: "HIGH"
    };
  }

  return {
    isAllowed: true,
    violations: [],
    severity: "LOW"
  };
}

export function analyzeContent(text: string): ModerationResult {
  if (!text) return { flagged: false };

  // Check for profanity and high-risk words using bad-words library
  if (filter.isProfane(text)) {
    // Determine if it was a high-risk word or just profanity
    const words = text.split(/\s+/);
    const riskWord = words.find(w => HIGH_RISK_KEYWORDS.some(k => w.toLowerCase().includes(k)));

    if (riskWord) {
      return { flagged: true, reason: "Contains potentially dangerous or illegal content." };
    }

    return { flagged: true, reason: "Contains inappropriate language." };
  }

  // Fallback simple inclusion check for phrases that might not be tokenized correctly
  const lowerText = text.toLowerCase();
  for (const keyword of HIGH_RISK_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return { flagged: true, reason: "Contains potentially dangerous or illegal content." };
    }
  }

  return { flagged: false };
}

