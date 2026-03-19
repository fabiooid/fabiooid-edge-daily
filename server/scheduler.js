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

async function generateAndSavePost() {
  console.log('Generating daily post...\n');
  
  const theme = getTodaysTheme();

  if (!theme) {
    console.log('⏸️  No post scheduled for today.');
    console.log('Posts are generated on: Monday (AI), Tuesday (Web3), Wednesday (Fintech), Thursday (Energy)');
    return;
  }

  console.log(`📅 Today's theme: ${theme}\n`);

  const APPROVED_SOURCES = await fetchApprovedSources();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    temperature: 0.7,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search"
      }
    ],
    messages: [
      {
        role: 'user',
        content: `Search for trending ${theme} topics from this week from online articles and news. Find a specific, newsworthy development that would interest someone learning about ${theme}.

        Write an educational article that explains this topic clearly and factually. Use simple language naturally without meta-commentary about the writing or audience. Explain concepts as if talking to an intelligent friend who's unfamiliar with the topic.

        CRITICAL REQUIREMENTS FOR LINKS:
        - You MUST include exactly 3 links
        - Use ACTUAL URLs from your search results
        - NEVER create Google search links like "https://www.google.com/search?q=..."
        - Links must be to real articles, documentation, or resources you found
        - Each link should be highly relevant to the specific topic discussed
        - ONLY use links from these reputable sources: ${APPROVED_SOURCES[theme].join(', ')}
        - Do not use any other domains
        - If you cannot find 3 links from the approved sources for a topic, that topic is too niche — pick a different, broader ${theme} topic and try again until you find one with 3 approved sources

        IMPORTANT: Respond ONLY with the formatted post below. Do not include any commentary, explanations, or notes about your process.

        Format (use EXACTLY this format, nothing else):
        TITLE: [catchy title about the specific development]
        CONTENT: [2-3 paragraphs explaining the topic clearly and factually, 250-300 words. Write directly without phrases like "what makes this interesting" or "for beginners". Just explain the concept clearly using simple language.]
        LINKS:
        - [Actual article title from search results] [Actual URL from search results]
        - [Actual article title from search results] [Actual URL from search results]
        - [Actual article title from search results] [Actual URL from search results]`
      }
    ],
  });

  // Extract text from response (handling tool use)
  let response = '';
  for (const block of message.content) {
    if (block.type === 'text') {
      response += block.text;
    }
  }

  console.log('Full response:\n', response);

  // Parse title, content, and links
  const titleMatch = response.match(/TITLE: (.+)/);
  const contentMatch = response.match(/CONTENT: ([\s\S]+?)(?=LINKS:|$)/);
  const linksMatch = response.match(/LINKS:([\s\S]+)/);

  const title = titleMatch ? titleMatch[1].trim() : `Understanding ${theme}`;
  let content = contentMatch ? contentMatch[1].trim() : response;

  // Parse links
  let links = [];
  if (linksMatch) {
    const linksText = linksMatch[1];
    const linkLines = linksText.split('\n').filter(line => line.trim().startsWith('-'));
    
    links = linkLines.map(line => {
      const match = line.match(/- (.+?) (https?:\/\/.+)/);
      if (match) {
        return { title: match[1].trim(), url: match[2].trim() };
      }
      return null;
    }).filter(Boolean);
  }

  // Validate links - reject Google search URLs
  if (links.some(link => link.url.includes('google.com/search'))) {
    console.error('❌ ERROR: Generated Google search links instead of real URLs');
    console.log('Links found:', links);
    throw new Error('Invalid links generated - contains Google search URLs');
  }

  // Require exactly 3 links
  if (links.length !== 3) {
    console.error(`❌ ERROR: Expected 3 links, got ${links.length}`);
    console.log('Links found:', links);
    throw new Error(`Invalid number of links: ${links.length}`);
  }

  console.log('\n📎 Found', links.length, 'valid links');

  // Validate all links are reachable
  console.log('🔍 Validating links...');
  await validateLinks(links);
  console.log('✅ All links validated');

  // Create the post in database
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