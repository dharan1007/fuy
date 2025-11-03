# Push Notifications - Free Alternatives Guide

## 📱 Available Options (ALL FREE)

### 1. **Expo Push Notifications** ⭐ RECOMMENDED
**Cost**: FREE (completely included with Expo)
**Best for**: Quick setup, testing, small to medium apps

#### Pros:
- ✅ **Completely free** - No limits on messages
- ✅ Built-in with Expo - No extra setup
- ✅ Works seamlessly with EAS
- ✅ Easy device token management
- ✅ Local notifications support
- ✅ Simple API

#### Cons:
- ❌ Less analytics than alternatives
- ❌ Limited scheduling features
- ❌ Not suitable for very large scale (100M+ users)

#### Setup (5 minutes):

```typescript
// 1. Install packages (already installed with Expo)
// expo-notifications, expo-device are included

// 2. Configure in app.json (optional):
{
  "expo": {
    "plugins": ["expo-notifications"]
  }
}

// 3. Initialize in your app:
import { expoNotificationsService } from '@/services/expoNotificationsService';
import { useNotifications } from '@/hooks/useNotifications';

// In your App.tsx or component:
const { isReady, deviceToken } = useNotifications();

// 4. Send a notification:
const { sendLocalNotification } = useNotifications();

sendLocalNotification(
  'New Message',
  'You have a new message from Alice',
  { conversationId: '123', type: 'message' }
);
```

---

### 2. **OneSignal** ⭐⭐ BEST FOR SCALE
**Cost**: FREE for 50K subscribers
**Best for**: Growing apps, segmentation, analytics

#### Pros:
- ✅ **Free tier: 50,000 subscribers**
- ✅ Unlimited messages
- ✅ Advanced segmentation
- ✅ A/B testing
- ✅ Rich analytics dashboard
- ✅ Email + SMS included
- ✅ Automation workflows
- ✅ Web push notifications
- ✅ Great documentation

#### Cons:
- ⚠️ Requires additional setup
- ⚠️ Extra SDK to install
- ⚠️ SDK adds ~2MB to bundle

#### Cost Comparison:
```
Firebase: Free tier has limits, paid starts at custom pricing
OneSignal: 50K subs free, then $99/month for unlimited
```

#### Setup (10 minutes):

```bash
# 1. Install OneSignal
npm install onesignal-react-native

# 2. Prebuild
npx expo prebuild

# 3. Update app.json:
{
  "plugins": [
    [
      "onesignal-react-native",
      {
        "mode": "production"
      }
    ]
  ]
}

# 4. Sign up at https://onesignal.com (free)
# 5. Copy App ID and REST API Key
```

```typescript
// 3. Initialize in your app:
import { oneSignalService } from '@/services/oneSignalService';

await oneSignalService.initialize({
  appId: 'YOUR_APP_ID',
  restApiKey: 'YOUR_REST_API_KEY',
});

// 4. Send from backend:
await oneSignalService.sendNotificationToSegment('All', {
  title: 'Welcome!',
  content: 'Welcome to FUY',
  data: { type: 'welcome' }
});
```

---

### 3. **Novu** (Self-Hosted)
**Cost**: FREE (open-source)
**Best for**: Privacy-conscious, full control

#### Pros:
- ✅ **Open-source, completely free**
- ✅ Self-hosted option available
- ✅ Multi-channel (push, email, SMS, chat)
- ✅ No vendor lock-in
- ✅ Excellent for privacy

#### Cons:
- ❌ Requires backend setup
- ❌ Steeper learning curve
- ❌ Smaller community

#### Link: https://novu.co/

---

### 4. **Pusher Beams**
**Cost**: FREE tier available
**Best for**: Real-time applications

#### Pros:
- ✅ Free tier available
- ✅ Real-time capabilities
- ✅ Good documentation
- ✅ Multi-platform

#### Cons:
- ⚠️ Free tier limitations
- ⚠️ Pricing escalates quickly

#### Link: https://pusher.com/beams

---

### 5. **AWS SNS**
**Cost**: FREE tier (1M requests/month)
**Best for**: Existing AWS users

#### Pros:
- ✅ AWS free tier: 1M SNS notifications/month
- ✅ Integrates with AWS ecosystem
- ✅ Scalable

#### Cons:
- ⚠️ Complex setup
- ⚠️ Requires AWS account
- ⚠️ AWS knowledge needed

#### Cost:
```
Free: 1M notifications/month
Paid: $0.50 per 100K notifications after
```

---

## 🚀 Recommended Setup for Your App

### Option A: Expo Only (Simplest)
```typescript
// Perfect for MVP and testing
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { sendLocalNotification } = useNotifications();

  const handleNewMessage = () => {
    sendLocalNotification(
      'New Message',
      'From Alice',
      { conversationId: '123' }
    );
  };

  return <Button onPress={handleNewMessage}>Send</Button>;
}
```

**Cost**: $0/month
**Subscribers**: Unlimited
**Messages**: Unlimited

---

### Option B: OneSignal (Recommended for Growth)
```typescript
// Perfect for production apps
import { oneSignalService } from '@/services/oneSignalService';

await oneSignalService.initialize({
  appId: 'YOUR_APP_ID',
  restApiKey: 'YOUR_REST_API_KEY',
});

// Send to all users
await oneSignalService.sendNotificationToSegment('All', {
  title: 'New Feature Released!',
  content: 'Check out the new Canvas feature',
  data: { type: 'feature' }
});

// Send to specific users
await oneSignalService.sendNotificationViaAPI(['user123', 'user456'], {
  title: 'Personal Message',
  content: 'You have a new message',
  data: { type: 'message', conversationId: '789' }
});
```

