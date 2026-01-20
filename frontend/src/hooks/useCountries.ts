import { useState, useEffect } from 'react';
import { countriesApi } from '../api/endpoints';
import type { Country, ApiError } from '../api/types';

interface UseCountriesResult {
  countries: Country[];
  loading: boolean;
  error: ApiError | null;
}

const DEFAULT_COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
];

export function useCountries(): UseCountriesResult {
  const [countries, setCountries] = useState<Country[]>(DEFAULT_COUNTRIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await countriesApi.getCountries();

        if (response.success && response.data) {
          setCountries(response.data.countries);
        }
      } catch (err) {
        setError(err as ApiError);
        // Keep default countries on error
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, []);

  return {
    countries,
    loading,
    error,
  };
}
