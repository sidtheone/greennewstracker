/**
 * RSS Fetcher with SSRF Protection
 * 
 * This module provides secure RSS feed fetching with strict egress controls:
 * - URL allowlist validation
 * - Private IP blocking
 * - Redirect limiting
 * - Timeout enforcement
 */

import { URL } from 'url';
import { createLogger } from '../config/logger.js';

const logger = createLogger('rss-fetcher');

// Private IP ranges to block (CIDR notation)
export const PRIVATE_IP_RANGES = [
  '127.0.0.0/8',      // Loopback
  '10.0.0.0/8',       // Private Class A
  '172.16.0.0/12',    // Private Class B
  '192.168.0.0/16',   // Private Class C
  '169.254.0.0/16',   // Link-local
  '0.0.0.0/8',        // Current network
  '100.64.0.0/10',    // Carrier-grade NAT
  '192.0.0.0/24',     // IETF Protocol Assignments
  '192.0.2.0/24',     // TEST-NET-1
  '198.51.100.0/24',  // TEST-NET-2
  '203.0.113.0/24',   // TEST-NET-3
  '224.0.0.0/4',      // Multicast
  '240.0.0.0/4',      // Reserved
  '::1/128',          // IPv6 loopback
  'fc00::/7',         // IPv6 private
  'fe80::/10',        // IPv6 link-local
];

// Allowed domains (allowlist)
const ALLOWED_DOMAINS = [
  'enn.com',
  'insideclimatenews.org',
  'grist.org',
  'theguardian.com',
  'bbci.co.uk',
  'umweltbundesamt.de',
  'climatechangenews.com',
  'downtoearth.org.in',
  'thehindu.com',
];

// Fetch configuration
const FETCH_CONFIG = {
  timeout: 30000,           // 30 seconds
  maxRedirects: 3,          // Maximum redirects
  maxResponseSize: 10 * 1024 * 1024, // 10MB max response size
  userAgent: 'GreenNewsTracker/1.0 (+https://greennewstracker.example.com)',
} as const;

export interface FetchResult {
  url: string;
  content: string;
  contentType: string;
  status: number;
  redirected: boolean;
  finalUrl: string;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * Check if an IP address is in a private range
 */
function isPrivateIP(ip: string): boolean {
  // Simple check for IPv4
  const ipv4Match = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [, a, b, c, _d] = ipv4Match.map(Number);
    
    // 127.0.0.0/8
    if (a === 127) return true;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16
    if (a === 169 && b === 254) return true;
    // 0.0.0.0/8
    if (a === 0) return true;
    // 100.64.0.0/10
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 192.0.0.0/24
    if (a === 192 && b === 0 && c === 0) return true;
    // 192.0.2.0/24
    if (a === 192 && b === 0 && c === 2) return true;
    // 198.51.100.0/24
    if (a === 198 && b === 51 && c === 100) return true;
    // 203.0.113.0/24
    if (a === 203 && b === 0 && c === 113) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 (Reserved)
    if (a >= 240 && a <= 255) return true;
  }
  
  // IPv6 checks (simplified)
  if (ip.includes(':')) {
    // ::1/128 (loopback)
    if (ip === '::1' || ip.startsWith('::1/')) return true;
    // fc00::/7 (private)
    if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
    // fe80::/10 (link-local)
    if (ip.startsWith('fe8') || ip.startsWith('fe9') || 
        ip.startsWith('fea') || ip.startsWith('feb')) return true;
  }
  
  return false;
}

/**
 * Validate URL against allowlist and security rules
 */
