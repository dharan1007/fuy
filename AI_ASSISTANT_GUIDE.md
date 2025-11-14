# AI Assistant Implementation Guide

## Overview
The AI Assistant is a conversational feature integrated into the Messages page that helps users with routines, todos, product search, user discovery, and feature guidance.

## Architecture

### Core Components

#### 1. **AI Service** (`aiAssistantService.ts`)
- **Location**: `mobile/src/services/` and `web/src/services/`
- **Responsibility**: Core AI logic, conversation management, intent analysis
- **Key Methods**:
  - `processMessage(userId, userMessage)` - Main entry point for user messages
  - `analyzeIntent(message)` - NLP-based intent detection
  - `generateResponse(message, intent, context)` - Response generation based on intent
  - `getConversationHistory(userId)` - Retrieves conversation history
  - `updatePreferences(userId, prefs)` - Updates user preferences for personalization

#### 2. **AI Hooks** (`useAIAssistant.ts`)
- **Location**: `mobile/src/hooks/` and `web/src/hooks/`
- **Responsibility**: State management for AI conversations
- **Returns**:
  ```typescript
  {
    messages: AIMessage[],
    loading: boolean,
    error: string | null,
    isTyping: boolean,
    sendMessage: (msg: string) => Promise<void>,
    clearConversation: () => void,
    getLastAssistantMessage: () => AIMessage | null,
    getMessagesByAction: (action: string) => AIMessage[]
  }
  ```

#### 3. **UI Components**

**Mobile Components**:
- `AIMessageBubble.tsx` - Individual message display with user/AI styling
- `AIChatInterface.tsx` - Full chat UI with input, messages list, quick actions

**Web Components**:
- `AIMessageBubbleWeb.tsx` - Web version of message bubble
- `AIChatInterfaceWeb.tsx` - Web version of chat interface with form handling

#### 4. **Action Handlers** (`aiActionHandlers.ts`)
- **Location**: `mobile/src/services/` and `web/src/services/`
- **Responsibility**: Execute actions triggered by AI responses
- **Supported Actions**:
  - `create_routine` - Create morning routines
  - `create_todo` - Create tasks/todos
  - `search_products` - Search shop
  - `search_users` - Discover users
  - `search_posts` - Search posts/moments
  - `feature_guide` - Show feature tutorials

#### 5. **Navigation Service** (`INavigationService.ts`)
- **Location**: `mobile/src/navigation/`
- **Responsibility**: Navigation abstraction for action handlers
- **Methods**:
  - `navigate(name, params)` - Navigate to screen
  - `navigateToTab(name, params)` - Navigate to tab
  - `goBack()` - Go back
  - `reset(routes)` - Reset navigation stack

## Intent Recognition

The AI analyzes user messages to determine intent using keyword matching:

### Intent Types
1. **create_routine** - Keywords: "routine", "morning", "schedule", "plan"
   - Response includes sample routine structure
   - Quick action to navigate to routine creation

2. **create_todo** - Keywords: "todo", "task", "remind", "don't forget"
   - Response includes task creation suggestion
   - Extracts title, priority, and due date from message

3. **search_products** - Keywords: "buy", "product", "shop", "looking for"
   - Navigates to shop with search query
   - Filters by category if mentioned

4. **search_users** - Keywords: "find user", "follow", "discover", "people"
   - Navigates to discover page
   - Searches for users matching query

5. **search_posts** - Keywords: "search posts", "find posts", "moments"
   - Navigates to home feed
   - Searches for posts matching query

6. **feature_guide** - Keywords: "help", "guide", "how to", "tutorial"
   - Provides step-by-step guides for features
   - Levels: beginner, intermediate, advanced

7. **general_chat** - Default for other messages
   - Helpful, conversational responses
   - Encourages feature usage

## Integration Points

### Mobile Integration
**File**: `mobile/src/screens/MessagesScreen.tsx`

```typescript
// AI Assistant appears as first conversation in inbox
const aiConversation = {
  id: 'ai-assistant',
  participantName: 'AI Assistant',
  lastMessage: "Hi! I'm here to help...",
  lastMessageTime: Date.now(),
  unreadCount: 0,
};

// Action handling
onActionDetected={async (action, data) => {
  const result = await aiActionHandlers.handleAction(
    { type: action, payload: data },
    userId
  );
}}
```

### Web Integration
**File**: `web/src/pages/MessagesPage.tsx`

- AI Assistant appears at top of conversation list
- Full chat interface in main content area
- Same action handling as mobile

## User Preferences

The AI learns from user preferences stored in conversation context:

```typescript
interface ConversationContext {
  userId: string;
  messageHistory: AIMessage[];
  preferences: {
    wakeUpTime?: string;
    fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
    goals?: string[];
    interests?: string[];
    timezone?: string;
  };
  lastInteraction?: Date;
}
```

