import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Archive.css';

function Archive() {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState('All');
  const [loading, setLoading] = useState(true);

  const themeEmojis = {
    'AI': '🤖',
    'Web3': '🌐',
    'Fintech': '💳',
    'Energy': '⚡',
  };

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/posts`)
      .then(res => res.json())
      .then(data => {
        const postsArray = Array.isArray(data) ? data : [];
        setPosts(postsArray);
        setFilteredPosts(postsArray);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching posts:', err);
        setPosts([]);
        setFilteredPosts([]);
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
        {filteredPosts.length > 0 ? (
          filteredPosts.map(post => (
            <Link 
              key={post.id} 
              to={`/post/${post.id}`} 
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="post-card">
                <span className="post-theme">{themeEmojis[post.theme]} {post.theme}</span>
                <h2 className="post-card-title">{post.title}</h2>
                <p className="post-card-date">{post.date}</p>
                <p className="post-card-excerpt">
                  {post.content.substring(0, 150)}...
                </p>
              </div>
            </Link>
          ))
        ) : (
          <div className="empty-state">
            <p>No posts yet.</p>
            <p className="empty-state-sub">Check back on Monday for the first AI post!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Archive;