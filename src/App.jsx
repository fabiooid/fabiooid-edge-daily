import { useState, useEffect } from 'react';
import DailyPost from './components/DailyPost';
import Archive from './components/Archive';
import PostDetail from './components/PostDetail';
import Logo from './components/Logo';
import Footer from './components/Footer';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [archiveScrollPosition, setArchiveScrollPosition] = useState(0);

  const handlePostClick = (postId) => {
    // Save scroll position before leaving archive
    setArchiveScrollPosition(window.scrollY);
    setSelectedPostId(postId);
    setCurrentPage('post-detail');
  };

  const handleBackToArchive = () => {
    setCurrentPage('archive');
    setSelectedPostId(null);
  };

  // Restore scroll position when returning to archive
  useEffect(() => {
    if (currentPage === 'archive' && archiveScrollPosition > 0) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        window.scrollTo(0, archiveScrollPosition);
      }, 0);
    } else if (currentPage !== 'archive') {
      window.scrollTo(0, 0); // Scroll to top for other pages
    }
  }, [currentPage, archiveScrollPosition]);

  return (
    <div className="App">
      <nav className="main-nav">
        <div 
          className="nav-brand"
          onClick={() => setCurrentPage('home')}
        >
          <Logo size={24} />
          <span className="brand-name">Edge Daily</span>
        </div>
        <div className="nav-buttons">
          <button 
            className={currentPage === 'archive' ? 'active' : ''}
            onClick={() => setCurrentPage('archive')}
          >
            Archive
          </button>
        </div>
      </nav>

      {currentPage === 'home' && <DailyPost />}
      {currentPage === 'archive' && <Archive onPostClick={handlePostClick} />}
      {currentPage === 'post-detail' && (
        <PostDetail 
          postId={selectedPostId} 
          onBack={handleBackToArchive}
          onNavigate={setCurrentPage}
        />
      )}
      <Footer />
    </div>
  );
}

export default App;