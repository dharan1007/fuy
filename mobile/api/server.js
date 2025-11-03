import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

// ---- Config ----
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_TTL_MINS = 30;

// ---- In-memory DB ----
/** @type {Record<string, any>} */
const users = {}; // by email
/** @type {Record<string, string>} */
const refreshIndex = {}; // refreshToken -> email

// Seed demo user
const demoEmail = 'demo@example.com';
const demoPassword = 'password'; // NOTE: lower-case; match your LoginScreen hint
const demoUser = {
  id: uuid(),
  email: demoEmail,
  firstName: 'Demo',
  lastName: 'User',
  image: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
users[demoEmail] = { ...demoUser, _password: demoPassword };

// ---- Helpers ----
function signAccess(email) {
  return jwt.sign({ sub: email, typ: 'access' }, JWT_SECRET, { expiresIn: `${ACCESS_TTL_MINS}m` });
}
function signRefresh(email) {
  const token = jwt.sign({ sub: email, typ: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
  refreshIndex[token] = email;
  return token;
}
function sanitizeUser(u) {
  const { _password, ...rest } = u;
  return rest;
}
function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.typ !== 'access') throw new Error('Invalid token type');
    req.userEmail = payload.sub;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}

// ---- Routes ----
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  const record = users[email?.toLowerCase()];
  if (!record || record._password !== password) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  const accessToken = signAccess(record.email);
  const refreshToken = signRefresh(record.email);
  return res.json({
    success: true,
    data: {
      user: sanitizeUser(record),
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TTL_MINS * 60
    },
    message: 'Logged in'
  });
});

app.post('/auth/signup', (req, res) => {
  const { email, password, firstName = '', lastName = '' } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  const key = email.toLowerCase();
  if (users[key]) {
    return res.status(409).json({ success: false, error: 'Email already registered' });
  }
  const user = {
    id: uuid(),
    email: key,
    firstName,
    lastName,
    image: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  users[key] = { ...user, _password: password };
  const accessToken = signAccess(key);
  const refreshToken = signRefresh(key);
  return res.status(201).json({
    success: true,
    data: { user, accessToken, refreshToken, expiresIn: ACCESS_TTL_MINS * 60 },
    message: 'Account created'
  });
});

app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'refreshToken is required' });
  }
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    if (payload.typ !== 'refresh') throw new Error('Invalid token type');
    const email = refreshIndex[refreshToken] || payload.sub;
    if (!email || !users[email]) throw new Error('Unknown refresh token');
    const accessToken = signAccess(email);
    return res.json({
      success: true,
      data: { accessToken, expiresIn: ACCESS_TTL_MINS * 60 },
      message: 'Token refreshed'
    });
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

app.post('/auth/logout', (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken && refreshIndex[refreshToken]) {
    delete refreshIndex[refreshToken];
  }
  return res.json({ success: true, message: 'Logged out' });
});

app.get('/me', authMiddleware, (req, res) => {
  const record = users[req.userEmail];
  if (!record) return res.status(404).json({ success: false, error: 'User not found' });
  return res.json({ success: true, data: sanitizeUser(record) });
});

app.put('/users/:id/profile', authMiddleware, (req, res) => {
  const { id } = req.params;
  const record = users[req.userEmail];
  if (!record || record.id !== id) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  const updates = req.body || {};
  const updated = {
    ...record,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  // never allow changing email via this route
  updated.email = record.email;
  // reattach password
  users[req.userEmail] = { ...updated, _password: record._password };
  return res.json({ success: true, data: sanitizeUser(users[req.userEmail]) });
});

app.post('/users/:id/change-password', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body || {};
  const record = users[req.userEmail];
  if (!record || record.id !== id) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Both oldPassword and newPassword are required' });
  }
  if (record._password !== oldPassword) {
    return res.status(400).json({ success: false, error: 'Old password is incorrect' });
  }
  users[req.userEmail] = { ...record, _password: newPassword, updatedAt: new Date().toISOString() };
  return res.json({ success: true, message: 'Password changed' });
});

// Passkey mock (no-op but matches your calls)
app.post('/auth/passkey/register/init', authMiddleware, (req, res) => {
  return res.json({
    success: true,
    data: { challenge: 'mock-challenge', rpId: 'localhost', userId: req.userEmail }
  });
});

app.post('/auth/passkey/register/verify', authMiddleware, (_req, res) => {
  return res.json({ success: true, message: 'Passkey registered' });
});

// ---- In-memory Posts DB ----
/** @type {Record<string, any>} */
const posts = {};
let postCount = 0;

// Seed demo posts
function createDemoPost(userId, feature, content) {
  const id = uuid();
  posts[id] = {
    id,
    userId,
    feature,
    content,
    visibility: 'PUBLIC',
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      id: userId,
      email: demoEmail,
      profile: { displayName: 'Demo User', avatarUrl: '' }
    }
  };
  return posts[id];
}

// Seed some demo posts
createDemoPost(demoUser.id, 'JOURNAL', 'Just finished an amazing project! Feeling accomplished.');
createDemoPost(demoUser.id, 'JOY', 'Found joy in the simple things today - a good cup of coffee and great conversation.');
createDemoPost(demoUser.id, 'AWE', 'Witnessed the most beautiful sunset today. Nature never ceases to amaze me.');

