import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumbs from './Breadcrumbs';
import Loading from './Loading';
import './PostDetail.css';

function PostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const themeEmojis = {
    'Web3': '🌐',
    'Fintech': '💳',
    'AI': '🤖',
    'Energy': '⚡'
  };

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/posts/${slug}`) 
      .then(res => {
        if (!res.ok) throw new Error('Post not found');
        return res.json();
      })
      .then(data => {
        setPost(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching post:', err);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <Loading />;
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
            navigate('/');
          } else if (page === 'archive') {
            navigate('/archive');
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
          {(() => { try { return JSON.parse(post.links); } catch { return []; } })().map((link, index) => (
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