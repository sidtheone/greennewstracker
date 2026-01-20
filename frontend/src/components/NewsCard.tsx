import { Link } from 'react-router-dom';
import type { NewsItem } from '../api/types';
import { formatDate } from '../utils/date';
import './NewsCard.css';

interface NewsCardProps {
  news: NewsItem;
}

export function NewsCard({ news }: NewsCardProps) {
  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <span className="sentiment-badge sentiment-positive">Positive</span>;
      case 'negative':
        return <span className="sentiment-badge sentiment-negative">Negative</span>;
      default:
        return <span className="sentiment-badge sentiment-neutral">Neutral</span>;
    }
  };

  return (
    <article className="news-card">
      <div className="news-card-header">
        <div className="news-card-meta">
          <span className="news-card-source">{news.source}</span>
          <span className="news-card-separator">•</span>
          <time className="news-card-date" dateTime={news.publishedAt}>
            {formatDate(news.publishedAt)}
          </time>
        </div>
        {getSentimentBadge(news.sentiment)}
      </div>
      <Link to={`/news/${news.id}`} className="news-card-content">
        <h2 className="news-card-title">{news.title}</h2>
        <p className="news-card-description">{news.description}</p>
      </Link>
      <div className="news-card-footer">
        <span className="news-card-country">{news.country}</span>
        {news.confidence && (
          <span className="news-card-confidence">
            Confidence: {Math.round(news.confidence * 100)}%
          </span>
        )}
      </div>
    </article>
  );
}
