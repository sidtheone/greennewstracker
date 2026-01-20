import { useParams } from 'react-router-dom';
import { NewsDetail } from '../components/NewsDetail';
import { Loading } from '../components/Loading';
import { Error } from '../components/Error';
import { useNewsDetail } from '../hooks/useNewsDetail';
import './Detail.css';

export function Detail() {
  const { id } = useParams<{ id: string }>();
  const { news, loading, error } = useNewsDetail(id || '');

  if (loading) {
    return (
      <div className="detail">
        <Loading size="large" message="Loading article..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail">
        <Error message={error.message} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!news) {
    return (
      <div className="detail">
        <Error message="Article not found." />
      </div>
    );
  }

  return (
    <div className="detail">
      <div className="container">
        <NewsDetail news={news} />
      </div>
    </div>
  );
}
