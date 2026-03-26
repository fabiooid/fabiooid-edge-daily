import cron from 'node-cron';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { createPost, getPostsByTheme } from './database.js';
import { getTodaysTheme } from './theme-scheduler.js';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

async function fetchApprovedSources() {
  const token = process.env.AIRTABLE_TOKEN;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=%7BStatus%7D%3D'Active'`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  const sources = { AI: [], Web3: [], Fintech: [], Energy: [] };
  for (const record of data.records) {
    const { Domain, Theme } = record.fields;
    if (Domain && Theme) {
      const themes = Array.isArray(Theme) ? Theme : [Theme];
      for (const t of themes) {
        if (sources[t]) sources[t].push(Domain);
      }
    }
  }
  console.log('📋 Loaded sources from Airtable:', Object.entries(sources).map(([k, v]) => `${k}(${v.length})`).join(', '));
  return sources;
}

async function fetchAllDomains() {
  const token = process.env.AIRTABLE_TOKEN;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  return new Set(data.records.map(r => r.fields.Domain).filter(Boolean));
}

const BLOCKLISTED_DOMAINS = ['google.com', 'twitter.com', 'x.com', 'facebook.com', 'linkedin.com', 'reddit.com', 'youtube.com', 'wikipedia.org'];

async function suggestNewSources(links, theme) {
  const allDomains = await fetchAllDomains();
  const token = process.env.AIRTABLE_TOKEN;
  let suggested = 0;
  for (const link of links) {
    if (suggested >= 2) break;
    let domain;
    try {
      domain = new URL(link.url).hostname.replace('www.', '');
    } catch {
      continue;
    }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) continue;
    if (allDomains.has(domain)) continue;
    if (BLOCKLISTED_DOMAINS.includes(domain)) continue;
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { Domain: domain, Theme: [theme], Status: 'Pending', Notes: `Auto-suggested from post on ${new Date().toISOString().slice(0,10)}` } })
    });
    console.log(`💡 Suggested new source: ${domain} (Pending review)`);
    suggested++;
  }
}

async function validateLinks(links) {
  const results = await Promise.all(links.map(async (link) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(link.url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
      clearTimeout(timeout);
      if (res.status === 404) throw new Error(`404 Not Found`);
      return { link, ok: true };
    } catch (err) {
      return { link, ok: false, reason: err.message };
    }
  }));

  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    console.warn(`⚠️ ${failed.length} link(s) failed validation (will still publish):`);
    failed.forEach(r => console.warn(`  ${r.link.url} → ${r.reason}`));
  }
  if (failed.length === links.length) {
    throw new Error('All links failed validation — aborting post');
  }
}


function buildPrompt(theme, approvedSources, recentTitles = []) {
  const sourceConstraint = approvedSources
    ? `- ONLY use links from these reputable sources: ${approvedSources.join(', ')}\n        - Do not use any other domains\n        - If you cannot find 3 links from the approved sources for a topic, DO NOT use unapproved sources — instead, abandon that topic and search for a completely different ${theme} story`
    : `- Use links from reputable industry publications, company blogs, official documentation, or university research pages\n        - Avoid government databases, social media, or Wikipedia`;

  const excludeClause = recentTitles.length > 0
    ? `These topics were already covered recently — DO NOT write about them or anything directly related:\n${recentTitles.map(t => `  - "${t}"`).join('\n')}\nFind a completely different ${theme} story.\n\n`
    : '';

  const base = theme === 'Energy'
    ? 'trending energy technology EV battery solar renewable news this week'
    : `trending ${theme} news this week`;

  return `${excludeClause}Search for: "${base}"\nFind a specific, newsworthy ${theme} development from this week.${theme === 'Energy' ? ' Focus on energy technology: EVs, batteries, charging infrastructure, solar, wind, grid storage, and clean energy innovation.' : ''}

        Write for a reader who follows tech and business news but is not an expert. Assume basic familiarity. Write as a professional journalist from a news outlet like TechCrunch, Forbes, The Verge, or Wired. Write this as a tech news article. Never use em dashes (—).

        CRITICAL REQUIREMENTS FOR LINKS:
        - You MUST include exactly 3 links
        - Use ACTUAL URLs from your search results
        - NEVER create Google search links
        - Links must be to real articles you found
        ${sourceConstraint}

        Respond ONLY with this exact format — no commentary before or after:
        TITLE: [title]
        CONTENT: [2-3 paragraphs, 250-300 words, news article style]
        LINKS:
        - [Article title] [URL]
        - [Article title] [URL]
        - [Article title] [URL]`;
}

function isApprovedDomain(url, approvedSources) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return approvedSources.some(src => domain === src || domain.endsWith('.' + src));
  } catch {
    return false;
  }
}


async function attemptGeneration(theme, approvedSources, recentTitles = []) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    temperature: 0.7,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: 'user', content: buildPrompt(theme, approvedSources, recentTitles) }],
  });

  // Concatenate all text blocks — TITLE/CONTENT/LINKS may be split across multiple blocks
  const response = message.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  console.log('Full response:\n', response);

  const titleMatch = response.match(/TITLE: (.+)/);
  const contentMatch = response.match(/CONTENT: ([\s\S]+?)(?=LINKS:|$)/);
  const linksMatch = response.match(/LINKS:([\s\S]+)/);

  if (!titleMatch) throw new Error('Malformed response: missing TITLE');
  if (!contentMatch || !contentMatch[1].trim()) throw new Error('Malformed response: missing CONTENT');

  const title = titleMatch[1].trim();
  const content = contentMatch[1].replace(/LINKS:[\s\S]*/i, '').trim();

  let links = [];
  if (linksMatch) {
    const linkLines = linksMatch[1].split('\n').filter(line => line.trim().startsWith('-'));
    links = linkLines.map(line => {
      const match = line.match(/- (.+?) (https?:\/\/.+)/);
      return match ? { title: match[1].trim(), url: match[2].trim() } : null;
    }).filter(Boolean);
  }

  if (links.some(link => link.url.includes('google.com/search'))) {
    throw new Error('Invalid links generated - contains Google search URLs');
  }
  if (links.length !== 3) {
    throw new Error(`Invalid number of links: ${links.length}`);
  }

  return { title, content, links };
}


export async function generateAndSavePost(themeOverride = null, dateOverride = null) {
  console.log('Generating daily post...\n');

  const theme = themeOverride || getTodaysTheme();
  if (!theme) {
    console.log('⏸️  No post scheduled for today.');
    return;
  }

  const postDate = dateOverride || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
  console.log(`📅 Theme: ${theme}, Date: ${postDate}\n`);

  const APPROVED_SOURCES = await fetchApprovedSources();
  const approvedList = APPROVED_SOURCES[theme];

  // Seed exclude list with titles from the last 30 days for this theme
  const recentPosts = await getPostsByTheme(theme);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recentTitles = recentPosts
    .filter(p => new Date(p.date) >= cutoff)
    .map(p => p.title)
    .filter(Boolean);
  if (recentTitles.length > 0) {
    console.log(`📚 Excluding ${recentTitles.length} recently covered topics`);
  }

  let title, content, links;
  let usedApprovedSources = true;

  // Attempt 1: approved sources only
  try {
    console.log('🔄 Attempt 1: approved sources...');
    ({ title, content, links } = await attemptGeneration(theme, approvedList, recentTitles));
    console.log('✅ All links from approved sources');
  } catch (err) {
    console.warn(`⚠️ Attempt 1 failed: ${err.message}`);
    usedApprovedSources = false;
    const waitMs = err.status === 429
      ? ((parseInt(err.headers?.['retry-after']) || 65) * 1000)
      : 65000;
    console.warn(`⏳ Waiting ${Math.round(waitMs / 1000)}s before fallback...`);
    await new Promise(r => setTimeout(r, waitMs));
    console.warn('⚠️ Falling back to open sources...');
    ({ title, content, links } = await attemptGeneration(theme, null, recentTitles));
  }

  console.log('\n📎 Found', links.length, 'valid links');
  if (!usedApprovedSources) {
    console.warn('⚠️ Post published using fallback (unapproved) sources — review Airtable');
  }

  console.log('🔍 Validating links...');
  await validateLinks(links);
  console.log('✅ All links validated');

  const post = await createPost(theme, title, content, links, postDate);

  console.log('\n✅ Post created with ID:', post.id);
  console.log('📝 Title:', title);
  console.log('🎯 Theme:', theme);

  await suggestNewSources(links, theme);

  console.log('\nRefresh your browser to see it!');
}

export function startScheduler() {
  // Run at 07:30 Hong Kong time every day
  cron.schedule('30 7 * * *', () => {
    console.log('⏰ Cron triggered - generating daily post...');
    generateAndSavePost().catch(err => console.error('Scheduler error:', err));
  }, { timezone: 'Asia/Hong_Kong' });

  console.log('📅 Scheduler started - posts will generate at 07:30 HKT on scheduled days');
}