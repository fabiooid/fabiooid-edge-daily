import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const EVAL_TABLE_ID = process.env.AIRTABLE_EVAL_TABLE_ID;

const RUBRIC = `You are evaluating a post from Edge Daily, a daily AI-generated tech news briefing.
Score the post on each of the 6 criteria below from 1 to 5. Return ONLY valid JSON, no commentary.

CRITERIA:

1. relevance
   5 = Topic is from the last 7 days, directly relevant to the theme, something a professional in that field would care about, is tech related
   1 = Topic is generic, outdated, or only loosely connected to the theme, completely unrelated to technology

2. writing_quality
   5 = Reads like TechCrunch or The Verge — punchy opening, gets to the news immediately, no AI-sounding phrases, no filler
   1 = Obvious AI output — starts with "In today's rapidly evolving...", uses em dashes, over-explains, feels like a summary not an article, talks to the reader directly ("you can think of", "imagine your car was the AI agent")

3. clarity
   5 = A smart non-expert can follow it without Googling anything, concepts introduced naturally through context not definitions
   2 = Tries to explain every concept in brackets ("blockchain (technology used for...)")
   1 = Either too technical (assumes deep expertise) or too basic (explains what a smartphone is)

4. source_quality
   5 = All 3 links are directly about the article topic, from credible outlets, and add genuine value for further reading
   1 = Links are tangentially related, from low-quality sources, or feel like filler to hit the count of 3

5. topic_freshness
   5 = Covers a story or angle not seen on Edge Daily in the last 30 days
   1 = Same company, product or story covered recently under a different angle

6. headline_quality
   5 = Specific, informative, tells you exactly what happened ("Tesla and LG Energy Lock In $4.3B US Battery Deal")
   1 = Vague or generic ("Understanding Fintech", "The Future of AI")

Respond ONLY with this JSON format:
{
  "relevance": { "score": 0, "reason": "" },
  "writing_quality": { "score": 0, "reason": "" },
  "clarity": { "score": 0, "reason": "" },
  "source_quality": { "score": 0, "reason": "" },
  "topic_freshness": { "score": 0, "reason": "" },
  "headline_quality": { "score": 0, "reason": "" }
}`;

export async function runEval(post, recentTitles = []) {
  console.log('🧪 Running eval for:', post.title);

  // Rule-based checks
  const wordCount = post.content.trim().split(/\s+/).length;
  const hasEmDash = post.content.includes('—') || post.title.includes('—');

  // Format links for the prompt
  const linksText = (post.links || []).map((l, i) => `${i + 1}. ${l.title} — ${l.url}`).join('\n');
  const recentContext = recentTitles.length > 0
    ? `\nRecently covered titles (for topic_freshness):\n${recentTitles.map(t => `- ${t}`).join('\n')}\n`
    : '';

  const prompt = `${RUBRIC}

${recentContext}
POST TO EVALUATE:
Theme: ${post.theme}
Title: ${post.title}
Content: ${post.content}
Links:
${linksText}`;

  let scores;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content.find(b => b.type === 'text')?.text || '';
    const jsonMatch = text.match(/\{[\s\S]+\}/);
    if (!jsonMatch) throw new Error('No JSON in Haiku response');
    scores = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('❌ Eval failed:', err.message);
    return;
  }

  // Log to console
  const overall = Object.values(scores).reduce((sum, c) => sum + c.score, 0) / 6;
  console.log(`📊 Eval scores — Overall: ${overall.toFixed(1)}`);
  for (const [key, val] of Object.entries(scores)) {
    console.log(`   ${key}: ${val.score}/5 — ${val.reason}`);
  }
  console.log(`   Word count: ${wordCount} | Em dash: ${hasEmDash ? 'YES ⚠️' : 'no'}`);

  // Write to Airtable
  try {
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${EVAL_TABLE_ID}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          Date: post.date,
          Theme: post.theme,
          Title: post.title,
          Relevance: scores.relevance.score,
          'Relevance Notes': scores.relevance.reason,
          'Writing Quality': scores.writing_quality.score,
          'Writing Quality Notes': scores.writing_quality.reason,
          Clarity: scores.clarity.score,
          'Clarity Notes': scores.clarity.reason,
          'Source Quality': scores.source_quality.score,
          'Source Quality Notes': scores.source_quality.reason,
          'Topic Freshness': scores.topic_freshness.score,
          'Topic Freshness Notes': scores.topic_freshness.reason,
          'Headline Quality': scores.headline_quality.score,
          'Headline Quality Notes': scores.headline_quality.reason,
          'Word Count': wordCount,
          'Has Em Dash': hasEmDash,
          'Post Slug': post.slug,
        },
      }),
    });
    console.log('✅ Eval saved to Airtable');
  } catch (err) {
    console.error('❌ Failed to save eval to Airtable:', err.message);
  }
}
