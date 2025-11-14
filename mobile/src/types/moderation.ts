/**
 * Content Moderation Types
 * For managing content review, flagging, and enforcement
 */

export type ContentType = 'product_description' | 'product_image' | 'product_title' | 'user_profile' | 'user_avatar' | 'review';
export type ViolationType =
  | 'drug_related'
  | 'weapons_or_violence'
  | 'human_trafficking'
  | 'adult_content'
  | 'illegal_activity'
  | 'hate_speech'
  | 'misinformation'
  | 'spam'
  | 'copyright_violation'
  | 'trademark_violation'
  | 'other';

export type ModerationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'appealed' | 'archived';
export type ActionType = 'warning' | 'remove_content' | 'suspend_account' | 'ban_account' | 'none';

/**
 * Violation Keyword Database
 */
export interface ViolationKeyword {
  id: string;
  keyword: string;
  category: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  regex?: string; // For advanced matching
  exactMatch: boolean;
  caseSensitive: boolean;
  language: string; // 'en', 'hi', 'multi', etc.
  addedAt: string;
  addedBy: string; // Admin ID
}

/**
 * Flagged Content
 */
export interface FlaggedContent {
  id: string;

  // Content details
  contentType: ContentType;
  contentId: string; // ID of product, user, review, etc.
  contentOwner: string; // Seller/User ID
  contentValue: string | string[]; // Text or image URLs

  // Violation info
  violations: ViolationType[];
  violationDetails: {
    type: ViolationType;
    matchedKeywords?: string[];
    confidence: number; // 0-1
    explanation: string;
  }[];

  // Flagging
  flaggedBy: 'system' | 'user' | 'admin';
  flaggedByUserId?: string; // If flagged by user
  userReportReason?: string;
  flaggedAt: string;

  // Status
  status: ModerationStatus;
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Review
  reviewedBy?: string; // Admin ID
  reviewedAt?: string;
  reviewNotes?: string;
  decision?: 'approved' | 'rejected';

  // Action taken
  actionTaken?: ActionType;
  actionDetails?: string;
  removedAt?: string;

  // Appeal
  appealRequested?: boolean;
  appealReason?: string;
  appealedAt?: string;
  appealReviewedBy?: string;
  appealDecision?: 'upheld' | 'overturned';

  // Metadata
  automationScore?: number;
  humanReviewRequired: boolean;
  escalated: boolean;
}

/**
 * Moderation Rule
 */
export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;

  // Rule type
  ruleType: 'keyword' | 'pattern' | 'image' | 'link' | 'custom';
  triggerCondition: string; // Logic for triggering this rule

  // Action
  action: ActionType;
  autoExecute: boolean; // Execute without human review
  requiresHumanReview: boolean;

  // Scope
  appliesTo: ContentType[];
  appliesGlobally: boolean;
  specificProductTypes?: string[];

  // Severity
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
  appealable: boolean; // Can user appeal?

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  priority: number; // Higher number = higher priority
}

/**
 * Account Violation Record
 */
export interface AccountViolation {
  id: string;
  userId: string; // Seller/User ID
  violationType: ViolationType;
  contentId?: string; // Flagged content ID

  // Violation details
  description: string;
  severity: 'warning' | 'suspension' | 'ban';
  timeframe: number; // Duration in days (0 = permanent)

  // Action
  action: ActionType;
  actionAppliedAt: string;
  removalDate?: string; // When suspension/ban expires

  // Appeal
  canAppeal: boolean;
  appealDeadline?: string;
  appealSubmitted?: boolean;
  appealReason?: string;
  appealReviewedAt?: string;
  appealOutcome?: 'upheld' | 'overturned';

  // Metadata
  appliedBy: string; // Admin ID
  reason: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Moderation Dashboard Stats
 */
export interface ModerationStats {
  totalFlaggedContent: number;
  pendingReview: number;
  approvedContent: number;
  rejectedContent: number;
  suspendedAccounts: number;
  bannedAccounts: number;

  // Trends
  flagsPerDay: {
    date: string;
    count: number;
  }[];

  topViolationTypes: {
    type: ViolationType;
    count: number;
  }[];

  topFlaggers: {
    userId: string;
    reports: number;
  }[];

  averageReviewTime: number; // in minutes
  approvalRate: number; // percentage
}

/**
 * Appeal
 */
export interface Appeal {
  id: string;
  violationId: string;
  userId: string;
  appealReason: string;
  evidence?: string[]; // URLs to supporting evidence

  // Status
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;

  // Decision
  decision?: 'upheld' | 'overturned';
  decisionReason?: string;
  decisionDetails?: string;
}

/**
 * Moderation Queue Item (for admin dashboard)
 */
export interface ModerationQueueItem {
  id: string;
  flaggedContentId: string;
  contentType: ContentType;
  content: {
    title?: string;
    preview: string; // Text preview or thumbnail URL
    url?: string; // Link to full content
  };

  // Violation info
  violations: {
    type: ViolationType;
    confidence: number;
    keyword?: string;
  }[];

  // Flagging info
  flaggedBy: string;
  flaggedAt: string;
  timeInQueue: number; // in hours

  // Priority
  priority: 'low' | 'medium' | 'high' | 'critical';
  autoFlagConfidence: number; // 0-1

  // Seller info
  sellerId: string;
  sellerName: string;
  sellerViolationHistory: number; // Previous violations
}

/**
 * Auto-moderation Config
 */
export interface AutoModerationConfig {
  id: string;
  enableAutoModeration: boolean;
  enableKeywordFiltering: boolean;
  enableImageModeration: boolean;
  enableLinkScanning: boolean;

  // Sensitivity
  keywordMatchSensitivity: number; // 0-1
  imageDetectionThreshold: number; // 0-1
  linkCheckLevel: 'none' | 'basic' | 'advanced';

  // Action thresholds
  autoApproveIfConfidenceBelow: number; // 0-1
  autoRejectIfConfidenceAbove: number; // 0-1
  requireHumanReviewIfBetween: boolean;

  // Escalation
  escalateToAdminIfMultipleViolations: boolean;
  maxAutoActionsPerDay: number;

  // Notifications
  notifySellerOnFlag: boolean;
  notifyAdminOnHighSeverity: boolean;

  // Config
  updatedAt: string;
  updatedBy: string;
}

/**
 * Audit Log for Moderation Actions
 */
export interface ModerationAuditLog {
  id: string;
  action: string; // e.g., "content_flagged", "appeal_submitted", "action_taken"
  targetId: string; // Flagged content or violation ID
  targetType: ContentType;

  // Actor
  actorType: 'system' | 'user' | 'admin';
  actorId?: string;

  // Details
  oldValue?: any;
  newValue?: any;
  reason?: string;
  metadata?: Record<string, any>;

  // Timestamp
  timestamp: string;
  ipAddress?: string;
}
