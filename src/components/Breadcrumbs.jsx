import './Breadcrumbs.css';

function Breadcrumbs({ items, onNavigate }) {
  const truncate = (text, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <nav className="breadcrumbs">
      {items.map((item, index) => (
        <span key={index} className="breadcrumb-item">
          {index < items.length - 1 ? (
            <>
              <button 
                className="breadcrumb-link"
                onClick={() => onNavigate(item.page)}
              >
                {truncate(item.label)}
              </button>
              <span className="breadcrumb-separator">/</span>
            </>
          ) : (
            <span className="breadcrumb-current">{truncate(item.label)}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default Breadcrumbs;