## Quick Actions

Quick action buttons in the chat interface for common tasks:

1. **📅 Routine** - Navigate to routine creation
2. **✅ Todo** - Navigate to todo/task creation
3. **🛍️ Shop** - Navigate to shop
4. **🎓 Guide** - Show general feature guide
5. **🗑️ Clear** - Clear conversation history

## Data Flow

```
User Message
    ↓
useAIAssistant hook
    ↓
aiAssistantService.processMessage()
    ↓
analyzeIntent() → Intent Type
    ↓
generateResponse() → AI Response + Action Data
    ↓
AIMessageBubble renders → User sees response
    ↓
If action present:
    → onActionDetected callback
    → aiActionHandlers.handleAction()
    → Navigation or feature execution
```

## Customization

### Adding New Intents
1. Update `analyzeIntent()` in `aiAssistantService.ts`
2. Add new intent type to `ActionData` type
3. Create handler in `aiActionHandlers.ts`
4. Update intent detection keywords

### Customizing Responses
Responses are generated in `generateResponse()` method. Customize the template for each intent type:

```typescript
generateRoutineResponse(): string {
  // Customize routine suggestions
  // Include wake times, activity types, duration
}

generateTodoResponse(): string {
  // Customize todo suggestions
  // Include priority, categories, due dates
}
```

### Updating Guides
Feature guides are stored in `aiActionHandlers.ts`:

```typescript
const guides: Record<string, Record<string, any>> = {
  routines: {
    beginner: { /* guide content */ }
  }
}
```

## Testing Scenarios

### Scenario 1: Create Morning Routine
**User**: "Can you help me create a morning routine? I wake up at 6am"
**Expected**:
- AI recognizes intent as `create_routine`
- Suggests routine structure
- Offers to navigate to routine creation
- User confirms → Navigates to Dashboard

### Scenario 2: Create Todo
**User**: "I need to finish the project report by Friday"
**Expected**:
- AI recognizes intent as `create_todo`
- Extracts title: "Finish project report"
- Sets due date: Friday
- Offers to create task
- User confirms → Task created, navigates to Dashboard

### Scenario 3: Search Products
**User**: "I'm looking for running shoes"
**Expected**:
- AI recognizes intent as `search_products`
- Confirms search intent
- Navigates to Shop with search query "running shoes"

### Scenario 4: Discover Users
**User**: "Can you help me find fitness enthusiasts?"
**Expected**:
- AI recognizes intent as `search_users`
- Suggests discovering users interested in fitness
- Navigates to Discover page

### Scenario 5: Get Feature Guide
**User**: "How do I use routines?"
**Expected**:
- AI recognizes intent as `feature_guide`
- Provides beginner-level guide for routines
- Shows step-by-step instructions

### Scenario 6: General Conversation
**User**: "That's awesome! Thanks for the help"
**Expected**:
- AI recognizes as general chat
- Provides friendly, encouraging response
- No action triggered

## Performance Considerations

1. **Message Rendering**: FlatList for efficient rendering of long conversations
2. **Conversation Storage**: Stored per userId, cleared on logout
3. **Intent Analysis**: Lightweight string matching, O(1) complexity
4. **Navigation**: Queued to prevent race conditions
5. **Error Handling**: Graceful fallbacks for failed actions

## Security & Privacy

1. **User Data**: Conversation context stored locally, not on server (in current implementation)
2. **Message History**: User preferences stored encrypted
3. **Actions**: Validated before execution
4. **Error Messages**: Generic user-facing error messages, detailed logs server-side

## Future Enhancements

1. **ML-based Intent Recognition**: Replace keyword matching with ML model
2. **Conversation Memory**: Persist conversation history across sessions
3. **Multi-turn Dialogs**: More complex conversation flows
4. **User Feedback**: Rate AI responses to improve
5. **Custom Routines**: Learn from user routine preferences
6. **Integration with Calendar**: Sync routines with calendar
7. **Notifications**: Reminders for routines and todos
8. **Voice Input**: Convert voice to text for messages
9. **Multi-language Support**: Support multiple languages
10. **Contextual Help**: Provide help based on current screen

## Debugging

### Enable Detailed Logging
```typescript
// In aiAssistantService.ts
console.log('Intent detected:', intent);
console.log('Response:', response);
console.log('Action:', action);
```

### Monitor Conversation State
```typescript
// In MessagesScreen
useEffect(() => {
  console.log('AI Messages:', messages);
  console.log('Loading:', loading);
  console.log('Error:', error);
}, [messages, loading, error]);
```

### Test Action Handlers
```typescript
// Direct testing in debugger
const result = await aiActionHandlers.handleAction(
  { type: 'create_routine', payload: { wakeTime: '06:00' } },
  'user_123'
);
console.log(result);
```
