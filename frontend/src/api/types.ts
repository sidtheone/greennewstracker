// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// News types
export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  content?: string;
  url: string;
  source: string;
  publishedAt: string;
  country: string;
  sentiment: Sentiment;
  confidence: number;
  classificationExplanation?: string;
  keywords?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NewsListResponse {
  items: NewsItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface NewsDetailResponse extends NewsItem {}

// Country types
export interface Country {
  code: string;
  name: string;
  flag?: string;
}

export interface CountriesResponse {
  countries: Country[];
}

// Query parameters
export interface NewsQueryParams {
  country?: string;
  sentiment?: Sentiment;
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  source?: string;
  [key: string]: string | number | undefined;
}
