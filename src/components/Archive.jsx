import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Breadcrumbs from './Breadcrumbs';
import Loading from './Loading';
import './Archive.css';

function Archive() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState('All');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 5;

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
    setCurrentPage(1);
    if (theme === 'All') {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(post => post.theme === theme));
    }
  };

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  if (loading) return <Loading />;

  return (
    <div className="archive">
      <Breadcrumbs 
        items={[
          { label: 'Home', page: 'home' },
          { label: 'Archive', page: null }
        ]}
        onNavigate={(page) => {
          if (page === 'home') {
            navigate('/');
          }
        }}
      />

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
        {paginatedPosts.length > 0 ? (
          paginatedPosts.map(post => (
            <Link
              key={post.id}
              to={`/post/${post.slug}`}
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

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          <span className="pagination-info">{currentPage} / {totalPages}</span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default Archive;