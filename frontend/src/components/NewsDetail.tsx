import { Link } from 'react-router-dom';
import type { NewsItem } from '../api/types';
import { formatDate } from '../utils/date';
import './NewsDetail.css';

interface NewsDetailProps {
  news: NewsItem;
}

export function NewsDetail({ news }: NewsDetailProps) {
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  };

  return (
    <article className="news-detail">
      <div className="news-detail-header">
        <Link to="/" className="news-detail-back">
          ← Back to News
        </Link>
        <div className="news-detail-meta">
          <span className="news-detail-source">{news.source}</span>
          <span className="news-detail-separator">•</span>
          <time className="news-detail-date" dateTime={news.publishedAt}>
            {formatDate(news.publishedAt)}
          </time>
          <span className="news-detail-separator">•</span>
          <span className="news-detail-country">{news.country}</span>
        </div>
      </div>

      <div className="news-detail-content">
        <div className="news-detail-title-row">
          <h1 className="news-detail-title">{news.title}</h1>
          {getSentimentBadge(news.sentiment)}
        </div>

        <p className="news-detail-description">{news.description}</p>

        {news.content && (
          <div className="news-detail-body">
            <h2 className="news-detail-section-title">Full Content</h2>
            <p className="news-detail-text">{news.content}</p>
          </div>
        )}

        <div className="news-detail-actions">
          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-detail-link"
          >
            Read Original Article →
          </a>
        </div>
      </div>

      <div className="news-detail-sidebar">
        <div className="news-detail-card">
          <h3 className="news-detail-card-title">Classification</h3>
          <div className="news-detail-card-content">
            <div className="news-detail-stat">
              <span className="news-detail-stat-label">Sentiment</span>
              <span className="news-detail-stat-value">{news.sentiment}</span>
            </div>
            <div className="news-detail-stat">
              <span className="news-detail-stat-label">Confidence</span>
              <span className={`news-detail-stat-value confidence-${getConfidenceColor(news.confidence)}`}>
                {Math.round(news.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>

        {news.classificationExplanation && (
          <div className="news-detail-card">
            <h3 className="news-detail-card-title">Explanation</h3>
            <p className="news-detail-card-text">{news.classificationExplanation}</p>
          </div>
        )}

        {news.keywords && news.keywords.length > 0 && (
          <div className="news-detail-card">
            <h3 className="news-detail-card-title">Keywords</h3>
            <div className="news-detail-keywords">
              {news.keywords.map((keyword, index) => (
                <span key={index} className="news-detail-keyword">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="news-detail-card">
          <h3 className="news-detail-card-title">Metadata</h3>
          <div className="news-detail-card-content">
            <div className="news-detail-stat">
              <span className="news-detail-stat-label">Published</span>
              <span className="news-detail-stat-value">{formatDate(news.publishedAt)}</span>
            </div>
            <div className="news-detail-stat">
              <span className="news-detail-stat-label">Added</span>
              <span className="news-detail-stat-value">{formatDate(news.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
