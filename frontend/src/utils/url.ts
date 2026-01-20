/**
 * Check if a URL is valid
 * @param url - URL string to validate
 * @returns True if the URL is valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the domain from a URL
 * @param url - URL string
 * @returns Domain name (e.g., "example.com")
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Truncate a URL for display purposes
 * @param url - URL string
 * @param maxLength - Maximum length of the truncated URL
 * @returns Truncated URL with ellipsis if needed
 */
export function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) {
    return url;
  }

  const domain = getDomain(url);
  if (domain && domain.length < maxLength) {
    return `${domain}...`;
  }

  return `${url.substring(0, maxLength - 3)}...`;
}

/**
 * Build a query string from an object
 * @param params - Object with query parameters
 * @returns Query string (e.g., "?key=value&foo=bar")
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Parse a query string into an object
 * @param queryString - Query string (with or without leading "?")
 * @returns Object with parsed query parameters
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}