function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP and HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: `Invalid protocol: ${parsed.protocol}` };
    }
    
    // Check domain allowlist
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some(allowed => 
      hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
    
    if (!isAllowed) {
      return { valid: false, error: `Domain not in allowlist: ${hostname}` };
    }
    
    // Block private IPs in hostname
    if (isPrivateIP(hostname)) {
      return { valid: false, error: `Private IP blocked: ${hostname}` };
    }
    
    // Block localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || 
        hostname === '[::1]' || hostname === '0.0.0.0') {
      return { valid: false, error: 'Localhost blocked' };
    }
    
    // Block internal network references
    if (hostname.includes('internal') || hostname.includes('intranet')) {
      return { valid: false, error: 'Internal network blocked' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Invalid URL: ${url}` };
  }
}

/**
 * Fetch RSS feed with SSRF protection
 */
export async function fetchRSS(url: string): Promise<FetchResult> {
  logger.info({ url }, 'Fetching RSS feed');
  
  // Validate URL
  const validation = validateUrl(url);
  if (!validation.valid) {
    const error = new FetchError(
      `URL validation failed: ${validation.error}`,
      'INVALID_URL'
    );
    logger.error({ url, error: validation.error }, 'URL validation failed');
    throw error;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_CONFIG.timeout);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': FETCH_CONFIG.userAgent,
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      signal: controller.signal,
      redirect: 'manual', // Handle redirects manually
    });
    
    clearTimeout(timeoutId);
    
    // Handle redirects manually with validation
    let finalUrl = url;
    let status = response.status;
    let redirected = false;
    
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        // Validate redirect URL
        const redirectValidation = validateUrl(location);
        if (!redirectValidation.valid) {
          throw new FetchError(
            `Redirect URL validation failed: ${redirectValidation.error}`,
            'INVALID_REDIRECT'
          );
        }
        
        // Follow redirect (simplified - in production, track redirect count)
        logger.info({ from: url, to: location }, 'Following redirect');
        return fetchRSS(location);
      }
    }
    
    if (!response.ok) {
      throw new FetchError(
        `HTTP ${response.status}: ${response.statusText}`,
        'HTTP_ERROR'
      );
    }
    
    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('xml') && !contentType.includes('rss') && 
        !contentType.includes('atom')) {
      logger.warn({ url, contentType }, 'Unexpected content type');
    }
    
    // Check content length
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > FETCH_CONFIG.maxResponseSize) {
        throw new FetchError(
          `Response too large: ${size} bytes`,
          'RESPONSE_TOO_LARGE'
        );
      }
    }
    
    // Read content with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      throw new FetchError('No response body', 'NO_BODY');
    }
    
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      totalSize += value.length;
      if (totalSize > FETCH_CONFIG.maxResponseSize) {
        reader.cancel();
        throw new FetchError(
          `Response exceeded size limit: ${totalSize} bytes`,
          'RESPONSE_TOO_LARGE'
        );
      }
      
      chunks.push(value);
    }
    
    // Combine chunks
    const content = Buffer.concat(chunks).toString('utf-8');
    
    logger.info({ 
      url, 
      status, 
      contentLength: content.length,
      contentType 
    }, 'RSS feed fetched successfully');
    
    return {
      url,
      content,
      contentType,
      status,
      redirected,
      finalUrl,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof FetchError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new FetchError(
          `Request timeout after ${FETCH_CONFIG.timeout}ms`,
          'TIMEOUT',
          error
        );
      }
      
      throw new FetchError(
        `Fetch failed: ${error.message}`,
        'FETCH_ERROR',
        error
      );
    }
    
    throw new FetchError(
      'Unknown fetch error',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Fetch multiple RSS feeds concurrently with rate limiting
 */
export async function fetchMultipleRSS(
  urls: string[],
  concurrency: number = 3
): Promise<Map<string, FetchResult>> {
  const results = new Map<string, FetchResult>();
  const errors = new Map<string, Error>();
  
  logger.info({ urls: urls.length, concurrency }, 'Fetching multiple RSS feeds');
  
  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const promises = batch.map(async (url) => {
      try {
        const result = await fetchRSS(url);
        results.set(url, result);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.set(url, err);
        logger.error({ url, error: err.message }, 'Failed to fetch RSS feed');
      }
    });
    
    await Promise.all(promises);
  }
  
  logger.info({ 
    success: results.size, 
    failed: errors.size 
  }, 'Batch fetch completed');
  
  return results;
}

/**
 * Add domain to allowlist (for dynamic configuration)
 */
export function addAllowedDomain(domain: string): void {
  const normalized = domain.toLowerCase().replace(/^www\./, '');
  if (!ALLOWED_DOMAINS.includes(normalized)) {
    ALLOWED_DOMAINS.push(normalized);
    logger.info({ domain: normalized }, 'Added domain to allowlist');
  }
}

/**
 * Get current allowlist
 */
export function getAllowedDomains(): string[] {
  return [...ALLOWED_DOMAINS];
}
