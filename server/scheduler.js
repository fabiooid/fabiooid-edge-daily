import cron from 'node-cron';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { createPost } from './database.js';
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

function buildPrompt(theme, approvedSources) {
  const sourceConstraint = approvedSources
    ? `- ONLY use links from these reputable sources: ${approvedSources.join(', ')}\n        - Do not use any other domains\n        - If you cannot find 3 links from the approved sources for a topic, that topic is too niche — pick a different, broader ${theme} topic and try again until you find one with 3 approved sources`
    : `- Use links from reputable industry publications, company blogs, or official documentation\n        - Avoid academic papers, government databases, social media, or Wikipedia`;

  return `Search for trending ${theme} topics from this week from online articles and news. Find a specific, newsworthy development that would interest someone learning about ${theme}.${theme === 'Energy' ? ' Focus on energy technology: EVs, batteries, charging infrastructure, solar, wind, grid storage, and clean energy innovation. Think about what engineers and product people at companies like Tesla, Rivian, or utility-scale solar firms would want to read.' : ''}

        Write for a reader who follows tech and business news but is not an expert. Assume basic familiarity. Write as a professional journalist from a news outlet like TechCrunch, Forbes, The Verge, or Wired. Write this as a tech news article. Never use em dashes (—).

        CRITICAL REQUIREMENTS FOR LINKS:
        - You MUST include exactly 3 links
        - Use ACTUAL URLs from your search results
        - NEVER create Google search links like "https://www.google.com/search?q=..."
        - Links must be to real articles, documentation, or resources you found
        - Each link should be highly relevant to the specific topic discussed
        ${sourceConstraint}

        IMPORTANT: Respond ONLY with the formatted post below. Do not include any commentary, explanations, or notes about your process.

        Format (use EXACTLY this format, nothing else):
        TITLE: [catchy title about the specific development]
        CONTENT: [2-3 paragraphs, 250-300 words. Tech news article style — lead with the news, then context and significance. No meta-commentary, no over-explaining basic concepts.]
        LINKS:
        - [Actual article title from search results] [Actual URL from search results]
        - [Actual article title from search results] [Actual URL from search results]
        - [Actual article title from search results] [Actual URL from search results]`;
}

function isApprovedDomain(url, approvedSources) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return approvedSources.some(src => domain === src || domain.endsWith('.' + src));
  } catch {
    return false;
  }
}

async function attemptGeneration(theme, approvedSources) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    temperature: 0.7,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: 'user', content: buildPrompt(theme, approvedSources) }],
  });

  let response = '';
  for (const block of message.content) {
    if (block.type === 'text') response += block.text;
  }

  console.log('Full response:\n', response);

  const titleMatch = response.match(/TITLE: (.+)/);
  const contentMatch = response.match(/CONTENT: ([\s\S]+?)(?=LINKS:|$)/);
  const linksMatch = response.match(/LINKS:([\s\S]+)/);

  const title = titleMatch ? titleMatch[1].trim() : `Understanding ${theme}`;
  const content = contentMatch ? contentMatch[1].trim() : response;

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

async function generateAndSavePost() {
  console.log('Generating daily post...\n');

  const theme = getTodaysTheme();
  if (!theme) {
    console.log('⏸️  No post scheduled for today.');
    return;
  }

  console.log(`📅 Today's theme: ${theme}\n`);

  const APPROVED_SOURCES = await fetchApprovedSources();
  const approvedList = APPROVED_SOURCES[theme];

  let title, content, links;
  let usedApprovedSources = true;

  // Try up to 3 times with approved sources only
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`🔄 Attempt ${attempt}/3 (approved sources only)...`);
    try {
      ({ title, content, links } = await attemptGeneration(theme, approvedList));

      const unapproved = links.filter(l => !isApprovedDomain(l.url, approvedList));
      if (unapproved.length > 0) {
        console.warn(`⚠️ Attempt ${attempt}: unapproved domains used: ${unapproved.map(l => new URL(l.url).hostname).join(', ')}`);
        throw new Error('Unapproved sources');
      }

      console.log('✅ All links from approved sources');
      break;
    } catch (err) {
      console.warn(`⚠️ Attempt ${attempt} failed: ${err.message}`);
      if (attempt === 3) {
        // Final fallback — no source restriction
        console.warn('⚠️ All approved-source attempts failed. Falling back to open sources...');
        usedApprovedSources = false;
        ({ title, content, links } = await attemptGeneration(theme, null));
      }
    }
  }

  console.log('\n📎 Found', links.length, 'valid links');
  if (!usedApprovedSources) {
    console.warn('⚠️ Post published using fallback (unapproved) sources — review Airtable');
  }

  console.log('🔍 Validating links...');
  await validateLinks(links);
  console.log('✅ All links validated');

  const post = await createPost(
    theme,
    title,
    content,
    links,
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' })
  );

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