**Cost**: $0/month for 50K users, then $99/month
**Subscribers**: 50,000 free
**Messages**: Unlimited

---

### Option C: Hybrid (Expo + OneSignal)
```typescript
// Use Expo for local/testing, OneSignal for production

import { useNotifications } from '@/hooks/useNotifications';
import { oneSignalService } from '@/services/oneSignalService';

export function useSmartNotifications() {
  const { sendLocalNotification } = useNotifications();

  const sendNotification = async (title: string, body: string, data?: any) => {
    if (__DEV__) {
      // Development: Use Expo (faster, local)
      sendLocalNotification(title, body, data);
    } else {
      // Production: Use OneSignal (persistent, scheduled)
      await oneSignalService.sendNotificationToSegment('All', {
        title,
        content: body,
        data,
      });
    }
  };

  return { sendNotification };
}
```

---

## 📊 Comparison Table

| Feature | Expo | OneSignal | Novu | AWS SNS |
|---------|------|-----------|------|---------|
| **Cost** | FREE | FREE (50K) | FREE | FREE (1M/mo) |
| **Setup Time** | 5 min | 10 min | 30 min | 20 min |
| **Analytics** | Basic | Excellent | Good | Basic |
| **Segmentation** | No | Yes | Yes | No |
| **A/B Testing** | No | Yes | No | No |
| **Scheduling** | Basic | Advanced | Advanced | Basic |
| **Email** | No | Yes | Yes | No |
| **SMS** | No | Limited | Yes | Yes |
| **Automation** | No | Yes | Yes | No |
| **Multi-platform** | Yes | Yes | Yes | Yes |
| **Self-hosted** | No | No | Yes | No |
| **Best For** | MVP | Production | Privacy | AWS Users |

---

## 🎯 Usage Examples

### Example 1: Send New Message Notification
```typescript
// When a message arrives via WebSocket
webSocketService.on(WS_EVENTS.NEW_MESSAGE, (message) => {
  sendNotification(
    'New Message',
    `From ${message.senderName}`,
    {
      type: 'message',
      conversationId: message.conversationId,
      senderId: message.senderId
    }
  );
});
```

### Example 2: Challenge Completion Notification
```typescript
// When user completes a challenge
const handleCompleteChallenge = async (challengeId: string) => {
  await useEssenz().completeChallenge(challengeId);

  sendNotification(
    '🎉 Challenge Completed!',
    'You earned 500 points',
    {
      type: 'challenge',
      challengeId,
      pointsEarned: '500'
    }
  );
};
```

### Example 3: New Post in Feed
```typescript
// When user's friend posts
webSocketService.on(WS_EVENTS.NEW_POST, (post) => {
  sendNotification(
    `${post.authorName} posted`,
    post.content.substring(0, 50) + '...',
    {
      type: 'post',
      postId: post.id,
      authorId: post.authorId
    }
  );
});
```

### Example 4: Ranking Update
```typescript
// When user moves up in leaderboard
webSocketService.on(WS_EVENTS.RANK_UPDATE, (rankData) => {
  if (rankData.previousRank > rankData.newRank) {
    sendNotification(
      `🏆 Rank Up!`,
      `You're now #${rankData.newRank}`,
      {
        type: 'ranking',
        newRank: rankData.newRank
      }
    );
  }
});
```

---

## 🔌 Backend Integration

### With OneSignal (Recommended)

```javascript
// Backend (Node.js/Express example)

app.post('/api/notifications/send', async (req, res) => {
  const { playerId, title, content, data } = req.body;

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        include_player_ids: [playerId],
        headings: { en: title },
        contents: { en: content },
        data: data
      })
    });

    res.json(await response.json());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## ✅ My Recommendation

### For Your FUY App:

**Phase 1 (MVP)**: Use **Expo Push Notifications**
- ✅ Zero setup, already working
- ✅ Free forever
- ✅ Perfect for testing

**Phase 2 (Growth)**: Migrate to **OneSignal**
- ✅ Still FREE for 50K users
- ✅ Advanced features (segmentation, analytics)
- ✅ Easy to implement alongside Expo
- ✅ Future-proof

**Cost Breakdown**:
```
Expo Only: $0/month
OneSignal (50K users): $0/month
OneSignal (500K users): $99/month
Firebase: $$$+ (expensive)
```

---

## 🚀 Quick Start (Expo)

```bash
# 1. Already installed, just use:
npm start

# 2. In your component:
import { useNotifications } from '@/hooks/useNotifications';

function NotificationTest() {
  const { sendLocalNotification, scheduleNotification } = useNotifications();

  return (
    <>
      <Button
        title="Test Notification"
        onPress={() => sendLocalNotification('Title', 'Body')}
      />
      <Button
        title="Schedule in 5s"
        onPress={() => scheduleNotification('Delayed', 'In 5 seconds', 5)}
      />
    </>
  );
}
```

---

## 📚 Resources

- **Expo Notifications**: https://docs.expo.dev/versions/latest/sdk/notifications/
- **OneSignal**: https://onesignal.com (free signup)
- **Novu**: https://novu.co (open source)
- **AWS SNS**: https://aws.amazon.com/sns/

---

**TL;DR**: Use Expo now (free), switch to OneSignal later when you need advanced features (still free for 50K users). Never pay for Firebase! 🎉
