/**
 * Product Types
 * For managing templates, courses, plans, and exclusive content
 */

export type ProductType = 'template' | 'course' | 'plan' | 'exclusive_content';
export type ProductStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
export type TemplateCategory = 'social_media' | 'graphic_design' | 'presentation' | 'print' | 'web' | 'other';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Template Product (Canvas)
 */
export interface TemplateProduct {
  id: string;
  sellerId: string;
  type: 'template';
  title: string;
  description: string;
  category: TemplateCategory;
  price: number;
  currency: 'INR'; // or other currencies

  // Content
  thumbnailImage: string; // Preview image
  previewImages: string[]; // Multiple preview images
  downloadUrl?: string; // Direct download link
  fileSize: string; // e.g., "25 MB"
  fileFormat: string[]; // e.g., ["PSD", "PNG", "PDF"]
  layers?: number;
  resolution?: string;

  // Metadata
  tags: string[];
  status: ProductStatus;
  published: boolean;
  publishedAt?: string;

  // Reviews
  rating: number;
  reviewCount: number;
  sales: number;

  // Dates
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

/**
 * Course Product (Canvas)
 */
export interface CourseProduct {
  id: string;
  sellerId: string;
  type: 'course';
  title: string;
  description: string;
  level: CourseLevel;
  price: number;
  isPaid: boolean;
  currency: 'INR';

  // Content
  thumbnailImage: string;
  introVideoUrl?: string;
  learningOutcomes: string[];
  prerequisites?: string[];

  // Modules
  modules: CourseModule[];
  totalLessons: number;
  totalDuration: number; // in minutes

  // Metadata
  tags: string[];
  language: string;
  status: ProductStatus;
  published: boolean;
  publishedAt?: string;

  // Reviews
  rating: number;
  reviewCount: number;
  enrolled: number; // number of enrolled students

  // Dates
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
  order: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  videoUrl: string;
  duration: number; // in minutes
  resources?: string[]; // URLs to downloadable resources
  order: number;
  isLocked?: boolean;
}

/**
 * Plan/Coaching Product (Hopln)
 */
export interface PlanProduct {
  id: string;
  sellerId: string;
  type: 'plan';
  title: string;
  description: string;
  price: number;
  currency: 'INR';
  duration: number; // in days
  durationUnit: 'days' | 'months' | 'years';

  // Features
  features: string[];
  maxParticipants?: number;
  sessionDuration?: number; // in minutes
  sessionsPerWeek?: number;
  includedMaterials?: string[];

  // Metadata
  tags: string[];
  status: ProductStatus;
  published: boolean;
  publishedAt?: string;

  // Reviews
  rating: number;
  reviewCount: number;
  purchases: number;

  // Dates
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

/**
 * Exclusive Content
 */
export interface ExclusiveContentProduct {
  id: string;
  sellerId: string;
  type: 'exclusive_content';
  title: string;
  description: string;
  subscriptionPrice: number; // Monthly or recurring
  currency: 'INR';
  subscriptionPeriod: 'monthly' | 'quarterly' | 'yearly';

  // Content
  contentType: 'posts' | 'videos' | 'documents' | 'mixed';
  thumbnailImage: string;
  contentCount: number; // posts, videos, etc.
  updateFrequency: 'daily' | 'weekly' | 'monthly';

  // Metadata
  tags: string[];
  status: ProductStatus;
  published: boolean;
  publishedAt?: string;

  // Subscribers
  rating: number;
  reviewCount: number;
  subscribers: number;

  // Dates
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

/**
 * Generic Product Type
 */
export type Product = TemplateProduct | CourseProduct | PlanProduct | ExclusiveContentProduct;

export interface ProductReview {
  id: string;
  productId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  rating: number; // 1-5
  reviewText: string;
  helpful: number;
  unhelpful: number;
  createdAt: string;
  verifiedPurchase: boolean;
}

/**
 * Content Flags for Moderation
 */
export interface ProductContentFlag {
  productId: string;
  containsProhibitedContent: boolean;
  flaggedItems: {
    type: 'keyword' | 'image' | 'link' | 'description';
    content: string;
    reason: string;
    confidence: number; // 0-1
  }[];
  isApproved: boolean;
  moderatedBy?: string;
  moderatedAt?: string;
}
