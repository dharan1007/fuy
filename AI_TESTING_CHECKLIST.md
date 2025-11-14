# AI Assistant Testing Checklist

## Pre-Testing Setup
- [ ] All services created and imported correctly
- [ ] Navigation service initialized
- [ ] Action handlers registered
- [ ] Mock data populated for conversations
- [ ] Development server running
- [ ] No TypeScript errors in console

## Mobile Testing

### 1. UI/UX Testing

#### Messages Screen
- [ ] AI Assistant appears as first conversation in inbox
- [ ] AI Assistant has robot emoji (🤖) avatar
- [ ] AI Assistant has sparkle indicator (✨)
- [ ] Unread count badge not shown for AI (0)
- [ ] AI conversation displays "Hi! I'm here to help..." message
- [ ] Click on AI conversation opens modal
- [ ] Modal slides in smoothly
- [ ] Modal close button (✕) works
- [ ] Modal close button positioned correctly (top right)

#### Chat Interface
- [ ] Chat header shows "🤖 AI Assistant"
- [ ] Messages list is scrollable
- [ ] Messages auto-scroll to bottom when new message arrives
- [ ] User messages appear on right in coral background
- [ ] AI messages appear on left in glass background
- [ ] Timestamps display correctly for all messages
- [ ] Typing indicator shows "AI is typing..." with animated dots
- [ ] Empty state shows with greeting text
- [ ] Error message displays in coral glass surface if error occurs
- [ ] Input field is visible and focusable
- [ ] Send button (✈️) is visible and clickable
- [ ] Input text updates as user types
- [ ] Input clears after message sent

#### Quick Actions
- [ ] 📅 Routine button is visible
- [ ] ✅ Todo button is visible
- [ ] 🛍️ Shop button is visible
- [ ] 🎓 Guide button is visible
- [ ] 🗑️ Clear button is visible
- [ ] All buttons are clickable
- [ ] Buttons have hover effect

### 2. Conversation Testing

#### Message Handling
- [ ] User can type message in input field
- [ ] Message sends on button press
- [ ] Sending empty message is prevented
- [ ] Multiple messages can be sent in sequence
- [ ] Conversation history is displayed
- [ ] Old messages scroll up when new ones arrive
- [ ] Can scroll up to see previous messages

#### AI Response Generation
- [ ] AI responds to general greetings
- [ ] AI provides helpful, contextual responses
- [ ] Response text is readable and formatted
- [ ] Response includes emoji where appropriate
- [ ] Response length is reasonable (not too long)
- [ ] Typing delay simulates natural conversation

### 3. Intent Recognition Testing

#### Create Routine Intent
- [ ] Message: "help me create a morning routine"
  - [ ] AI recognizes as routine creation
  - [ ] Suggests routine structure
  - [ ] Shows wake time, activities, duration
- [ ] Message: "I wake up at 6am, can you create a schedule?"
  - [ ] AI extracts wake time (6am)
  - [ ] Suggests activities for morning
- [ ] Message: "I need a fitness routine"
  - [ ] AI recognizes fitness context
  - [ ] Suggests fitness-focused activities

#### Create Todo Intent
- [ ] Message: "remind me to finish the report"
  - [ ] AI recognizes as todo creation
  - [ ] Extracts task: "Finish the report"
  - [ ] Suggests adding to todo list
- [ ] Message: "I have to finish my project by Friday"
  - [ ] AI extracts task and due date
  - [ ] Recognizes Friday as due date

#### Search Products Intent
- [ ] Message: "I'm looking for running shoes"
  - [ ] AI recognizes product search intent
  - [ ] Shows shop search suggestion
- [ ] Message: "Can you help me find products?"
  - [ ] AI asks what type of products

#### Search Users Intent
- [ ] Message: "help me find fitness enthusiasts"
  - [ ] AI recognizes user search intent
  - [ ] Suggests discovering users
- [ ] Message: "I want to meet people interested in yoga"
  - [ ] AI recognizes yoga interest context

#### Search Posts Intent
- [ ] Message: "search for posts about travel"
  - [ ] AI recognizes post search intent
  - [ ] Suggests searching feed
