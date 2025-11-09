/**
 * AI Assistant Service
 * Handles intelligent conversations, routines, todos, search, and feature guidance
 * Shared between mobile and web
 */

import axios from 'axios';

export interface AIMessage {
  id: string;
  content: string;
  timestamp: number;
  type: 'user' | 'assistant';
  metadata?: {
    action?: 'create_routine' | 'create_todo' | 'search_products' | 'search_users' | 'search_posts' | 'feature_guide';
    actionData?: any;
  };
}

export interface MorningRoutine {
  id: string;
  name: string;
  tasks: RoutineTask[];
  startTime: string;
  totalDuration: number;
  createdAt: number;
}

export interface RoutineTask {
  id: string;
  name: string;
  duration: number;
  category: 'health' | 'exercise' | 'mental' | 'productivity' | 'personal';
  completed?: boolean;
}

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: number;
  category: string;
  completed: boolean;
  relatedTo?: string;
}

export interface SearchResult {
  type: 'product' | 'user' | 'post';
  id: string;
  title: string;
  description: string;
  metadata: any;
}

export interface ConversationContext {
  userId: string;
  conversationHistory: AIMessage[];
  preferences: {
    wakeUpTime?: string;
    fitnessLevel?: string;
    goals?: string[];
    interests?: string[];
  };
}

class AIAssistantService {
  private apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  private conversationContext: Map<string, ConversationContext> = new Map();

  initializeConversation(userId: string): ConversationContext {
    if (this.conversationContext.has(userId)) {
      return this.conversationContext.get(userId)!;
    }

    const context: ConversationContext = {
      userId,
      conversationHistory: [],
      preferences: {},
    };

    this.conversationContext.set(userId, context);
    return context;
  }

  async processMessage(userId: string, userMessage: string): Promise<AIMessage> {
    const context = this.initializeConversation(userId);

    const userMsg: AIMessage = {
      id: `msg_${Date.now()}`,
      content: userMessage,
      timestamp: Date.now(),
      type: 'user',
    };

    context.conversationHistory.push(userMsg);

    const intent = this.analyzeIntent(userMessage);
    const response = await this.generateResponse(userMessage, intent, context);

    context.conversationHistory.push(response);
    return response;
  }

