/**
 * AI Suggestions API Endpoint
 *
 * POST /api/ai/suggestions
 * Analyzes user goals and returns personalized suggestions for:
 * - Platform videos
 * - Spotify/Apple Music songs and podcasts
 * - Websites and books
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeGoal, buildSuggestionsQuery, Suggestion, SuggestionsResponse } from '@/lib/ai-suggestions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goalText, type = 'goal', context = '' } = body;

    if (!goalText || typeof goalText !== 'string' || goalText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Goal text is required' },
        { status: 400 }
      );
    }

    // Analyze the goal
    const analysis = analyzeGoal(goalText);

    // Build search queries
    const query = buildSuggestionsQuery({ text: goalText, type, context });

    // Fetch suggestions from various sources
    const [videos, podcasts, songs, websites, books] = await Promise.allSettled([
      fetchPlatformVideos(query.searchQueries.videos, query.filters.itemsPerCategory),
      fetchPodcasts(query.searchQueries.podcasts, query.filters.itemsPerCategory),
      fetchSongs(query.searchQueries.songs, query.filters.itemsPerCategory),
      fetchWebsites(query.searchQueries.websites, query.filters.itemsPerCategory),
      fetchBooks(query.searchQueries.books, query.filters.itemsPerCategory),
    ]);

    const response: SuggestionsResponse = {
      goal: goalText,
      coreIntention: analysis.coreIntention,
      suggestions: {
        videos: videos.status === 'fulfilled' ? videos.value : getMockVideos(query.searchQueries.videos),
        podcasts: podcasts.status === 'fulfilled' ? podcasts.value : getMockPodcasts(query.searchQueries.podcasts),
        songs: songs.status === 'fulfilled' ? songs.value : getMockSongs(query.searchQueries.songs),
        websites: websites.status === 'fulfilled' ? websites.value : getMockWebsites(query.searchQueries.websites),
        books: books.status === 'fulfilled' ? books.value : getMockBooks(query.searchQueries.books),
      },
      totalCount: 0,
    };

    response.totalCount = Object.values(response.suggestions).reduce(
      (sum, items) => sum + items.length,
      0
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Suggestions endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

/**
 * Fetch videos from platform
 */
async function fetchPlatformVideos(query: string, limit: number): Promise<Suggestion[]> {
  // For now, return mock data
  // In production, query actual video database
  return getMockVideos(query, limit);
}

/**
 * Fetch podcasts from Spotify/Apple Music
 */
async function fetchPodcasts(query: string, limit: number): Promise<Suggestion[]> {
  // For now, return mock data
  // In production, use Spotify Web API or Apple Music API
  return getMockPodcasts(query, limit);
}

/**
 * Fetch songs from Spotify/Apple Music
 */
async function fetchSongs(query: string, limit: number): Promise<Suggestion[]> {
  // For now, return mock data
  // In production, use music streaming APIs
  return getMockSongs(query, limit);
}

/**
 * Fetch websites and articles
 */
async function fetchWebsites(query: string, limit: number): Promise<Suggestion[]> {
  // For now, return mock data
  // In production, use web search API or bookmarking service
  return getMockWebsites(query, limit);
}

/**
 * Fetch books from API
 */
async function fetchBooks(query: string, limit: number): Promise<Suggestion[]> {
  // For now, return mock data
  // In production, use Google Books API or other book database
  return getMockBooks(query, limit);
}

/**
 * Mock data generators (for development and fallback)
 */

function getMockVideos(query: string, limit: number = 5): Suggestion[] {
  const videoBank = [
    {
      title: 'Complete Guide to Building Habits',
      description: 'Learn science-backed strategies for creating lasting habits',
      duration: '45 min',
      category: 'self-improvement',
    },
    {
      title: 'Daily Routine Optimization',
      description: 'Structure your day for maximum productivity',
      duration: '32 min',
      category: 'productivity',
    },
    {
      title: 'Mindfulness for Beginners',
      description: 'Start your meditation practice today',
      duration: '28 min',
      category: 'wellness',
    },
    {
      title: 'Goal Setting Framework',
      description: 'Set and achieve meaningful goals',
      duration: '38 min',
      category: 'goal-setting',
    },
    {
      title: 'Advanced Problem Solving',
      description: 'Master techniques for complex challenges',
      duration: '52 min',
      category: 'learning',
    },
    {
      title: 'Motivation and Drive',
      description: 'Understand intrinsic motivation principles',
      duration: '35 min',
      category: 'motivation',
    },
  ];

  return videoBank.slice(0, limit).map((v, i) => ({
    id: `video-${i}`,
    title: v.title,
    description: v.description,
    category: v.category,
    type: 'video',
    duration: v.duration,
    relevanceScore: 0.85 + Math.random() * 0.15,
    reason: 'Highly relevant to your goals',
    source: 'platform',
    url: `https://example.com/videos/${i}`,
    image: `https://via.placeholder.com/320x180?text=${encodeURIComponent(v.title)}`,
  }));
}

