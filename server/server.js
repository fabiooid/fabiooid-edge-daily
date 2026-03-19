import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initializeDatabase, getLatestPost, getAllPosts, getPostBySlug, createPost } from './database.js';
import { startScheduler } from './scheduler.js';

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





// Temporary: publish today's missed Energy post
app.post('/api/fix-today', requireApiKey, async (req, res) => {
  try {
    const post = await createPost(
      'Energy',
      "Japan Restarts World's Largest Nuclear Plant After 15-Year Shutdown",
      `Japan has successfully restarted Unit 6 at the Kashiwazaki-Kariwa Nuclear Power Station, marking a historic milestone in the country's nuclear energy recovery. On February 9, 2026, Japan restarted Unit 6 of its largest nuclear power plant, the Kashiwazaki-Kariwa Nuclear Power Station in Niigata Prefecture, which was shut down following the 2011 Fukushima tsunami and nuclear accident. This is the first reactor operated by Tokyo Electric Power Company (TEPCO) to come back online since the 2011 disaster that devastated public trust in nuclear energy.

The restart represents more than just flipping a switch back on. Unit 6 will produce an estimated 9,500 gigawatt-hours of electricity annually once fully operating. With 1,356 megawatts of installed capacity, it could displace approximately 1.3 million tons of liquefied natural gas imports annually — enough to power over one million households in the Tokyo region while significantly reducing Japan's dependence on expensive fossil fuel imports.

This restart is part of Japan's broader strategy to rebuild its nuclear capacity, aiming to generate 20% of electricity from nuclear power by 2040, up from the current 9%. The success of this unit could pave the way for bringing more reactors online across the country, reshaping Japan's energy mix for decades to come.`,
      [
        { title: "Japan's Biggest Nuclear Plant Restarts Second Time After Hiccup", url: "https://www.bloomberg.com/news/articles/2026-02-09/japan-s-biggest-nuclear-plant-restarts-second-time-after-hiccup" },
        { title: "Japan to restart world's biggest nuclear plant after 15-year shutdown", url: "https://www.aljazeera.com/news/2026/1/21/japan-to-restart-worlds-biggest-nuclear-plant-after-15-year-shutdown" },
        { title: "Nuclear reactor restart in Japan will likely displace natural gas electricity generation", url: "https://www.eia.gov/todayinenergy/detail.php?id=67244" }
      ],
      '2026-03-19'
    );
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});