- [ ] Message: "find popular posts"
  - [ ] AI offers to search posts

#### Feature Guide Intent
- [ ] Message: "How do I use routines?"
  - [ ] AI recognizes help request
  - [ ] Offers guide for routines
- [ ] Message: "I need help with tasks"
  - [ ] AI recognizes help for todos
  - [ ] Offers guide for task management

#### General Chat Intent
- [ ] Message: "That's awesome!"
  - [ ] AI recognizes as general chat
  - [ ] Provides encouraging response
- [ ] Message: "Thanks for the help"
  - [ ] AI acknowledges thanks
  - [ ] Provides friendly response

### 4. Action Handler Testing

#### Create Routine Action
- [ ] User requests "Create my morning routine"
  - [ ] AI detects action
  - [ ] onActionDetected callback fires
  - [ ] Action type is 'create_routine'
  - [ ] Payload contains routine data
  - [ ] Handler creates routine object
  - [ ] Navigation to Dashboard occurs (or confirmation modal)
  - [ ] Success message displays

#### Create Todo Action
- [ ] User requests "Add task to my list"
  - [ ] AI detects action
  - [ ] onActionDetected callback fires
  - [ ] Action type is 'create_todo'
  - [ ] Payload contains todo data
  - [ ] Handler creates todo object
  - [ ] Navigation to Dashboard occurs
  - [ ] Success message displays

#### Search Actions
- [ ] Product search action
  - [ ] Navigates to Shop or search results
  - [ ] Search query passed correctly
- [ ] User search action
  - [ ] Navigates to Discover page
  - [ ] Search query passed correctly
- [ ] Post search action
  - [ ] Navigates to Home/Feed
  - [ ] Search query passed correctly

#### Feature Guide Action
- [ ] Guide button pressed
  - [ ] onActionDetected fires with 'feature_guide'
  - [ ] Guide content displays correctly
  - [ ] Navigation occurs to guide screen

#### Quick Actions
- [ ] 📅 Routine button
  - [ ] Navigates to routine creation
  - [ ] No error in console
- [ ] ✅ Todo button
  - [ ] Navigates to todo/task creation
  - [ ] No error in console
- [ ] 🛍️ Shop button
  - [ ] Navigates to shop
  - [ ] No error in console
- [ ] 🎓 Guide button
  - [ ] Opens feature guide modal
  - [ ] No error in console
- [ ] 🗑️ Clear button
  - [ ] Clears all messages
  - [ ] Only AI greeting remains
  - [ ] Conversation context cleared

### 5. Error Handling Testing

- [ ] Invalid action type shows error alert
- [ ] Failed navigation shows error alert
- [ ] Network error gracefully handled
- [ ] Error messages are user-friendly
- [ ] Console shows detailed error logs
- [ ] Conversation continues after error

### 6. Visual Design Testing

