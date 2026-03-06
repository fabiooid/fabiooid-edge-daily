import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, getLatestPost, getAllPosts, getPostBySlug } from './database.js';
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

// TEMPORARY: fix broken links in seeded articles - remove after use
app.post('/api/fix-links', async (req, res) => {
  if (req.headers['x-seed-token'] !== 'edge-daily-seed-2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const fixes = [
    {
      id: 1, links: [
        { title: 'OpenAI o3-mini is now free to use', url: 'https://openai.com/index/openai-o3-mini' },
        { title: 'GPQA: A Graduate-Level Google-Proof Q&A Benchmark', url: 'https://arxiv.org/abs/2311.12022' },
        { title: 'OpenAI makes its reasoning model free', url: 'https://www.technologyreview.com/2025/01/31/1110757/openai-makes-its-reasoning-model-for-free/' },
      ]
    },
    {
      id: 2, links: [
        { title: 'Ethereum Pectra upgrade overview', url: 'https://ethereum.org/en/roadmap/pectra' },
        { title: 'EIP-7702: Set EOA account code', url: 'https://eips.ethereum.org/EIPS/eip-7702' },
        { title: 'Ethereum Activates Pectra Upgrade, Raising Max Stake to 2048 ETH', url: 'https://www.coindesk.com/tech/2025/05/07/ethereum-activates-pectra-upgrade-raising-max-stake-to-2048-eth' },
      ]
    },
    {
      id: 3, links: [
        { title: 'Revolut Blog', url: 'https://www.revolut.com/blog/' },
        { title: 'Open banking in 2025: trends shaping the future of payments', url: 'https://www.finextra.com/blogposting/27643/open-banking-in-2025-trends-shaping-the-future-of-payments' },
        { title: 'Could AI be the magic bullet for open banking?', url: 'https://www.finextra.com/blogposting/24443/could-ai-be-the-magic-bullet-for-open-banking' },
      ]
    },
    {
      id: 4, links: [
        { title: 'West Burton selected as home of STEP fusion plant', url: 'https://www.gov.uk/government/news/west-burton-selected-as-home-of-step-fusion-plant' },
        { title: 'DOE Explains: Fusion Energy Science', url: 'https://www.energy.gov/science/doe-explainsfusion-energy-science' },
        { title: 'Nuclear fusion – The Guardian', url: 'https://www.theguardian.com/environment/nuclear-fusion' },
      ]
    },
    {
      id: 5, links: [
        { title: 'AlphaFold 3 predicts the structure and interactions of all living molecules', url: 'https://deepmind.google/discover/blog/alphafold-3-predicts-the-structure-and-interactions-of-all-of-lifes-molecules/' },
        { title: 'AlphaFold server', url: 'https://alphafoldserver.com' },
        { title: 'AlphaFold 3: Google DeepMind maps a universe of biomolecules', url: 'https://www.statnews.com/2024/05/08/drug-discovery-alphafold-3-google-deepmind-isomorphic-labs/' },
      ]
    },
    {
      id: 6, links: [
        { title: 'Solana on-chain data – Dune Analytics', url: 'https://dune.com/chains/solana' },
        { title: 'What are on-chain metrics?', url: 'https://academy.binance.com/en/articles/what-are-on-chain-metrics' },
        { title: 'Ethereum vs Solana – Messari', url: 'https://messari.io/compare/ethereum-vs-solana' },
      ]
    },
    {
      id: 7, links: [
        { title: 'Klarna on SEC EDGAR', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=klarna' },
        { title: 'What is buy now, pay later?', url: 'https://www.investopedia.com/buy-now-pay-later-5182291' },
        { title: 'Ethereum and Solana boast growth in 2025', url: 'https://www.theblock.co/post/384535/the-year-of-revenue-assets-and-trading-ethereum-and-solana-boast-growth-in-2025' },
      ]
    },
    {
      id: 8, links: [
        { title: 'Renewable Power Generation Costs in 2023 – IRENA', url: 'https://www.irena.org/Publications/2024/Sep/Renewable-Power-Generation-Costs-in-2023' },
        { title: 'Solar is now cheapest electricity in history, confirms IEA', url: 'https://www.carbonbrief.org/solar-is-now-cheapest-electricity-in-history-confirms-iea/' },
        { title: 'Integrating Solar and Wind – IEA', url: 'https://www.iea.org/reports/integrating-solar-and-wind' },
      ]
    },
  ];
  try {
    const { default: sqlite3 } = await import('sqlite3');
    const { default: path } = await import('path');
    const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH
      ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'daily-learning.db')
      : path.join(process.cwd(), 'daily-learning.db');
    const db = new sqlite3.Database(dbPath);
    const results = [];
    for (const fix of fixes) {
      await new Promise((resolve, reject) => db.run(
        'UPDATE posts SET links = ? WHERE id = ?',
        [JSON.stringify(fix.links), fix.id],
        function(err) { if (err) reject(err); else { results.push({ id: fix.id, updated: this.changes }); resolve(); } }
      ));
    }
    db.close();
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});