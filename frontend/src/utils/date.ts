/**
 * Format a date string to a human-readable format
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Jan 15, 2024" or "2 hours ago")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Show relative time for recent dates
  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  // Show absolute date for older dates
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return date.toLocaleDateString('en-US', options);
}

/**
 * Format a date string to a full date and time format
 * @param dateString - ISO date string
 * @returns Formatted date and time string (e.g., "January 15, 2024 at 2:30 PM")
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };

  return date.toLocaleDateString('en-US', options);
}

/**
 * Format a date string to a short date format
 * @param dateString - ISO date string
 * @returns Formatted short date string (e.g., "01/15/2024")
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  return date.toLocaleDateString('en-US', options);
}
