import { createPost } from './database.js';

async function addTestPost() {
  const testPost = {
    theme: 'Web3',
    title: 'Understanding Smart Contracts',
    content: 'Smart contracts are self-executing contracts with the terms directly written into code. They run on blockchain networks like Ethereum and automatically execute when predetermined conditions are met. This eliminates the need for intermediaries and ensures transparency and trust in transactions.',
    links: [
      { title: 'Ethereum Smart Contracts Guide', url: 'https://ethereum.org/en/smart-contracts/' },
      { title: 'What are Smart Contracts?', url: 'https://www.investopedia.com/terms/s/smart-contracts.asp' }
    ],
    date: new Date().toISOString().split('T')[0]
  };

  try {
    const result = await createPost(
      testPost.theme,
      testPost.title,
      testPost.content,
      testPost.links,
      testPost.date
    );
    console.log('Test post created with ID:', result.id);
  } catch (error) {
    console.error('Error creating test post:', error);
  }
}

addTestPost();
