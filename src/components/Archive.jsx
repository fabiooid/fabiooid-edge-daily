import { useEffect, useState } from 'react';
import './Archive.css';

function Archive({ onPostClick }) {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState('All');
  const [loading, setLoading] = useState(true);

  const themeEmojis = {
    'Web3': '🌐',
    'Fintech': '💳',
    'AI': '🤖',
    'Energy': '⚡',
  };

  useEffect(() => {
    fetch('http://localhost:3001/api/posts')
      .then(res => res.json())
      .then(data => {
        setPosts(data);
        setFilteredPosts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching posts:', err);
        setLoading(false);
      });
  }, []);

  const filterByTheme = (theme) => {
    setSelectedTheme(theme);
    if (theme === 'All') {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(post => post.theme === theme));
    }
  };

  if (loading) return <div className="archive">Loading...</div>;

  return (
    <div className="archive">
      <h1 className="archive-title">Archive</h1>
      
      <div className="theme-filters">
        <button 
          className={selectedTheme === 'All' ? 'active' : ''}
          onClick={() => filterByTheme('All')}
        >
          All
        </button>
        <button 
          className={selectedTheme === 'AI' ? 'active' : ''}
          onClick={() => filterByTheme('AI')}
        >
          {themeEmojis.AI} AI
        </button>
        <button 
          className={selectedTheme === 'Web3' ? 'active' : ''}
          onClick={() => filterByTheme('Web3')}
        >
          {themeEmojis.Web3} Web3
        </button>
        <button 
          className={selectedTheme === 'Fintech' ? 'active' : ''}
          onClick={() => filterByTheme('Fintech')}
        >
          {themeEmojis.Fintech} Fintech
        </button>
        
        <button 
          className={selectedTheme === 'Energy' ? 'active' : ''}
          onClick={() => filterByTheme('Energy')}
        >
          {themeEmojis.Energy} Energy
        </button>
      </div>

      <div className="posts-list">
        {filteredPosts.map(post => (
          <div key={post.id} className="post-card" onClick={() => onPostClick(post.id)}>
            <span className="post-theme">{themeEmojis[post.theme]} {post.theme}</span>
            <h2 className="post-card-title">{post.title}</h2>
            <p className="post-card-date">{post.date}</p>
            <p className="post-card-excerpt">
              {post.content.substring(0, 150)}...
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Archive;