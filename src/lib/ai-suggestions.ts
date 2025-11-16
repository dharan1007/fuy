/**
 * Advanced AI Suggestions Engine
 *
 * Analyzes user goals, intentions, and tasks to provide personalized
 * recommendations for:
 * - Platform videos (short/long form)
 * - Spotify/Apple Music songs and podcasts
 * - Relevant websites and books
 */

export interface UserGoal {
  text: string;
  type?: 'goal' | 'plan' | 'task' | 'intention' | 'problem';
  context?: string;
}

export interface SuggestionCategory {
  id: string;
  label: string;
  icon: string;
}

export interface Suggestion {
  id: string;
  title: string;
  description?: string;
  category: string;
  type: 'video' | 'podcast' | 'song' | 'website' | 'book';
  url?: string;
  image?: string;
  duration?: string;
  relevanceScore: number;
  reason?: string;
  source?: 'platform' | 'spotify' | 'apple-music' | 'website' | 'book';
}

export interface SuggestionsResponse {
  goal: string;
  coreIntention: string;
  suggestions: {
    videos: Suggestion[];
    podcasts: Suggestion[];
    songs: Suggestion[];
    websites: Suggestion[];
    books: Suggestion[];
  };
  totalCount: number;
}

/**
 * Advanced goal/intention analyzer
 * Understands the core problem, motivation, and desired outcome
 */
export function analyzeGoal(goalText: string): {
  coreIntention: string;
  category: string;
  subcategories: string[];
  keywords: string[];
  suggestedApproaches: string[];
} {
  const text = goalText.toLowerCase();

  // Extract keywords and phrases
  const keywords = extractKeywords(text);

  // Categorize the goal
  const category = categorizeGoal(text);
  const subcategories = getSubcategories(text, category);

  // Generate core intention summary
  const coreIntention = generateCoreIntention(goalText, category);

  // Suggest approaches
  const suggestedApproaches = generateApproaches(category, subcategories);

  return {
    coreIntention,
    category,
    subcategories,
    keywords,
    suggestedApproaches,
  };
}

/**
 * Extract meaningful keywords from goal text
 */
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];

  // Common goal-related patterns
  const patterns = [
    /(?:improve|enhance|develop|master|learn)\s+(\w+(?:\s+\w+)?)/gi,
    /(?:reduce|eliminate|overcome)\s+(\w+(?:\s+\w+)?)/gi,
    /(?:build|create|start)\s+(\w+(?:\s+\w+)?)/gi,
    /(?:get better at|become)\s+(\w+(?:\s+\w+)?)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      keywords.push(match[1].trim());
    }
  }

  // Add direct nouns/topics
  const topics = ['health', 'fitness', 'productivity', 'mindfulness', 'career', 'creativity',
                  'relationships', 'learning', 'confidence', 'stress', 'focus', 'sleep',
                  'nutrition', 'exercise', 'meditation', 'writing', 'coding', 'design',
                  'public speaking', 'leadership', 'problem solving'];

  for (const topic of topics) {
    if (text.includes(topic)) keywords.push(topic);
  }

  return [...new Set(keywords)].slice(0, 10);
}

/**
 * Categorize goal into major themes
 */
function categorizeGoal(text: string): string {
  const categories = [
    { name: 'health', keywords: ['health', 'fitness', 'exercise', 'workout', 'yoga', 'weight', 'diet', 'nutrition', 'sleep', 'energy'] },
    { name: 'learning', keywords: ['learn', 'study', 'course', 'skill', 'knowledge', 'understand', 'master', 'improve'] },
    { name: 'productivity', keywords: ['productivity', 'efficient', 'organized', 'time management', 'focus', 'deadline', 'project'] },
    { name: 'mental_wellness', keywords: ['stress', 'anxiety', 'calm', 'peace', 'mindfulness', 'meditation', 'relax', 'breathe'] },
    { name: 'creativity', keywords: ['creative', 'art', 'write', 'design', 'music', 'express', 'inspiration', 'imagine'] },
    { name: 'relationships', keywords: ['relationship', 'friend', 'family', 'love', 'communication', 'connect', 'social'] },
    { name: 'career', keywords: ['career', 'job', 'work', 'promotion', 'professional', 'leadership', 'business'] },
    { name: 'confidence', keywords: ['confidence', 'self', 'esteem', 'afraid', 'fear', 'courage', 'belief'] },
  ];

  for (const category of categories) {
    if (category.keywords.some(kw => text.includes(kw))) {
      return category.name;
    }
  }

  return 'personal-development';
}

