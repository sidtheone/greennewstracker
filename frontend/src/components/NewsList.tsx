import { NewsCard } from './NewsCard';
import type { NewsItem } from '../api/types';
import './NewsList.css';

interface NewsListProps {
  news: NewsItem[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function NewsList({ news, loading, hasMore, onLoadMore }: NewsListProps) {
  if (news.length === 0 && !loading) {
    return (
      <div className="news-list-empty">
        <p className="news-list-empty-text">No news articles found.</p>
        <p className="news-list-empty-hint">Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="news-list">
      <div className="news-list-grid">
        {news.map((item) => (
          <NewsCard key={item.id} news={item} />
        ))}
      </div>
      {hasMore && onLoadMore && (
        <div className="news-list-footer">
          <button
            className="news-list-load-more"
            onClick={onLoadMore}
            disabled={loading}
            aria-label="Load more news articles"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