  private analyzeIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('routine') ||
      lowerMessage.includes('morning') ||
      lowerMessage.includes('schedule')
    ) {
      return 'create_routine';
    }

    if (
      lowerMessage.includes('todo') ||
      lowerMessage.includes('task') ||
      lowerMessage.includes('plan') ||
      lowerMessage.includes('reminder')
    ) {
      return 'create_todo';
    }

    if (lowerMessage.includes('find') && lowerMessage.includes('product')) {
      return 'search_products';
    }

    if (
      (lowerMessage.includes('find') || lowerMessage.includes('search')) &&
      (lowerMessage.includes('user') || lowerMessage.includes('person'))
    ) {
      return 'search_users';
    }

    if (
      (lowerMessage.includes('find') || lowerMessage.includes('search')) &&
      lowerMessage.includes('post')
    ) {
      return 'search_posts';
    }

    if (
      lowerMessage.includes('help') ||
      lowerMessage.includes('guide') ||
      lowerMessage.includes('how to') ||
      lowerMessage.includes('tutorial')
    ) {
      return 'feature_guide';
    }

    return 'general_chat';
  }

  private async generateResponse(
    userMessage: string,
    intent: string,
    context: ConversationContext
  ): Promise<AIMessage> {
    let responseContent = '';
    let metadata: AIMessage['metadata'] = {};

    switch (intent) {
      case 'create_routine':
        responseContent = await this.generateRoutineResponse(userMessage, context);
        metadata.action = 'create_routine';
        metadata.actionData = this.parseRoutineRequest(userMessage);
        break;

      case 'create_todo':
        responseContent = await this.generateTodoResponse(userMessage, context);
        metadata.action = 'create_todo';
        metadata.actionData = this.parseTodoRequest(userMessage);
        break;

      case 'search_products':
        responseContent = await this.generateSearchResponse(userMessage, 'product');
        metadata.action = 'search_products';
        metadata.actionData = this.extractSearchQuery(userMessage);
        break;

      case 'search_users':
        responseContent = await this.generateSearchResponse(userMessage, 'user');
        metadata.action = 'search_users';
        metadata.actionData = this.extractSearchQuery(userMessage);
        break;

      case 'search_posts':
        responseContent = await this.generateSearchResponse(userMessage, 'post');
        metadata.action = 'search_posts';
        metadata.actionData = this.extractSearchQuery(userMessage);
        break;

      case 'feature_guide':
        responseContent = await this.generateGuideResponse(userMessage, context);
        metadata.action = 'feature_guide';
        break;

      default:
        responseContent = await this.generateGeneralResponse(userMessage, context);
    }

    return {
      id: `msg_${Date.now()}`,
      content: responseContent,
      timestamp: Date.now(),
      type: 'assistant',
      metadata,
    };
  }

  private async generateRoutineResponse(userMessage: string, context: ConversationContext): Promise<string> {
    const wakeTime = context.preferences.wakeUpTime || '6:00 AM';
    const fitnessLevel = context.preferences.fitnessLevel || 'moderate';

    return `Great! I'll create a personalized morning routine for you.

Based on your preferences:
- Wake up time: ${wakeTime}
- Fitness level: ${fitnessLevel}

Here's a tailored morning routine:

**6:00 AM** - Wake up & Hydrate (5 min)
- Drink a glass of water

**6:05 AM** - Meditation (10 min)
- Breathing exercises & mindfulness

**6:15 AM** - Exercise (20 min)
- Light workout matching your fitness level

**6:35 AM** - Shower (10 min)
- Refresh and energize

**6:45 AM** - Breakfast (15 min)
- Nutritious meal

**7:00 AM** - Planning (10 min)
- Review your day's goals

Would you like me to:
- Adjust any timing?
- Add or remove activities?
- Save this routine?
- Get detailed exercises for your fitness level?`;
  }

  private async generateTodoResponse(userMessage: string, context: ConversationContext): Promise<string> {
    const todos = this.parseTodoRequest(userMessage);

    return `Perfect! I'll help you organize your tasks. I've identified the following items:

${todos.map((t, i) => `${i + 1}. **${t.title}** (${t.priority} priority)\n   Due: ${new Date(t.dueDate).toLocaleDateString()}`).join('\n')}

I can help you:
- Set reminders for each task
- Break down larger tasks into subtasks
- Schedule them into your routine
- Track your progress
- Adjust priorities based on your goals

What would you like me to do first? Would you like to save these tasks or refine them?`;
  }

  private async generateSearchResponse(userMessage: string, type: 'product' | 'user' | 'post'): Promise<string> {
    const query = this.extractSearchQuery(userMessage);

    if (type === 'product') {
      return `I found some great ${query} products for you! 🛍️

**Top Recommendations:**
1. **Premium ${query} Pro** - ⭐⭐⭐⭐⭐ (4.8/5)
   - Price: $29.99
   - Features: High quality, eco-friendly

2. **Standard ${query}** - ⭐⭐⭐⭐ (4.5/5)
   - Price: $19.99
   - Features: Budget-friendly, reliable

3. **Luxury ${query} Elite** - ⭐⭐⭐⭐⭐ (5/5)
   - Price: $49.99
   - Features: Premium materials, lifetime warranty

Would you like me to:
- Show more options?
- Compare prices?
- Add to cart?
- Get detailed reviews?`;
    }

    if (type === 'user') {
      return `I found some interesting people matching your search for "${query}"! 👥

**Top Matches:**
1. **${query} Expert** - @${query.toLowerCase()}_pro
   - 2.5K followers
   - Interests: ${query}, lifestyle, wellness

2. **${query} Enthusiast** - @${query.toLowerCase()}_lover
   - 1.2K followers
   - Interests: ${query}, community, sharing

3. **${query} Creator** - @${query.toLowerCase()}_creator
   - 892 followers
   - Interests: ${query}, content, inspiration

Would you like me to:
- Show more users?
- Get recommendations based on your interests?
- Help you follow someone?
- View their profile?`;
    }

    return `I found awesome posts about "${query}"! 📱

**Top Posts:**
1. **"My ${query} Journey"** by @creator123
   - 342 likes • 56 comments
   - "Just started my ${query} journey and loving it!"

2. **"${query} Tips & Tricks"** by @expert_guide
   - 521 likes • 89 comments
   - "Here are my best ${query} tips for beginners..."

3. **"${query} Transformation"** by @wellness_coach
   - 1.2K likes • 234 comments
   - "Amazing results after following this ${query} routine"

Would you like me to:
- Show more posts?
- Filter by topic?
- Like or save posts?
- Join the conversation?`;
  }

  private async generateGuideResponse(userMessage: string, context: ConversationContext): Promise<string> {
    const feature = this.extractFeature(userMessage);

    return `📚 **Guide: ${feature}**

Here's how to make the most of this feature:

**Step 1: Getting Started**
- Navigate to the ${feature} section
- Tap on "New" to create your first item

**Step 2: Customization**
- Personalize your ${feature} with your preferences
- Add details and descriptions
- Set priorities and deadlines

**Step 3: Integration**
- Connect with your routine and tasks
- Get reminders and notifications
- Track progress over time

**Tips & Tricks:**
✨ Use mood badges to track your emotions
✨ Share your journey with friends
✨ Get AI-powered suggestions
✨ Customize notifications

**Advanced Features:**
- Create templates for recurring activities
- Collaborate with others
- Export your data
- Integrate with calendar

Need more help? Ask me:
- "How do I share this?"
- "How do I get notifications?"
- "How do I customize this?"
- "What are the best practices?"`;
  }

  private async generateGeneralResponse(userMessage: string, context: ConversationContext): Promise<string> {
    return `I'm here to help! 😊

I can assist you with:
- **📅 Morning Routines** - Create personalized daily routines
- **✅ Todo Lists** - Organize tasks and plans
- **🛍️ Product Search** - Find items in the store
- **👥 User Search** - Discover people to follow
- **📱 Post Search** - Find content about topics you care about
- **🎓 Feature Guides** - Learn how to use every feature
- **💬 General Chat** - Just chat about anything!

What would you like to do? Feel free to ask me anything, and I'll do my best to help! 🌟`;
  }

  private parseRoutineRequest(message: string): Partial<MorningRoutine> {
    const timeMatch = message.match(/\d{1,2}:\d{2}\s*(am|pm)/i);
    const startTime = timeMatch ? timeMatch[0] : '6:00 AM';

    return {
      name: 'My Morning Routine',
      startTime,
      totalDuration: 60,
      tasks: this.generateDefaultRoutineTasks(),
    };
  }

  private generateDefaultRoutineTasks(): RoutineTask[] {
    return [
      { id: '1', name: 'Wake up & Hydrate', duration: 5, category: 'health' },
      { id: '2', name: 'Meditation', duration: 10, category: 'mental' },
      { id: '3', name: 'Exercise', duration: 20, category: 'exercise' },
      { id: '4', name: 'Shower', duration: 10, category: 'personal' },
      { id: '5', name: 'Breakfast', duration: 15, category: 'health' },
      { id: '6', name: 'Daily Planning', duration: 10, category: 'productivity' },
    ];
  }

  private parseTodoRequest(message: string): TodoItem[] {
    return [
      {
        id: '1',
        title: 'Complete Task 1',
        description: 'From your message',
        priority: 'high',
        dueDate: Date.now() + 86400000,
        category: 'work',
        completed: false,
      },
      {
        id: '2',
        title: 'Complete Task 2',
        description: 'Follow up item',
        priority: 'medium',
        dueDate: Date.now() + 172800000,
        category: 'personal',
        completed: false,
      },
    ];
  }

  private extractSearchQuery(message: string): string {
    const words = message.split(' ');
    const findIndex = words.findIndex(w => w.toLowerCase() === 'find' || w.toLowerCase() === 'search');

    if (findIndex !== -1) {
      return words.slice(findIndex + 1).join(' ').replace(/[?!.]/g, '');
    }

    return 'products';
  }

  private extractFeature(message: string): string {
    if (message.toLowerCase().includes('canvas')) return 'Canvas';
    if (message.toLowerCase().includes('essenz')) return 'Essenz';
    if (message.toLowerCase().includes('hopln')) return 'Hopln';
    if (message.toLowerCase().includes('shop')) return 'Shop';
    if (message.toLowerCase().includes('message')) return 'Messages';

    return 'Feature';
  }

  getConversationHistory(userId: string): AIMessage[] {
    return this.conversationContext.get(userId)?.conversationHistory || [];
  }

  updatePreferences(userId: string, preferences: Partial<ConversationContext['preferences']>): void {
    const context = this.initializeConversation(userId);
    context.preferences = { ...context.preferences, ...preferences };
  }

  clearConversation(userId: string): void {
    const context = this.conversationContext.get(userId);
    if (context) {
      context.conversationHistory = [];
    }
  }
}

export const aiAssistantService = new AIAssistantService();
