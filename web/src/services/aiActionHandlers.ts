/**
 * AI Action Handlers (Web)
 * Handles actions triggered by the AI assistant (routines, todos, search, guides)
 */

export interface ActionData {
  type: 'create_routine' | 'create_todo' | 'search_products' | 'search_users' | 'search_posts' | 'feature_guide';
  payload?: any;
}

export interface RoutineAction {
  wakeTime: string;
  activities: Array<{
    time: string;
    activity: string;
    duration: number; // minutes
  }>;
  goals?: string[];
  preferences?: Record<string, any>;
}

export interface TodoAction {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  tags?: string[];
}

export interface SearchAction {
  query: string;
  filters?: Record<string, any>;
  limit?: number;
}

export interface GuideAction {
  feature: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
}

type NavigateFunction = (path: string, params?: any) => void;

class AIActionHandlers {
  private navigateFn: NavigateFunction | null = null;

  setNavigateFunction(fn: NavigateFunction) {
    this.navigateFn = fn;
  }

  /**
   * Main handler for all AI actions
   */
  async handleAction(action: ActionData, userId: string): Promise<any> {
    try {
      switch (action.type) {
        case 'create_routine':
          return await this.handleCreateRoutine(action.payload, userId);
        case 'create_todo':
          return await this.handleCreateTodo(action.payload, userId);
        case 'search_products':
          return await this.handleSearchProducts(action.payload);
        case 'search_users':
          return await this.handleSearchUsers(action.payload);
        case 'search_posts':
          return await this.handleSearchPosts(action.payload);
        case 'feature_guide':
          return await this.handleFeatureGuide(action.payload);
        default:
          console.warn('Unknown action type:', action.type);
          return null;
      }
    } catch (error) {
      console.error('Error handling action:', error);
      throw error;
    }
  }

