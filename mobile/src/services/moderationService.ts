/**
 * Content Moderation Service
 * Handles content screening, keyword detection, and violation flagging
 */

import { FlaggedContent, ViolationType, ModerationStatus, ContentType, ViolationKeyword } from '../types/moderation';
import { Product } from '../types/product';

interface ModerationResult {
  isFlagged: boolean;
  violations: ViolationType[];
  confidence: number; // 0-1
  details: {
    type: ViolationType;
    matchedKeywords?: string[];
    confidence: number;
    explanation: string;
  }[];
  shouldAutoRemove: boolean;
  requiresHumanReview: boolean;
}

class ModerationService {
  private prohibitedKeywords: Map<ViolationType, Set<string>>;
  private regexPatterns: Map<ViolationType, RegExp>;

  constructor() {
    this.prohibitedKeywords = new Map();
    this.regexPatterns = new Map();
    this.initializeKeywords();
  }

  /**
   * Initialize prohibited keywords database
   */
  private initializeKeywords(): void {
    // Drug-related keywords
    this.prohibitedKeywords.set('drug_related', new Set([
      // English
      'cocaine', 'heroin', 'meth', 'methamphetamine', 'lsd', 'ecstasy', 'mdma',
      'cannabis', 'marijuana', 'weed', 'hash', 'bhang', 'ganja',
      'opium', 'morphine', 'codeine', 'fentanyl',
      'buy drugs', 'sell drugs', 'drug dealer', 'pusher',
      // Hindi
      'नशा', 'ड्रग्स', 'नारकोटिक्स', 'गांजा', 'भांग', 'अफीम',
    ]));

    // Weapons and violence
    this.prohibitedKeywords.set('weapons_or_violence', new Set([
      // English
      'gun', 'rifle', 'pistol', 'revolver', 'ak47', 'sniper', 'shotgun', 'handgun',
      'bomb', 'explosive', 'grenade', 'landmine', 'ied',
      'knife', 'sword', 'axe', 'blade', 'dagger',
      'buy gun', 'sell gun', 'illegal weapon', 'untraceable gun',
      'kill', 'murder', 'assassinate', 'massacre',
      // Hindi
      'बंदूक', 'तोप', 'बम', 'हथियार', 'खंजर', 'हत्या', 'मार',
    ]));

    // Human trafficking
    this.prohibitedKeywords.set('human_trafficking', new Set([
      // English
      'human trafficking', 'sex trafficking', 'forced labor', 'slave', 'slavery',
      'child labor', 'child exploitation', 'underage', 'minor trafficking',
      'escort service', 'massage parlor trafficking',
      'buy person', 'sell person', 'human trade',
      // Hindi
      'मानव तस्करी', 'बाल मजदूरी', 'दासता', 'जबरन श्रम',
    ]));

    // Adult/NSFW content
    this.prohibitedKeywords.set('adult_content', new Set([
      // English - explicit
      'pornography', 'porn', 'xxx', 'explicit sexual', 'sex video', 'adult cam',
      'nude', 'naked', 'strip', 'escort', 'prostitute', 'sex work',
      'incest', 'bestiality', 'pedophilia', 'child porn', 'cp',
      // Hindi
      'अश्लील', 'नंगा', 'यौन', 'वेश्या', 'सेक्स',
    ]));

    // Illegal activities
    this.prohibitedKeywords.set('illegal_activity', new Set([
      // English
      'counterfeit', 'fake document', 'forged', 'fraud', 'scam',
      'money laundering', 'hacking', 'stolen', 'robbery', 'theft',
      'terrorism', 'terrorist', 'extremist',
      'illegal weapon', 'buy stolen', 'sell stolen',
      // Hindi
      'नकली', 'जाली', 'चोरी', 'धोखाधड़ी', 'आतंकवाद',
    ]));

    // Hate speech
    this.prohibitedKeywords.set('hate_speech', new Set([
      'nigger', 'faggot', 'kike', 'spic', 'chink', 'raghead',
      'kill all', 'genocide', 'ethnic cleansing',
      // Language-specific derogatory terms
    ]));

    // Misinformation
    this.prohibitedKeywords.set('misinformation', new Set([
      'covid hoax', 'vaccine poison', 'chemtrails control mind',
      'flat earth', 'moonlanding fake',
      'miracle cure', 'cure cancer instantly', 'cure covid',
    ]));

    // Spam keywords
    this.prohibitedKeywords.set('spam', new Set([
      'click here now', 'limited offer', 'act now', 'hurry up',
      'free money', 'make money fast', 'get rich quick',
      'pyramid scheme', 'mlm recruitment',
    ]));
  }