/**
 * Get subcategories based on goal details
 */
function getSubcategories(text: string, category: string): string[] {
  const subcategories: string[] = [];

  const categoryMap: Record<string, string[]> = {
    health: ['cardio', 'strength', 'flexibility', 'nutrition', 'sleep', 'mental-health'],
    learning: ['technical', 'language', 'creative', 'professional', 'soft-skills'],
    productivity: ['planning', 'execution', 'collaboration', 'automation', 'focus'],
    mental_wellness: ['stress-relief', 'meditation', 'anxiety-management', 'self-care'],
    creativity: ['writing', 'visual-arts', 'music', 'design', 'innovation'],
    relationships: ['communication', 'empathy', 'trust', 'intimacy', 'conflict-resolution'],
    career: ['skills', 'networking', 'leadership', 'advancement', 'work-life-balance'],
    confidence: ['public-speaking', 'self-worth', 'decision-making', 'resilience'],
  };

  const subs = categoryMap[category] || [];

  for (const sub of subs) {
    if (text.includes(sub.replace('-', ' ')) || text.includes(sub)) {
      subcategories.push(sub);
    }
  }

  return subcategories.slice(0, 4);
}

/**
 * Generate a clear summary of the core intention
 */
function generateCoreIntention(originalText: string, category: string): string {
  // Try to extract or generate a concise intention
  const lines = originalText.split('\n').filter(l => l.trim());
  const firstLine = lines[0]?.trim() || originalText.trim();

  if (firstLine.length < 100) {
    return firstLine;
  }

  // Create a summary
  const categoryLabels: Record<string, string> = {
    health: 'Improve physical and mental health',
    learning: 'Develop new skills and knowledge',
    productivity: 'Enhance efficiency and organization',
    mental_wellness: 'Achieve emotional balance and peace',
    creativity: 'Express creativity and innovation',
    relationships: 'Strengthen connections and communication',
    career: 'Advance professional goals',
    confidence: 'Build self-confidence and belief',
  };

  return categoryLabels[category] || 'Achieve personal growth and goals';
}

/**
 * Generate suggested approaches/methods
 */
function generateApproaches(category: string, subcategories: string[]): string[] {
  const approaches: Record<string, string[]> = {
    health: [
      'Consistent daily exercise routine',
      'Balanced nutrition and meal planning',
      'Quality sleep optimization',
      'Regular health monitoring',
      'Community and accountability',
    ],
    learning: [
      'Structured learning path',
      'Hands-on practice projects',
      'Expert mentoring/coaching',
      'Community learning groups',
      'Regular practice and repetition',
    ],
    productivity: [
      'Time-blocking and scheduling',
      'Priority management systems',
      'Automation and delegation',
      'Regular reviews and adjustments',
      'Accountability partnerships',
    ],
    mental_wellness: [
      'Daily mindfulness practice',
      'Breathing and relaxation techniques',
      'Professional support/therapy',
      'Lifestyle modifications',
      'Community support',
    ],
    creativity: [
      'Regular creative practice',
      'Inspiration and research',
      'Collaborative projects',
      'Experimentation and play',
      'Sharing and feedback',
    ],
  };

  return approaches[category] || ['Consistent practice', 'Learning from experts', 'Community support'];
}

/**
 * Prepare suggestions query based on analyzed goal
 */
export function buildSuggestionsQuery(goal: UserGoal) {
  const analysis = analyzeGoal(goal.text);

  return {
    analysis,
    searchQueries: {
      videos: `${analysis.category} ${analysis.subcategories.join(' ')} tutorial guide`,
      podcasts: `${analysis.category} podcast advice conversation`,
      songs: `${analysis.category} motivation inspiration uplifting`,
      websites: `${analysis.category} resources learning guide`,
      books: `${analysis.category} mindset practical strategies`,
    },
    filters: {
      minDuration: goal.type === 'goal' ? 10 : 5,
      relevanceThreshold: 0.6,
      itemsPerCategory: 5,
    },
  };
}
