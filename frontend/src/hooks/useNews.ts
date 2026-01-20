import { useState, useCallback } from 'react';
import { newsApi } from '../api/endpoints';
import type { NewsItem, NewsQueryParams, ApiError } from '../api/types';

interface UseNewsResult {
  news: NewsItem[];
  loading: boolean;
  error: ApiError | null;
  hasMore: boolean;
  loadMore: () => void;
}

export function useNews(params: NewsQueryParams = {}): UseNewsResult {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await newsApi.getNews({
        ...params,
        page,
        pageSize: 20,
      });

      if (response.success && response.data) {
        setNews((prev) => [...prev, ...response.data.items]);
        setHasMore(response.data.hasMore);
        setPage((prev) => prev + 1);
      }
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [loading, params, page]);

  // Initial load
  useState(() => {
    loadMore();
  });

  return {
    news,
    loading,
    error,
    hasMore,
    loadMore,
  };
}