  /**
   * Handle routine creation
   * Creates a structured morning routine with activities
   */
  private async handleCreateRoutine(
    payload: RoutineAction,
    userId: string
  ): Promise<any> {
    try {
      // Store routine locally or in app state
      const routineData = {
        userId,
        name: 'My Morning Routine',
        wakeTime: payload.wakeTime,
        activities: payload.activities.map((activity) => ({
          ...activity,
          completed: false,
        })),
        goals: payload.goals || [],
        preferences: payload.preferences || {},
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      // In a real app, this would save to an API or local storage
      console.log('Routine created:', routineData);

      // Navigate to dashboard
      if (this.navigateFn) {
        this.navigateFn('/dashboard');
      }

      return {
        success: true,
        message: 'Routine created successfully!',
        data: routineData,
      };
    } catch (error) {
      console.error('Error creating routine:', error);
      return {
        success: false,
        error: 'Failed to create routine',
      };
    }
  }

  /**
   * Handle todo/task creation
   * Creates a new task with optional due date and priority
   */
  private async handleCreateTodo(
    payload: TodoAction,
    userId: string
  ): Promise<any> {
    try {
      // Prepare todo data
      const todoData = {
        userId,
        title: payload.title,
        description: payload.description || '',
        dueDate: payload.dueDate || null,
        priority: payload.priority || 'medium',
        category: payload.category || 'General',
        tags: payload.tags || [],
        completed: false,
        createdAt: new Date().toISOString(),
      };

      // In a real app, this would save to an API or local storage
      console.log('Todo created:', todoData);

      // Navigate to dashboard
      if (this.navigateFn) {
        this.navigateFn('/dashboard');
      }

      return {
        success: true,
        message: 'Task created successfully!',
        data: todoData,
      };
    } catch (error) {
      console.error('Error creating todo:', error);
      return {
        success: false,
        error: 'Failed to create task',
      };
    }
  }

  /**
   * Handle product search
   * Searches for products in the shop
   */
  private async handleSearchProducts(payload: SearchAction): Promise<any> {
    try {
      const { query } = payload;

      // In a real implementation, this would call the shop API
      console.log('Searching products:', query);

      if (this.navigateFn) {
        this.navigateFn('/shop', { q: query });
      }

      return {
        success: true,
        count: 0,
        products: [],
        message: `Searching for "${query}" in shop...`,
      };
    } catch (error) {
      console.error('Error searching products:', error);
      return {
        success: false,
        error: 'Failed to search products',
        products: [],
      };
    }
  }

  /**
   * Handle user search
   * Searches for users to discover and follow
   */
  private async handleSearchUsers(payload: SearchAction): Promise<any> {
    try {
      const { query } = payload;

      // In a real implementation, this would call the user search API
      console.log('Searching users:', query);

      if (this.navigateFn) {
        this.navigateFn('/discover', { q: query });
      }

      return {
        success: true,
        count: 0,
        users: [],
        message: `Searching for users matching "${query}"...`,
      };
    } catch (error) {
      console.error('Error searching users:', error);
      return {
        success: false,
        error: 'Failed to search users',
        users: [],
      };
    }
  }

  /**
   * Handle post search
   * Searches for posts and moments
   */
  private async handleSearchPosts(payload: SearchAction): Promise<any> {
    try {
      const { query } = payload;

      // Use the search API
      console.log('Searching posts:', query);

      if (this.navigateFn) {
        this.navigateFn('/home', { q: query });
      }

      return {
        success: true,
        count: 0,
        posts: [],
        message: `Found posts matching "${query}"`,
      };
    } catch (error) {
      console.error('Error searching posts:', error);
      return {
        success: false,
        error: 'Failed to search posts',
        posts: [],
      };
    }
  }

  /**
   * Handle feature guidance
   * Provides help and tutorials for various features
   */
  private async handleFeatureGuide(payload: GuideAction): Promise<any> {
    try {
      const { feature, level = 'beginner' } = payload;

      // Get guide content
      const guides: Record<string, Record<string, any>> = {
        routines: {
          beginner: {
            title: 'Getting Started with Routines',
            steps: [
              'Go to the Dashboard',
              'Look for the Routines section',
              'Create a new morning routine',
              'Set your wake time',
              'Add activities with specific times',
              'Save and activate your routine',
            ],
            tips: [
              'Start with 3-5 key activities',
              'Keep activities realistic and timed',
              'Review and adjust weekly',
            ],
          },
          intermediate: {
            title: 'Advanced Routine Management',
            steps: [
              'Create multiple routine templates',
              'Set goals for each routine',
              'Enable notifications for activities',
              'Track completion and analytics',
            ],
          },
        },
        todos: {
          beginner: {
            title: 'Managing Your Tasks',
            steps: [
              'Navigate to Dashboard',
              'Find the Tasks section',
              'Create a new task',
              'Set priority and due date',
              'Organize with categories',
              'Mark tasks complete as you go',
            ],
            tips: [
              'Break large tasks into smaller ones',
              'Set realistic due dates',
              'Review daily for best results',
            ],
          },
        },
        shop: {
          beginner: {
            title: 'Shopping Guide',
            steps: [
              'Navigate to the Shop section',
              'Browse or search for products',
              'Filter by category or price',
              'Read reviews and ratings',
              'Add to cart and checkout',
              'Track your order',
            ],
          },
        },
        social: {
          beginner: {
            title: 'Social Features',
            steps: [
              'Go to the Discover section',
              'Create and share moments',
              'Find other users and posts',
              'React and comment on content',
              'Build your network',
            ],
          },
        },
        messages: {
          beginner: {
            title: 'Messaging Guide',
            steps: [
              'Open the Messages page',
              'Start a new conversation',
              'Type your message',
              'Use reactions to respond quickly',
              'Share media and files',
            ],
          },
        },
      };

      const guide = guides[feature]?.[level] || {
        title: `${feature} Guide`,
        steps: ['Feature guide coming soon for this selection'],
      };

      // Navigate to guide detail page
      if (this.navigateFn) {
        this.navigateFn('/guides', { feature, level });
      }

      return {
        success: true,
        feature,
        guide,
        message: `Here's a guide for ${feature}`,
      };
    } catch (error) {
      console.error('Error getting feature guide:', error);
      return {
        success: false,
        error: 'Failed to load guide',
      };
    }
  }

  /**
   * Handle quick action from buttons (routine, todo, shop, guide)
   */
  async handleQuickAction(
    action: 'routine' | 'todo' | 'shop' | 'guide'
  ): Promise<void> {
    switch (action) {
      case 'routine':
        if (this.navigateFn) {
          this.navigateFn('/dashboard');
        }
        break;
      case 'todo':
        if (this.navigateFn) {
          this.navigateFn('/dashboard');
        }
        break;
      case 'shop':
        if (this.navigateFn) {
          this.navigateFn('/shop');
        }
        break;
      case 'guide':
        if (this.navigateFn) {
          this.navigateFn('/guides', { feature: 'general' });
        }
        break;
    }
  }
}

// Singleton instance
export const aiActionHandlers = new AIActionHandlers();
