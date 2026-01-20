import { Link } from 'react-router-dom';
import type { Country, Sentiment } from '../api/types';
import './Header.css';

interface HeaderProps {
  countries: Country[];
  selectedCountry: string;
  selectedSentiment: Sentiment | '';
  onCountryChange: (country: string) => void;
  onSentimentChange: (sentiment: Sentiment | '') => void;
}

export function Header({
  countries,
  selectedCountry,
  selectedSentiment,
  onCountryChange,
  onSentimentChange,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="header-logo">
            <span className="logo-icon">🌱</span>
            <span className="logo-text">GreenNewsTracker</span>
          </Link>
          <div className="header-filters">
            <div className="filter-group">
              <label htmlFor="country-select" className="filter-label">
                Country
              </label>
              <select
                id="country-select"
                className="filter-select"
                value={selectedCountry}
                onChange={(e) => onCountryChange(e.target.value)}
                aria-label="Select country"
              >
                <option value="">All Countries</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="sentiment-select" className="filter-label">
                Sentiment
              </label>
              <select
                id="sentiment-select"
                className="filter-select"
                value={selectedSentiment}
                onChange={(e) => onSentimentChange(e.target.value as Sentiment | '')}
                aria-label="Select sentiment"
              >
                <option value="">All</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
