// Auth Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

// Journal Types
export interface JournalEntry {
  id: string;
  userId: string;
  content: string;
  blocks: JournalBlock[];
  mood?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'drawing' | 'checklist';
  content: string;
  metadata?: Record<string, any>;
}

// Essenz (Goals) Types
export interface Essenz {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  nodes: EssenzNode[];
  createdAt: string;
  updatedAt: string;
}

export interface EssenzNode {
  id: string;
  essenzId: string;
  type: 'goal' | 'step' | 'prioritize' | 'todo' | 'diary' | 'resources' | 'watchlist' | 'hopin';
  title: string;
  description?: string;
  completed: boolean;
  position?: { x: number; y: number };
  children?: EssenzNode[];
}

// Social Types
export interface Post {
  id: string;
  userId: string;
  content: string;
  feature: 'JOURNAL' | 'JOY' | 'AWE' | 'BONDS' | 'SERENDIPITY' | 'CHECKIN' | 'PROGRESS';
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  likes: number;
  comments: number;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    image?: string;
  };
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: User;
}

// Chat Types
export interface Conversation {
  id: string;
  userId: string;
  participantId: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  participant?: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  media?: string[];
  createdAt: string;
}

// Product Types
export interface Product {
  id: string;
  brandId: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  images: string[];
  tags?: string[];
  rating?: number;
  reviewCount?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product?: Product;
}

export interface Order {
  id: string;
  userId: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

// Places Types
export interface RouteWaypoint {
  id: string;
  routeId: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  photos?: string[];
  order: number;
}

export interface Place {
  id: string;
  userId: string;
  title: string;
  latitude: number;
  longitude: number;
  address?: string;
  photos?: string[];
  reviews?: PlaceReview[];
}

export interface PlaceReview {
  id: string;
  placeId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// Friend Types
export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  friend?: User;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Sync Types
export interface SyncQueue {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId: string;
  payload: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
  error?: string;
}

// Notification Types
export interface PushNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}
