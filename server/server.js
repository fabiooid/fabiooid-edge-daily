import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initializeDatabase, getLatestPost, getAllPosts, getPostBySlug, updatePostContent, deletePostById } from './database.js';
import { startScheduler, generateAndSavePost } from './scheduler.js';
import { runEval } from './eval.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database when server starts
initializeDatabase();

// Start scheduler
startScheduler();

app.set('trust proxy', 1);
app.use(cors({ origin: process.env.FRONTEND_URL || 'https://edgedaily.vercel.app' }));
app.use(express.json());
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

const requireApiKey = (req, res, next) => {
  if (req.headers['x-api-key'] !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
export { requireApiKey };

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Get latest post
app.get('/api/posts/latest', async (req, res) => {
  try {
    const post = await getLatestPost();
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch latest post' });
  }
});

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await getAllPosts();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get post by slug
app.get('/api/posts/:slug', async (req, res) => {
  try {
    const post = await getPostBySlug(req.params.slug);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});









app.post('/api/trigger-post', requireApiKey, async (req, res) => {
  const { theme, date } = req.body || {};
  res.json({ ok: true, message: 'Post generation started', theme: theme || 'auto', date: date || 'today' });
  generateAndSavePost(theme || null, date || null).catch(err => console.error('Manual trigger error:', err));
});

app.delete('/api/posts/:slug', requireApiKey, async (req, res) => {
  try {
    const post = await getPostBySlug(req.params.slug);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const result = await deletePostById(post.id);
    res.json({ deleted: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEMP: run eval on a post by slug
app.post('/api/run-eval/:slug', requireApiKey, async (req, res) => {
  try {
    const post = await getPostBySlug(req.params.slug);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ ok: true, message: `Eval started for: ${post.title}` });
    runEval(post, []).catch(err => console.error('Eval error:', err));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});