  /**
   * Scan text content for violations
   */
  async scanText(text: string, contentType: ContentType): Promise<ModerationResult> {
    const textLower = text.toLowerCase();
    const violations: ViolationType[] = [];
    const details: any[] = [];
    let totalConfidence = 0;
    let matchCount = 0;

    // Check each violation type
    for (const [violationType, keywords] of this.prohibitedKeywords.entries()) {
      // Skip certain types for specific content
      if (contentType === 'product_title' && violationType === 'misinformation') {
        continue; // Allow product titles more freedom
      }

      const matches = this.findKeywordMatches(textLower, keywords);
      if (matches.length > 0) {
        violations.push(violationType);
        const confidence = Math.min(0.95, matches.length * 0.3); // Higher confidence with more matches

        details.push({
          type: violationType,
          matchedKeywords: matches,
          confidence,
          explanation: `Found ${matches.length} prohibited keyword(s) for ${violationType}`,
        });

        totalConfidence += confidence;
        matchCount++;
      }
    }

    const averageConfidence = matchCount > 0 ? totalConfidence / matchCount : 0;

    return {
      isFlagged: violations.length > 0,
      violations,
      confidence: Math.min(1, averageConfidence),
      details,
      shouldAutoRemove: averageConfidence > 0.8, // High confidence triggers auto-removal
      requiresHumanReview: averageConfidence > 0.5 && averageConfidence <= 0.8,
    };
  }

  /**
   * Scan product for violations
   */
  async scanProduct(product: Product): Promise<ModerationResult> {
    const scanResults: ModerationResult[] = [];

    // Scan title
    const titleScan = await this.scanText(product.title, 'product_title');
    scanResults.push(titleScan);

    // Scan description
    const descriptionScan = await this.scanText(product.description, 'product_description');
    scanResults.push(descriptionScan);

    // Scan tags
    if ('tags' in product && product.tags) {
      const tagsScan = await this.scanText(product.tags.join(' '), 'product_title');
      scanResults.push(tagsScan);
    }

    // Combine results
    return this.combineResults(scanResults);
  }

  /**
   * Scan user profile
   */
  async scanUserProfile(name: string, bio: string, interests?: string[]): Promise<ModerationResult> {
    const scanResults: ModerationResult[] = [];

    if (name) {
      scanResults.push(await this.scanText(name, 'user_profile'));
    }

    if (bio) {
      scanResults.push(await this.scanText(bio, 'user_profile'));
    }

    if (interests && interests.length > 0) {
      scanResults.push(await this.scanText(interests.join(' '), 'user_profile'));
    }

    return this.combineResults(scanResults);
  }

