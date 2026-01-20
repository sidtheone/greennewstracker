import { useState, useEffect } from 'react';
import { newsApi } from '../api/endpoints';
import type { NewsItem, ApiError } from '../api/types';

interface UseNewsDetailResult {
  news: NewsItem | null;
  loading: boolean;
  error: ApiError | null;
}

export function useNewsDetail(id: string): UseNewsDetailResult {
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchNewsDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await newsApi.getNewsById(id);

        if (response.success && response.data) {
          setNews(response.data);
        }
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setLoading(false);
      }
    };

    fetchNewsDetail();
  }, [id]);

  return {
    news,
    loading,
    error,
  };
}
