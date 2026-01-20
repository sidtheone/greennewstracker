import { apiClient } from './client';
import type {
  NewsListResponse,
  NewsDetailResponse,
  CountriesResponse,
  NewsQueryParams,
} from './types';

export const newsApi = {
  // Get news list with filters
  getNews: (params: NewsQueryParams) =>
    apiClient.get<NewsListResponse>('/news', params),

  // Get single news item by ID
  getNewsById: (id: string) =>
    apiClient.get<NewsDetailResponse>(`/news/${id}`),
};

export const countriesApi = {
  // Get all available countries
  getCountries: () =>
    apiClient.get<CountriesResponse>('/countries'),
};

export const healthApi = {
  // Health check
  getHealth: () =>
    apiClient.get<{ status: string }>('/health'),
};