  /**
   * Find keyword matches in text (word boundaries)
   */
  private findKeywordMatches(text: string, keywords: Set<string>): string[] {
    const matches: string[] = [];
    const words = text.split(/\s+/);

    for (const word of words) {
      // Remove punctuation
      const cleanWord = word.replace(/[^a-z0-9]/gi, '');

      // Check exact and partial matches
      for (const keyword of keywords) {
        if (cleanWord === keyword || cleanWord.includes(keyword) || keyword.includes(cleanWord)) {
          matches.push(keyword);
        }
      }
    }

    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Combine multiple scan results
   */
  private combineResults(results: ModerationResult[]): ModerationResult {
    const allViolations = new Set<ViolationType>();
    const allDetails: any[] = [];
    let maxConfidence = 0;

    for (const result of results) {
      result.violations.forEach((v) => allViolations.add(v));
      allDetails.push(...result.details);
      maxConfidence = Math.max(maxConfidence, result.confidence);
    }

    return {
      isFlagged: allViolations.size > 0,
      violations: Array.from(allViolations),
      confidence: maxConfidence,
      details: allDetails,
      shouldAutoRemove: maxConfidence > 0.8,
      requiresHumanReview: maxConfidence > 0.5 && maxConfidence <= 0.8,
    };
  }

  /**
   * Check if image should be manually reviewed (simplified - actual implementation would use ML)
   */
  async checkImageContent(imageUrl: string): Promise<{ flagged: boolean; reason?: string; confidence: number }> {
    try {
      // In a real app, this would integrate with AWS Rekognition or similar
      // For now, we'll do URL-based heuristics

      const url = new URL(imageUrl);
      const filename = url.pathname.toLowerCase();

      // Check filename for suspicious patterns
      const suspiciousPatterns = [
        /adult|porn|xxx|nsfw|nude|naked/gi,
        /gun|weapon|bomb|explosive/gi,
        /drug|narcotic|cocaine|heroin/gi,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(filename)) {
          return {
            flagged: true,
            reason: `Suspicious filename pattern detected: ${pattern.source}`,
            confidence: 0.6,
          };
        }
      }

      return { flagged: false, confidence: 0 };
    } catch (error) {
      console.error('Error checking image:', error);
      return { flagged: false, confidence: 0 };
    }
  }

  /**
   * Check URL safety (simplified - real implementation would use external API)
   */
  async checkUrlSafety(url: string): Promise<{ isSafe: boolean; reason?: string }> {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Blocklist of known malicious domains (simplified)
      const suspiciousDomains = [
        'bit.ly', // Shortened URLs - require extra caution
        'tinyurl.com',
      ];

      // Check domain
      for (const domain of suspiciousDomains) {
        if (hostname.includes(domain)) {
          return { isSafe: false, reason: 'Shortened URL - verification required' };
        }
      }

      // In real implementation, check against services like Google Safe Browsing API
      return { isSafe: true };
    } catch (error) {
      console.error('Error checking URL:', error);
      return { isSafe: false, reason: 'Invalid URL format' };
    }
  }

  /**
   * Create flagged content record
   */
  createFlaggedRecord(
    contentType: ContentType,
    contentId: string,
    contentOwner: string,
    scanResult: ModerationResult,
    flaggedBy: 'system' | 'user' = 'system',
    userReportReason?: string
  ): FlaggedContent {
    const severity =
      scanResult.confidence > 0.8 ? 'critical' : scanResult.confidence > 0.6 ? 'high' : scanResult.confidence > 0.3 ? 'medium' : 'low';

    return {
      id: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contentType,
      contentId,
      contentOwner,
      contentValue: contentId,
      violations: scanResult.violations,
      violationDetails: scanResult.details,
      flaggedBy,
      flaggedByUserId: undefined,
      userReportReason,
      flaggedAt: new Date().toISOString(),
      status: 'pending',
      severity,
      humanReviewRequired: scanResult.requiresHumanReview,
      escalated: severity === 'critical',
      automationScore: scanResult.confidence,
    };
  }

  /**
   * Get moderation summary statistics
   */
  getModerationSummary(flaggedItems: FlaggedContent[]) {
    const summary = {
      total: flaggedItems.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      violationCounts: {} as Record<ViolationType, number>,
    };

    for (const item of flaggedItems) {
      summary[item.status as keyof Omit<typeof summary, 'total' | 'violationCounts'>]++;
      summary[item.severity as any]++;

      for (const violation of item.violations) {
        summary.violationCounts[violation] = (summary.violationCounts[violation] || 0) + 1;
      }
    }

    return summary;
  }
}

export default ModerationService;
