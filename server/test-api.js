import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testPostGeneration() {
  console.log('Generating a test Web3 post...\n');
  
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      { 
        role: 'user', 
        content: 'Explain "blockchain consensus mechanisms" in 2-3 simple paragraphs for someone new to Web3.' 
      }
    ],
  });

  console.log('Generated content:\n');
  console.log(message.content[0].text);
}

testPostGeneration();