#### Glass Morphism
- [ ] AI message background is semi-transparent glass
- [ ] User message background is coral (#FF7A5C)
- [ ] Chat background has gradient
- [ ] Input field has glass effect
- [ ] Buttons have proper shadow
- [ ] Modal backdrop is blurred

#### Typography
- [ ] Messages use correct font sizes
- [ ] Timestamps use Caption styling (12px, gray)
- [ ] Header uses TitleM styling
- [ ] Input placeholder text is visible
- [ ] Text color contrasts are readable

#### Spacing & Layout
- [ ] Messages have proper padding
- [ ] Gaps between messages are consistent
- [ ] Quick action buttons have even spacing
- [ ] Input area aligned correctly
- [ ] Modal takes up full screen
- [ ] No text overflow or clipping

### 7. State Management Testing

- [ ] Messages persist while chat open
- [ ] Typing indicator works correctly
- [ ] Loading state displays
- [ ] Error state displays
- [ ] Clear button actually clears state
- [ ] Multiple conversations don't interfere

### 8. Integration Testing

#### With Messages Page
- [ ] AI conversation doesn't break message list
- [ ] Selecting other conversations works
- [ ] Switching back to AI resumes conversation
- [ ] Conversation count updates correctly
- [ ] Unread badge works correctly

#### With Navigation
- [ ] Navigation to other screens works
- [ ] Going back returns to messages
- [ ] Tab navigation works
- [ ] Deep linking works if implemented

## Web Testing

### 1. UI/UX Testing

#### Messages Page
- [ ] AI Assistant in sidebar conversation list
- [ ] Robot emoji avatar visible
- [ ] Click opens chat in main area
- [ ] Sparkle indicator visible
- [ ] Conversation list scrolls if many items
- [ ] Sidebar width is 320px
- [ ] Main content area takes remaining space

#### Chat Interface
- [ ] Chat header shows AI Assistant info
- [ ] Messages display in scrollable area
- [ ] User messages right-aligned, coral background
- [ ] AI messages left-aligned, glass background
- [ ] Typing indicator animates
- [ ] Auto-scroll to latest message
- [ ] Input field visible at bottom
- [ ] Send button clickable
- [ ] Quick actions layout correctly

### 2. Responsive Design Testing

#### Desktop (1920px+)
- [ ] Sidebar visible
- [ ] Chat area takes full width
- [ ] No horizontal scrolling
- [ ] All text readable
- [ ] Buttons appropriately sized

#### Tablet (768px-1024px)
- [ ] Sidebar collapses if needed
- [ ] Messages still readable
- [ ] Input area accessible
- [ ] No overlapping elements

#### Mobile (320px-640px)
- [ ] Sidebar hidden or collapsed
- [ ] Full-width messages
- [ ] Touch-friendly button sizes
- [ ] Input field not covered by keyboard
- [ ] All content accessible

### 3. Browser Compatibility
- [ ] Chrome/Edge - Full functionality
- [ ] Firefox - Full functionality
- [ ] Safari - Full functionality
- [ ] Mobile browsers - Responsive layout

### 4. Performance Testing
- [ ] Page loads quickly
- [ ] Messages render smoothly
- [ ] No lag when typing
- [ ] Scrolling is smooth
- [ ] Images load correctly
- [ ] No memory leaks on long conversations

## Edge Cases & Special Scenarios

### Boundary Testing
- [ ] Very long message (100+ chars)
- [ ] Many messages (100+) in conversation
- [ ] Special characters in message
- [ ] Emoji in message
- [ ] HTML/code in message (should escape)
- [ ] Very fast message sending
- [ ] Network timeout during send

### User Flow Testing
- [ ] User opens AI, sends message, closes modal
- [ ] User creates routine through AI
- [ ] User searches for products through AI
- [ ] User gets feature guide from AI
- [ ] User clears conversation and starts fresh
- [ ] User switches between AI and other conversations
- [ ] User dismisses error and continues

## Accessibility Testing

- [ ] Screen reader reads messages correctly
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG standards
- [ ] Alt text for emojis/icons
- [ ] Form labels present
- [ ] Error messages announced

## Performance Benchmarks

- [ ] Initial load time < 2s
- [ ] Message send response < 1s
- [ ] Conversation history load < 1s
- [ ] Memory usage stable after 100 messages
- [ ] CPU usage minimal during idle
- [ ] Battery consumption reasonable (mobile)

## Known Limitations & Notes

- [ ] Intent recognition uses keyword matching (not ML)
- [ ] Conversation history not persisted to server (local only)
- [ ] Actions are mocked/navigation only (no actual creation)
- [ ] Single user context (userId hardcoded for testing)
- [ ] No voice input (text only)
- [ ] English language only

## Test Results Summary

| Category | Status | Notes |
|----------|--------|-------|
| UI/UX (Mobile) | | |
| Conversation (Mobile) | | |
| Intent Recognition | | |
| Action Handlers | | |
| Error Handling | | |
| Visual Design | | |
| State Management | | |
| Integration | | |
| UI/UX (Web) | | |
| Responsive Design | | |
| Performance | | |
| Accessibility | | |

## Sign-Off

- [ ] All critical tests passed
- [ ] All high-priority tests passed
- [ ] No blocking bugs remaining
- [ ] Performance acceptable
- [ ] Code review completed
- [ ] Documentation complete
- [ ] Ready for production

**Tested By**: ___________________
**Date**: ___________________
**Notes**: ___________________
