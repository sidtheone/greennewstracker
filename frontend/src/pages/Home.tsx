import { useState, useEffect } from 'react';
import type { Sentiment } from '../api/types';
import { Header } from '../components/Header';
import { NewsList } from '../components/NewsList';
import { Loading } from '../components/Loading';
import { Error } from '../components/Error';
import { useNews } from '../hooks/useNews';
import { useCountries } from '../hooks/useCountries';
import './Home.css';

export function Home() {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | ''>('');
  const [page, setPage] = useState(1);

  const { countries, loading: countriesLoading } = useCountries();
  const { news, loading, error, hasMore, loadMore } = useNews({
    country: selectedCountry || undefined,
    sentiment: selectedSentiment || undefined,
    page,
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedCountry, selectedSentiment]);

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
  };

  const handleSentimentChange = (sentiment: Sentiment | '') => {
    setSelectedSentiment(sentiment);
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
    loadMore();
  };

  if (countriesLoading) {
    return (
      <div className="home">
        <Loading size="large" message="Loading..." />
      </div>
    );
  }

  return (
    <div className="home">
      <Header
        countries={countries}
        selectedCountry={selectedCountry}
        selectedSentiment={selectedSentiment}
        onCountryChange={handleCountryChange}
        onSentimentChange={handleSentimentChange}
      />
      <main className="home-main">
        <div className="container">
          {error ? (
            <Error message={error.message} onRetry={() => window.location.reload()} />
          ) : (
            <NewsList
              news={news}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
            />
          )}
        </div>
      </main>
    </div>
  );
}
