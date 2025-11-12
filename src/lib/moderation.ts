// src/lib/moderation.ts
export interface ModerationResult {
  isAllowed: boolean;
  violations: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
}

// Keywords and patterns for content moderation
const PROHIBITED_KEYWORDS = {
  illegal: [
    'drug', 'cocaine', 'heroin', 'meth', 'fentanyl',
    'illegal weapon', 'explosive', 'bomb making',
    'counterfeit', 'money laundering', 'hacking',
    'credit card fraud', 'identity theft', 'ransomware'
  ],
  terrorism: [
    'terrorist', 'terrorism', 'al-qaeda', 'isis', 'alqaeda',
    'extremist', 'jihad', 'bomb attack', 'mass casualty',
    'radicalize', 'suicide attack', 'militant group'
  ],
  violence: [
    'kill', 'murder', 'assault', 'rape', 'torture',
    'beating', 'stab', 'shoot', 'violence porn',
    'mutilation', 'dismember'
  ],
  hate: [
    'racial slur', 'ethnic hatred', 'genocide',
    'race war', 'ethnic cleansing', 'apartheid',
    'white supremacy', 'nazi', 'swastika'
  ],
  exploitation: [
    'child abuse', 'child exploitation', 'child sexual',
    'child porn', 'pedophile', 'human trafficking',
    'sex trafficking', 'exploitation'
  ]
};

const VIOLATION_CATEGORIES = {
  illegal: { severity: 'high' as const, description: 'Illegal activity content' },
  terrorism: { severity: 'high' as const, description: 'Terrorism-related content' },
  violence: { severity: 'high' as const, description: 'Violent content' },
  hate: { severity: 'high' as const, description: 'Hate speech or discrimination' },
  exploitation: { severity: 'high' as const, description: 'Exploitation or abuse content' },
};

export function moderateContent(content: string, title?: string): ModerationResult {
  const violations: string[] = [];
  let maxSeverity: 'none' | 'low' | 'medium' | 'high' = 'none';

  const textToCheck = `${title || ''} ${content}`.toLowerCase().trim();

  if (!textToCheck || textToCheck.length === 0) {
    return { isAllowed: true, violations: [], severity: 'none' };
  }

  // Check for empty or spam content
  if (textToCheck.length < 3) {
    violations.push('Content is too short');
    maxSeverity = 'low';
  }

  // Check for repetitive characters (spam)
  if (/(.)\1{9,}/.test(textToCheck)) {
    violations.push('Content appears to be spam');
    maxSeverity = 'medium';
  }

  // Check against prohibited keywords
  for (const [category, keywords] of Object.entries(PROHIBITED_KEYWORDS)) {
    for (const keyword of keywords) {
      // Use word boundaries for more accurate matching
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(textToCheck)) {
        const categoryInfo = VIOLATION_CATEGORIES[category as keyof typeof VIOLATION_CATEGORIES];
        const violation = categoryInfo.description;
        if (!violations.includes(violation)) {
          violations.push(violation);
        }
        if (categoryInfo.severity === 'high') {
          maxSeverity = 'high';
        } else if (categoryInfo.severity === 'medium' && maxSeverity !== 'high') {
          maxSeverity = 'medium';
        }
      }
    }
  }

  // Check for excessive capitalization (potential aggression)
  const capitalRatio = (textToCheck.match(/[A-Z]/g) || []).length / textToCheck.length;
  if (capitalRatio > 0.5 && textToCheck.length > 20) {
    violations.push('Content appears to use excessive capitalization');
    if (maxSeverity === 'none') maxSeverity = 'low';
  }

  // Check for excessive punctuation
  if (/[!?]{3,}/.test(textToCheck)) {
    violations.push('Content appears to use excessive punctuation');
    if (maxSeverity === 'none') maxSeverity = 'low';
  }

  return {
    isAllowed: maxSeverity !== 'high',
    violations,
    severity: maxSeverity,
  };
}

export function getViolationMessage(result: ModerationResult): string {
  if (result.isAllowed) {
    return '';
  }

  const violationList = result.violations.join('\n• ');
  return `Content violates community guidelines:\n• ${violationList}`;
}
