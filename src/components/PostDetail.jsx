import { useEffect, useState } from 'react';
import Breadcrumbs from './Breadcrumbs';
import './PostDetail.css';

function PostDetail({ postId, onBack, onNavigate }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const themeEmojis = {
    'Web3': '🌐',
    'Fintech': '💳',
    'AI': '🤖',
    'Energy': '⚡',
    'Quantum': '⚛️'
  };

  useEffect(() => {
    // For now, fetch all posts and find the one we need
    fetch('http://localhost:3001/api/posts')
      .then(res => res.json())
      .then(data => {
        const foundPost = data.find(p => p.id === postId);
        setPost(foundPost);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching post:', err);
        setLoading(false);
      });
  }, [postId]);

  if (loading) return <div className="post-detail">Loading...</div>;
  if (!post) return <div className="post-detail">Post not found</div>;

  return (
    <div className="post-detail">
      
      <Breadcrumbs 
        items={[
          { label: 'Home', page: 'home' },
          { label: 'Archive', page: 'archive' },
          { label: post?.title || 'Post', page: null }
        ]}
        onNavigate={(page) => {
          if (page === 'home') {
            onNavigate('home');
          } else if (page === 'archive') {
            onBack();
          }
        }}
      />

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

export default PostDetail;