import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, getLatestPost, getAllPosts, getPostBySlug } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

// Temporary: patch broken links
app.post('/api/fix-links-2', (req, res) => {
  const db = new Database(path.join(__dirname, '../data/posts.db'));
  const fixes = [
    {
      slug: 'jd5a8gs',
      links: [
        { title: 'West Burton selected as home of STEP fusion plant', url: 'https://www.gov.uk/government/news/west-burton-selected-as-home-of-step-fusion-plant' },
        { title: 'DOE Explains: Fusion Energy Science', url: 'https://www.energy.gov/science/doe-explainsfusion-energy-science' },
        { title: 'Nuclear fusion energy milestone: UK reactor breaks record – CNN', url: 'https://www.cnn.com/2024/02/08/climate/nuclear-fusion-energy-milestone-climate/index.html' }
      ]
    },
    {
      slug: 'veeaxoq',
      links: [
        { title: 'AlphaFold 3: Google DeepMind AI model for biology', url: 'https://blog.google/innovation-and-ai/products/google-deepmind-isomorphic-alphafold-3-ai-model/' },
        { title: 'AlphaFold Server', url: 'https://alphafoldserver.com' },
        { title: 'AlphaFold 3: Google DeepMind maps a universe of biomolecules – STAT News', url: 'https://www.statnews.com/2024/05/08/drug-discovery-alphafold-3-google-deepmind-isomorphic-labs/' }
      ]
    },
    {
      slug: 'c2jy034',
      links: [
        { title: 'Solana on-chain data – Dune Analytics', url: 'https://dune.com/chains/solana' },
        { title: 'What are on-chain metrics? – Glassnode', url: 'https://www.glassnode.com/blog/what-are-on-chain-metrics' },
        { title: 'Ethereum vs Solana – Messari', url: 'https://messari.io/compare/ethereum-vs-solana' }
      ]
    },
    {
      slug: 'azbllv0',
      links: [
        { title: 'Klarna on SEC EDGAR', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=klarna' },
        { title: 'Klarna files for US IPO – Klarna Press', url: 'https://www.klarna.com/international/press/klarna-files-registration-statement-for-proposed-initial-public-offering/' },
        { title: 'Klarna files for IPO at $15B valuation – SiliconAngle', url: 'https://siliconangle.com/2025/03/14/financial-technology-provider-klarna-files-ipo-reported-15b-valuation/' }
      ]
    },
    {
      slug: 'bw810hp',
      links: [
        { title: 'Revolut to launch AI financial assistant – Sifted', url: 'https://sifted.eu/articles/uk-fintech-giant-revolut-to-launch-ai-financial-assistant' },
        { title: 'Open banking in 2025: trends shaping the future of payments', url: 'https://www.finextra.com/blogposting/27643/open-banking-in-2025-trends-shaping-the-future-of-payments' },
        { title: 'Could AI be the magic bullet for open banking?', url: 'https://www.finextra.com/blogposting/24443/could-ai-be-the-magic-bullet-for-open-banking' }
      ]
    }
  ];
  const stmt = db.prepare('UPDATE posts SET links = ? WHERE slug = ?');
  const results = fixes.map(f => {
    const info = stmt.run(JSON.stringify(f.links), f.slug);
    return { slug: f.slug, updated: info.changes };
  });
  db.close();
  res.json({ ok: true, results });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});