import './DailyPost.css'
import { useEffect, useState } from 'react';

function DailyPost() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const themeEmojis = {
    'Web3': '🌐',
    'Fintech': '💳',
    'AI': '🤖',
    'Energy': '⚡'
  };

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/posts/latest`)
      .then(res => res.json())
      .then(data => {
        setPost(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching post:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  
  if (!post) return (
    <div className="daily-post">
      <div className="empty-state">
        <p>No posts yet.</p>
        <p className="empty-state-sub">Check back on Monday for the first AI post!</p>
      </div>
    </div>
  );

  // Your existing JSX using post.title, post.content, etc.
  return (
    <div className="daily-post">
      <div className="post-header">
        <div className="theme-title">{themeEmojis[post.theme]} {post.theme}</div>
      </div>
      
      <h1 className="post-title">{post.title}</h1>
      
      <p className="post-date">{post.date}</p>
      
      <div className="post-content">
        {post.content.split('\n\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      
      <div className="further-reading">
        <h3 className="further-reading-heading">Further Reading</h3>
        <ul className="further-reading-links">
          {JSON.parse(post.links).map((link, index) => (
            <li key={index}>
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {link.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default DailyPost;