function getMockPodcasts(query: string, limit: number = 5): Suggestion[] {
  const podcastBank = [
    {
      title: 'The Goal Achievers Podcast',
      description: 'Weekly interviews with high achievers',
      duration: '45 min/ep',
      category: 'motivation',
    },
    {
      title: 'Mindful Minutes',
      description: 'Daily wisdom for mental wellness',
      duration: '15 min/ep',
      category: 'wellness',
    },
    {
      title: 'Success Stories',
      description: 'Real stories of transformation',
      duration: '30 min/ep',
      category: 'inspiration',
    },
    {
      title: 'The Productivity Hour',
      description: 'Master productivity techniques',
      duration: '60 min/ep',
      category: 'productivity',
    },
    {
      title: 'Life Design Lab',
      description: 'Design your ideal life',
      duration: '50 min/ep',
      category: 'personal-development',
    },
  ];

  return podcastBank.slice(0, limit).map((p, i) => ({
    id: `podcast-${i}`,
    title: p.title,
    description: p.description,
    category: p.category,
    type: 'podcast',
    duration: p.duration,
    relevanceScore: 0.8 + Math.random() * 0.2,
    reason: 'Perfect for learning during commutes',
    source: 'spotify',
    url: `https://open.spotify.com/show/${i}`,
  }));
}

function getMockSongs(query: string, limit: number = 5): Suggestion[] {
  const songBank = [
    { title: 'Rise Up', artist: 'Andra Day', mood: 'inspiring' },
    { title: 'Don\'t Give Up', artist: 'Peter Gabriel & Kate Bush', mood: 'motivational' },
    { title: 'Unstoppable', artist: 'Sia', mood: 'empowering' },
    { title: 'Eye of the Tiger', artist: 'Survivor', mood: 'energizing' },
    { title: 'Walking on Sunshine', artist: 'Katrina & The Waves', mood: 'uplifting' },
    { title: 'Can\'t Hold Us', artist: 'Macklemore & Ryan Lewis', mood: 'energetic' },
  ];

  return songBank.slice(0, limit).map((s, i) => ({
    id: `song-${i}`,
    title: s.title,
    description: `by ${s.artist}`,
    category: s.mood,
    type: 'song',
    duration: '3-4 min',
    relevanceScore: 0.75 + Math.random() * 0.25,
    reason: `${s.mood} track for your journey`,
    source: 'spotify',
    url: `https://open.spotify.com/track/${i}`,
  }));
}

function getMockWebsites(query: string, limit: number = 5): Suggestion[] {
  const websiteBank = [
    {
      title: 'Medium - Self Improvement Stories',
      url: 'https://medium.com/tag/self-improvement',
      description: 'In-depth articles from practitioners',
    },
    {
      title: 'James Clear - Atomic Habits',
      url: 'https://jamesclear.com/habits',
      description: 'Evidence-based guide to habit formation',
    },
    {
      title: 'TED Ideas',
      url: 'https://www.ted.com/topics/self-improvement',
      description: 'Curated talks on personal growth',
    },
    {
      title: 'LinkedIn Learning',
      url: 'https://www.linkedin.com/learning',
      description: 'Professional courses and insights',
    },
    {
      title: 'Coursera - Personal Development',
      url: 'https://www.coursera.org',
      description: 'Free and paid courses from universities',
    },
  ];

  return websiteBank.slice(0, limit).map((w, i) => ({
    id: `website-${i}`,
    title: w.title,
    description: w.description,
    category: 'learning',
    type: 'website',
    relevanceScore: 0.8 + Math.random() * 0.2,
    reason: 'Quality resource for deep learning',
    source: 'website',
    url: w.url,
  }));
}

function getMockBooks(query: string, limit: number = 5): Suggestion[] {
  const bookBank = [
    {
      title: 'Atomic Habits',
      author: 'James Clear',
      description: 'Build good habits, break bad ones',
    },
    {
      title: 'Deep Work',
      author: 'Cal Newport',
      description: 'Focus on what matters most',
    },
    {
      title: 'The 7 Habits of Highly Effective People',
      author: 'Stephen Covey',
      description: 'Timeless principles for success',
    },
    {
      title: 'Mindset',
      author: 'Carol Dweck',
      description: 'Develop a growth mindset',
    },
    {
      title: 'The Power of Now',
      author: 'Eckhart Tolle',
      description: 'Living in the present moment',
    },
  ];

  return bookBank.slice(0, limit).map((b, i) => ({
    id: `book-${i}`,
    title: b.title,
    description: `${b.author}\n${b.description}`,
    category: 'reading',
    type: 'book',
    relevanceScore: 0.82 + Math.random() * 0.18,
    reason: 'Essential reading for your goals',
    source: 'book',
    url: `https://www.goodreads.com/search?q=${encodeURIComponent(b.title)}`,
  }));
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Use POST to generate suggestions',
      example: {
        goalText: 'I want to improve my productivity and focus',
        type: 'goal',
      },
    },
    { status: 200 }
  );
}
