import cron from 'node-cron';
import { getTodaysTheme } from './theme-scheduler.js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { createPost } from './database.js';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateDailyPost() {
  const theme = getTodaysTheme();

  if (!theme) {
    console.log('⏸️  No post scheduled for today.');
    return;
  }

  console.log(`📅 Generating ${theme} post...\n`);
  
  try {
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
          content: `Search for trending ${theme} topics from this week from online articles and news. Find something interesting and educational for beginners.

        IMPORTANT: Respond ONLY with the formatted post below. Do not include any commentary, explanations, or notes about your process.

        Format (use EXACTLY this format, nothing else):
        TITLE: [catchy title]
        CONTENT: [2-3 paragraph explanation, 250-300 words]
        LINKS:
        - [Article title 1] URL1
        - [Article title 2] URL2
        - [Article title 3] URL3

        The LINKS must be directly related to the specific topic you're explaining in the CONTENT. They should help readers learn MORE about this exact topic, not just general ${theme} information. Use real URLs from your search results about this specific topic.`
        }
      ],
    });

    // Extract text from response
    let response = '';
    for (const block of message.content) {
      if (block.type === 'text') {
        response += block.text;
      }
    }

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

    // Fallback links
    if (links.length === 0) {
      links = [
        { title: `Learn More About ${theme}`, url: 'https://www.google.com/search?q=' + theme }
      ];
    }

    // Create the post
    const post = await createPost(
      theme,
      title,
      content,
      links,
      new Date().toISOString().split('T')[0]
    );
    
    console.log('✅ Post created successfully!');
    console.log('📝 Title:', title);
    console.log('🎯 Theme:', theme);
  } catch (error) {
    console.error('❌ Error generating post:', error);
  }
}

// Schedule: Run at 8:00 AM Hong Kong time, Monday/Wednesday/Friday
// Cron format: minute hour day month day-of-week
// 0 8 * * 1,3,5 = 8am on Mon/Wed/Fri
function startScheduler() {
  console.log('🕐 Scheduler started!');
  console.log('📅 Posts will generate at 7:00 AM HKT on Mon/Tue/Wed/Thu');
console.log('🎯 Themes: Mon=AI, Tue=Web3, Wed=Fintech, Thu=Energy');
  
  cron.schedule('0 7 * * 1,2,3,4', () => {
    console.log('\n⏰ Scheduled job triggered:', new Date().toLocaleString());
    generateDailyPost();
  }, {
    timezone: "Asia/Hong_Kong"
  });
}

export { startScheduler, generateDailyPost };