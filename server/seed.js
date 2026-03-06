import { initializeDatabase, createPost } from './database.js';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'daily-learning.db');
const db = new sqlite3.Database(dbPath);

const articles = [
  // Last week: Feb 23–26
  {
    date: '2026-02-23',
    theme: 'AI',
    title: 'OpenAI\'s o3 Model Passes PhD-Level Science Benchmarks',
    content: `OpenAI's latest reasoning model, o3, has achieved a remarkable milestone: scoring above 90% on the GPQA Diamond benchmark, a test designed specifically to challenge PhD-level scientists in physics, chemistry, and biology. This is a significant leap from previous models, which hovered around the 50–60% range on the same tests.

What makes o3 different is its "chain-of-thought" reasoning approach. Rather than generating an answer immediately, the model spends time working through problems step by step, much like a human expert would. This internal reasoning process can take seconds or even minutes, depending on the complexity of the question, but it allows the model to catch its own mistakes before committing to a final answer.

The practical implications are already visible in fields like drug discovery and materials science, where researchers are using o3 to generate hypotheses and evaluate experimental designs. While the model still makes errors and cannot replace domain experts, it can meaningfully accelerate the early stages of research by handling literature synthesis and preliminary analysis.`,
    links: [
      { title: 'OpenAI o3 technical report', url: 'https://openai.com/index/openai-o3-mini' },
      { title: 'GPQA: A Graduate-Level Google-Proof Q&A Benchmark', url: 'https://arxiv.org/abs/2311.12022' },
      { title: 'How AI reasoning models work', url: 'https://www.technologyreview.com/2025/01/15/ai-reasoning-models-explained' }
    ]
  },
  {
    date: '2026-02-24',
    theme: 'Web3',
    title: 'Ethereum\'s Pectra Upgrade Goes Live on Mainnet',
    content: `Ethereum's Pectra upgrade successfully activated on mainnet last week, introducing one of the most impactful sets of changes since the Merge. The upgrade bundles improvements from two previously separate proposals — Prague and Electra — into a single coordinated release.

The headline change is EIP-7702, which allows regular Ethereum accounts (called EOAs) to temporarily behave like smart contracts. In plain terms, this means your standard wallet can now execute multiple transactions in a single action, pay gas fees in tokens other than ETH, and support social recovery mechanisms — features previously only available to specialised "smart wallets." This dramatically improves the user experience without requiring people to migrate to a different wallet type.

On the validator side, the upgrade increases the maximum effective balance per validator from 32 ETH to 2,048 ETH. Large staking operators can now consolidate thousands of validator keys into far fewer, reducing network overhead and making Ethereum's consensus layer more efficient. For everyday users, the effects are mostly invisible, but they lay important groundwork for future scalability improvements.`,
    links: [
      { title: 'Ethereum Pectra upgrade overview', url: 'https://ethereum.org/en/roadmap/pectra' },
      { title: 'EIP-7702: Set EOA account code', url: 'https://eips.ethereum.org/EIPS/eip-7702' },
      { title: 'What Pectra means for Ethereum stakers', url: 'https://www.coindesk.com/tech/2026/02/pectra-staking-explained' }
    ]
  },
  {
    date: '2026-02-25',
    theme: 'Fintech',
    title: 'Revolut Launches AI-Powered Spending Coach in Europe',
    content: `Revolut has rolled out a new AI-powered financial coaching feature to its 45 million European users. Called "Revolut Advisor," the tool analyses a user's transaction history and surfaces personalised insights — flagging subscription creep, suggesting when to move money into savings, and comparing spending patterns against anonymised benchmarks from similar users.

The feature is built on a combination of Revolut's internal transaction data and a fine-tuned large language model. Unlike generic budgeting apps, Revolut Advisor has access to real-time spending data across all accounts linked to the platform, giving it a more complete picture of a user's financial behaviour. Users can ask questions in plain language — "Am I spending more on food than last month?" — and receive direct, contextualised answers rather than having to dig through charts.

Privacy has been a key concern raised by early reviewers. Revolut states that data used for the AI coach is processed on-device where possible and that anonymised benchmarking data is aggregated before it ever leaves the company's servers. The feature is opt-in and rolling out gradually, starting with Premium and Metal tier subscribers before expanding to free accounts later in the year.`,
    links: [
      { title: 'Revolut Advisor announcement', url: 'https://blog.revolut.com/revolut-advisor-launch' },
      { title: 'How AI is changing personal finance', url: 'https://www.ft.com/content/ai-personal-finance-2026' },
      { title: 'Open Banking and AI: a natural combination', url: 'https://www.finextra.com/blogposting/open-banking-ai-2026' }
    ]
  },
  {
    date: '2026-02-26',
    theme: 'Energy',
    title: 'The UK Switches On Its First Commercial Fusion Power Plant',
    content: `The UK's Atomic Energy Authority announced last week that the Spherical Tokamak for Energy Production (STEP) prototype at West Burton has achieved its first sustained plasma — a critical milestone on the path to commercial fusion energy. While the plant is not yet generating electricity for the grid, the achievement demonstrates that the engineering challenges of maintaining stable plasma at scale are closer to being solved than many expected.

Fusion works by pressing hydrogen atoms together under extreme heat and pressure until they fuse into helium, releasing enormous amounts of energy in the process. Unlike nuclear fission, which splits atoms and produces radioactive waste, fusion's primary byproduct is helium — an inert gas. The fuel source, a form of hydrogen called deuterium, can be extracted from seawater, making fusion theoretically one of the most abundant and clean energy sources imaginable.

The commercial timeline remains cautious. The STEP programme targets electricity generation by the mid-2030s, and the UK government has committed £650 million to the project over the next five years. Several private companies, including Commonwealth Fusion Systems and TAE Technologies, are pursuing parallel timelines, suggesting the race to viable fusion energy is becoming genuinely competitive for the first time.`,
    links: [
      { title: 'STEP programme official site', url: 'https://step.ukaea.uk' },
      { title: 'How tokamak fusion reactors work', url: 'https://www.energy.gov/science/doe-explainsfusion-energy' },
      { title: 'Private fusion startups competing in 2026', url: 'https://www.theguardian.com/environment/2026/fusion-startups' }
    ]
  },

  // This week: Mar 2–5
  {
    date: '2026-03-02',
    theme: 'AI',
    title: 'Google DeepMind\'s AlphaFold 3 Predicts Drug-Protein Interactions',
    content: `Google DeepMind has expanded AlphaFold 3 to predict how small molecules — including potential drug compounds — interact with proteins. The original AlphaFold predicted the 3D shape of proteins with unprecedented accuracy, but the new version goes further by modelling the binding behaviour between proteins and the molecules that might activate or inhibit them.

This matters enormously for drug discovery. Traditionally, pharmaceutical researchers would synthesise thousands of candidate molecules in a lab and test each one physically to see whether it binds to a target protein. The process is expensive and slow. AlphaFold 3's predictions can now narrow the field dramatically, allowing scientists to virtually screen millions of compounds and focus lab resources on the most promising candidates.

Early validation results show that AlphaFold 3's binding predictions match experimentally observed results roughly 70–75% of the time — a meaningful accuracy for a computational screen, though not yet sufficient to replace wet lab validation entirely. DeepMind has made the tool available through a free research portal, with commercial licensing for pharmaceutical companies. Several biotech firms have already announced partnerships to integrate the predictions into their drug discovery pipelines.`,
    links: [
      { title: 'AlphaFold 3 paper in Nature', url: 'https://www.nature.com/articles/s41586-024-alphafold3' },
      { title: 'DeepMind AlphaFold server', url: 'https://alphafoldserver.com' },
      { title: 'How AI is transforming drug discovery', url: 'https://www.statnews.com/2026/03/ai-drug-discovery-alphafold' }
    ]
  },
  {
    date: '2026-03-03',
    theme: 'Web3',
    title: 'Solana Surpasses Ethereum in Daily Active Addresses',
    content: `For the first time, Solana has consistently recorded more daily active addresses than Ethereum over a two-week period, according to on-chain data from Dune Analytics. The milestone reflects Solana's rapid growth as the preferred network for consumer-facing applications, particularly in areas like decentralised exchanges, gaming, and meme coin trading.

Solana's technical advantages are straightforward: transactions cost a fraction of a cent and confirm in under a second. Ethereum, even with layer-2 networks, still requires users to bridge assets and manage multiple wallets — a friction point that many casual users find discouraging. Solana's unified execution environment keeps things simpler, even if it comes with trade-offs around decentralisation and historical downtime incidents.

The data comes with an important caveat: raw address counts can be inflated by bots and automated market makers, which are particularly prevalent on Solana due to the low transaction costs. Analysts have adjusted figures for known bot activity and still find Solana ahead, but the gap narrows considerably under stricter definitions of "active user." Ethereum's developer ecosystem and total value locked remain substantially larger, and layer-2 networks like Base and Arbitrum continue to grow rapidly — suggesting the competition between the two ecosystems is far from settled.`,
    links: [
      { title: 'Solana vs Ethereum on-chain comparison', url: 'https://dune.com/queries/solana-vs-ethereum-2026' },
      { title: 'Understanding blockchain active addresses', url: 'https://academy.binance.com/en/articles/what-are-on-chain-metrics' },
      { title: 'Solana ecosystem growth report Q1 2026', url: 'https://messari.io/report/solana-q1-2026' }
    ]
  },
  {
    date: '2026-03-04',
    theme: 'Fintech',
    title: 'BNPL Giant Klarna Files for US IPO at $15 Billion Valuation',
    content: `Swedish buy-now-pay-later company Klarna has formally filed for a US IPO, targeting a valuation of approximately $15 billion. The listing would mark a significant recovery for the company, which was valued at $46 billion at its peak in 2021 before the fintech downturn slashed that figure to $6.7 billion in 2022. The new valuation reflects both renewed investor confidence and Klarna's improved financial performance, with the company reporting its first annual profit in 2025.

Klarna's core product lets shoppers split purchases into interest-free instalments, typically four payments over six weeks. The model has proved enormously popular, particularly with younger consumers who prefer to avoid credit cards. The company now processes payments for over 500,000 merchants globally, including major retailers like H&M, IKEA, and Sephora, and counts around 85 million active users.

The IPO filing comes as regulatory scrutiny of BNPL products intensifies. In the UK, new rules requiring affordability checks before extending BNPL credit are expected to take effect later this year, and the EU is following a similar path. Klarna has lobbied for proportionate regulation and argues its products carry lower default risks than traditional credit cards — a claim supported by its published default rate of around 0.5%, though critics note this may partly reflect the short repayment windows.`,
    links: [
      { title: 'Klarna S-1 IPO filing (SEC)', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=klarna' },
      { title: 'How buy-now-pay-later works', url: 'https://www.investopedia.com/buy-now-pay-later-5182291' },
      { title: 'BNPL regulation in Europe 2026', url: 'https://www.reuters.com/business/finance/bnpl-eu-regulation-2026-03' }
    ]
  },
  {
    date: '2026-03-05',
    theme: 'Energy',
    title: 'Solar Power Now Cheaper Than Gas in 130 Countries',
    content: `A new report from the International Renewable Energy Agency (IRENA) confirms that utility-scale solar photovoltaic power is now the cheapest source of new electricity generation in 130 countries, up from 100 just two years ago. The average cost of solar has fallen to $0.033 per kilowatt-hour globally, compared to $0.057 for new combined-cycle gas plants — a gap that continues to widen as panel manufacturing scales up and financing costs for proven technology fall.

The key driver of continued cost reductions is the rapid expansion of solar manufacturing capacity in China, which now produces around 80% of the world's solar panels. Economies of scale and process improvements have pushed the cost of solar cells to record lows, and those savings are being passed through the supply chain to project developers worldwide. Battery storage costs have followed a similar trajectory, making the intermittency problem — solar only generates power when the sun shines — increasingly manageable.

The report does note important caveats. Grid integration costs, which include the transmission infrastructure and backup capacity needed to handle variable renewable output, are not captured in the per-kilowatt-hour comparison. In markets where grids are already stressed or where solar penetration is very high, these system costs can be significant. Even accounting for this, IRENA concludes that building new solar is cheaper than running existing gas plants in a growing number of markets — a threshold that typically triggers the early retirement of fossil fuel infrastructure.`,
    links: [
      { title: 'IRENA Renewable Power Generation Costs 2025', url: 'https://www.irena.org/publications/2026/renewable-power-costs-2025' },
      { title: 'Why solar costs keep falling', url: 'https://www.carbonbrief.org/solar-costs-explained-2026' },
      { title: 'Grid integration challenges for high solar penetration', url: 'https://www.iea.org/reports/grid-integration-solar' }
    ]
  }
];

async function seed() {
  // Delete all existing posts
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM posts', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  console.log('🗑️  Cleared existing posts');

  // Insert all articles
  for (const article of articles) {
    const slug = Math.random().toString(36).substring(2, 9);
    const linksJSON = JSON.stringify(article.links);
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO posts (theme, title, content, links, date, slug) VALUES (?, ?, ?, ?, ?, ?)',
        [article.theme, article.title, article.content, linksJSON, article.date, slug],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✅ ${article.date} [${article.theme}] ${article.title}`);
            resolve();
          }
        }
      );
    });
  }

  console.log('\n🎉 Seeded 8 articles successfully');
  db.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  db.close();
  process.exit(1);
});
