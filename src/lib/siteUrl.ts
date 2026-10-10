/**
 * Canonical production origin.
 *
 * Search engines must always see one host for every page — otherwise the same
 * listing gets indexed as localhost:3000, *.vercel.app AND adibexprestige.com,
 * which splits ranking power. Set VITE_SITE_URL in the host's environment to
 * override; the default matches the domain configured in index.html.
 */
const RAW_SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://adibexprestige.com') as string;

export const SITE_URL: string = RAW_SITE_URL.trim().replace(/\/+$/, '');

/**
 * Absolute base URL ("https://adibexprestige.com") used for canonical tags,
 * Open Graph/Twitter URLs, JSON-LD and shared listing links. Always the
 * production origin, no matter where the page happens to be served from.
 */
export function getSiteBaseUrl(): string {
  return SITE_URL;
}

/** Absolute URL for a path/query such as "/?property=my-slug". */
export function absoluteSiteUrl(pathOrQuery: string): string {
  const trimmed = pathOrQuery.startsWith('/') ? pathOrQuery : `/${pathOrQuery}`;
  return `${SITE_URL}${trimmed}`;
}