// ---- Social Routes ----

// Get posts (feed)
app.get('/api/posts', authMiddleware, (req, res) => {
  const { scope = 'public', page = 1, pageSize = 10 } = req.query;
  const postList = Object.values(posts);

  // Simple filtering based on scope
  let filtered = postList;
  if (scope === 'friends') {
    // For demo, just return all posts
    filtered = postList;
  } else if (scope === 'me') {
    filtered = postList.filter(p => p.userId === demoUser.id);
  } else {
    // public scope - return all public posts
    filtered = postList.filter(p => p.visibility === 'PUBLIC');
  }

  const sorted = filtered.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return res.json({
    success: true,
    data: {
      items: sorted.slice(0, pageSize),
      total: sorted.length,
      hasMore: sorted.length > pageSize
    }
  });
});

// Get single post
app.get('/api/posts/:postId', authMiddleware, (req, res) => {
  const { postId } = req.params;
  const post = posts[postId];
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }
  return res.json({ success: true, data: post });
});

// Create post
app.post('/api/posts', authMiddleware, (req, res) => {
  const { feature = 'OTHER', content, visibility = 'PUBLIC' } = req.body || {};
  if (!content) {
    return res.status(400).json({ success: false, error: 'Content is required' });
  }

  const id = uuid();
  const newPost = {
    id,
    userId: demoUser.id,
    feature,
    content,
    visibility,
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      id: demoUser.id,
      email: demoEmail,
      profile: { displayName: 'Demo User', avatarUrl: '' }
    }
  };

  posts[id] = newPost;
  return res.status(201).json({ success: true, data: newPost });
});

// Update post
app.put('/api/posts/:postId', authMiddleware, (req, res) => {
  const { postId } = req.params;
  const post = posts[postId];
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }
  if (post.userId !== demoUser.id) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  const updated = {
    ...post,
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  posts[postId] = updated;
  return res.json({ success: true, data: updated });
});

// Delete post
app.delete('/api/posts/:postId', authMiddleware, (req, res) => {
  const { postId } = req.params;
  const post = posts[postId];
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }
  if (post.userId !== demoUser.id) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  delete posts[postId];
  return res.json({ success: true, message: 'Post deleted' });
});

// Like post
app.post('/api/posts/:postId/like', authMiddleware, (req, res) => {
  const { postId } = req.params;
  const post = posts[postId];
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  post.likes = (post.likes || 0) + 1;
  post.updatedAt = new Date().toISOString();
  return res.json({ success: true, data: post });
});

// Unlike post
app.delete('/api/posts/:postId/like', authMiddleware, (req, res) => {
  const { postId } = req.params;
  const post = posts[postId];
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  post.likes = Math.max(0, (post.likes || 1) - 1);
  post.updatedAt = new Date().toISOString();
  return res.json({ success: true, data: post });
});

// Get comments
app.get('/api/posts/:postId/comments', authMiddleware, (req, res) => {
  const { postId } = req.params;
  const post = posts[postId];
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  return res.json({
    success: true,
    data: {
      items: [],
      total: 0,
      hasMore: false
    }
  });
});

// Add comment
app.post('/api/posts/:postId/comments', authMiddleware, (req, res) => {
  const { postId } = req.params;
  const { content } = req.body || {};

  if (!content) {
    return res.status(400).json({ success: false, error: 'Content is required' });
  }

  const post = posts[postId];
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  const comment = {
    id: uuid(),
    postId,
    userId: demoUser.id,
    content,
    createdAt: new Date().toISOString()
  };

  post.comments = (post.comments || 0) + 1;
  return res.status(201).json({ success: true, data: comment });
});

// Delete comment
app.delete('/api/posts/:postId/comments/:commentId', authMiddleware, (req, res) => {
  const { postId } = req.params;
  const post = posts[postId];
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  post.comments = Math.max(0, (post.comments || 1) - 1);
  return res.json({ success: true, message: 'Comment deleted' });
});

// Share post
app.post('/api/posts/:postId/share', authMiddleware, (req, res) => {
  const { postId } = req.params;
  const post = posts[postId];
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  post.shares = (post.shares || 0) + 1;
  return res.json({ success: true, message: 'Post shared' });
});

// Get trending posts
app.get('/api/posts/trending', authMiddleware, (req, res) => {
  const { pageSize = 10 } = req.query;
  const postList = Object.values(posts);

  const sorted = postList.sort((a, b) =>
    (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares)
  );

  return res.json({
    success: true,
    data: {
      items: sorted.slice(0, pageSize),
      total: sorted.length,
      hasMore: false
    }
  });
});

// Get user posts
app.get('/api/users/:userId/posts', authMiddleware, (req, res) => {
  const { userId } = req.params;
  const { page = 1, pageSize = 10 } = req.query;

  const userPosts = Object.values(posts).filter(p => p.userId === userId);
  const sorted = userPosts.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return res.json({
    success: true,
    data: {
      items: sorted.slice(0, pageSize),
      total: sorted.length,
      hasMore: sorted.length > pageSize
    }
  });
});

// ---- Start ----
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
  console.log(`Demo login -> email: ${demoEmail}  password: ${demoPassword}`);
});
