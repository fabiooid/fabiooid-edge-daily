import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, getLatestPost, getAllPosts, getPostBySlug, updatePostLinks } from './database.js';
import { startScheduler } from './scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database when server starts
initializeDatabase();

// Start scheduler
startScheduler();

app.use(cors());
app.use(express.json());

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



app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});