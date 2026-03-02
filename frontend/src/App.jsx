import { useState, useEffect, useRef } from 'react';
import './App.css';

// Reusable Highlighting Component
const HighlightedText = ({ text, query }) => {
  if (!text) return <span></span>;
  if (!query) return <span>{text}</span>;

  const terms = query.trim().split(/\s+/).filter(t => t.length > 0).sort((a, b) => b.length - a.length);
  if (terms.length === 0) return <span>{text}</span>;

  const safeTerms = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${safeTerms.join('|')})`, 'gi');
  const parts = text.split(regex);
  // Use a non-global regex to test each part; regex.test() with 'g' advances lastIndex and gives wrong results in a loop
  const isMatch = (part) => safeTerms.some(term => new RegExp(`^${term}$`, 'i').test(part));

  return (
    <span>
      {parts.map((part, i) => {
        if (isMatch(part)) {
          return <span key={i} className="match-highlight">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(false);
  const searchInputRef = useRef(null);

  // Focus input on initial mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      setError(false);
      setHasSearched(true);

      try {
        // Call backend: GET /api/global-search?q=query
        const response = await fetch(`http://localhost:8080/api/global-search?q=${encodeURIComponent(query)}`);

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();

        // Backend returns: { success, count, results: [...] }
        // Each result has: type, id, name/title, description/content, score
        const normalized = (data.results || []).map(item => ({
          id: item.id,
          type: item.type,
          // Products have 'name', Articles have 'title' — unify under 'title'
          title: item.name || item.title || 'Untitled',
          // Products have 'description', Articles have 'content' — unify under 'description'
          description: item.description || item.content || '',
          displayScore: typeof item.score === 'number' ? item.score.toFixed(2) : '0.00',
        }));

        setResults(normalized);
      } catch (err) {
        console.error(err);
        setError(true);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      performSearch();
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleClear = () => {
    setQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <>
      <div className="background-effects">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>

      <main className="container">
        <header className="search-header">
          <h1>Discover <span className="highlight">Anything</span></h1>
          <p className="subtitle">Search across products and articles instantly with MongoDB full-text search.</p>

          <div className="search-box">
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try 'laptop screens', 'mongodb', 'node.js'..."
              autoComplete="off"
              aria-label="Global Search"
            />
            {isLoading && (
              <div className="loader-spinner" aria-hidden="true" style={{ display: 'block' }}></div>
            )}
            {query.length > 0 && (
              <button onClick={handleClear} className="clear-btn" aria-label="Clear search">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </header>

        <section className="results-container" aria-live="polite">
          {hasSearched && !isLoading && !error && (
            <div className="results-meta">
              Found <span>{results.length}</span> results for &ldquo;<span>{query}</span>&rdquo;
            </div>
          )}

          <div className="results-list">
            {!hasSearched ? null : error ? (
              <div className="empty-state">
                <div className="empty-state-icon">⚠️</div>
                <p>Something went wrong connecting to the search server. Please try again.</p>
              </div>
            ) : isLoading && results.length === 0 ? (
              <div className="empty-state" style={{ opacity: 0.5 }}>
                <p>Searching...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <p>No results found for &ldquo;<strong>{query}</strong>&rdquo;. Try different keywords.</p>
              </div>
            ) : (
              results.map((item, index) => (
                <div
                  key={item.id}
                  className="result-card"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="card-header">
                    <div className="tag-container">
                      <span className={`type-tag ${item.type}`}>{item.type}</span>
                    </div>
                    <div className="score-badge" title="Relevance Score from MongoDB textScore">
                      <svg className="score-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                      Score: {item.displayScore}
                    </div>
                  </div>
                  <h3 className="result-title">
                    <HighlightedText text={item.title} query={query} />
                  </h3>
                  <p className="result-desc">
                    <HighlightedText text={item.description} query={query} />
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}

export default App;




