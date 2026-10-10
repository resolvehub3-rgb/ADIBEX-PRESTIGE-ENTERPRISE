/**
 * GET /property/:slug   (rewritten from that path — see vercel.json)
 *
 * The SPA sets a listing's <title>, description, canonical, Open Graph tags and
 * JSON-LD from JavaScript after the data loads. Crawlers that execute JS see
 * that, but social scrapers (WhatsApp, X, LinkedIn) and non-JS fetchers do not:
 * they would all preview every shared listing with the same generic home-page
 * tags. This function rewrites the served shell's <head> with the listing's
 * real metadata before the response leaves Vercel.
 *
 * It is a path route rather than a ?property= query rewrite on purpose: Vercel
 * gives the filesystem precedence over rewrites, and the built SPA shell exists
 * at "/index.html" (served for "/"), so a query-gated rewrite of "/" could never
 * fire. "/property/<slug>" has no static file behind it, so the rewrite always
 * runs; if it ever stopped matching, the catch-all would serve the plain shell
 * and the client would render the listing exactly as it did before.
 *
 * Integrity rules:
 *   - Reads through VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY only. Row Level
 *     Security stays authoritative: a draft, archived or otherwise inaccessible
 *     listing is simply "not found" here, exactly as it is in /sitemap.xml.
 *     The same public status predicate the sitemap uses is repeated in the
 *     query, so a non-public status can never produce an indexable 200 page.
 *   - Nothing is injected when credentials are missing or Supabase errors out —
 *     the untouched shell is served instead, so a backend hiccup can never
 *     404 a healthy listing.
 *   - An unknown/deleted slug gets an explicit 404 + noindex response instead of
 *     a soft 404 (a 200 page that looks like the home page).
 */

import { injectSeoHead } from '../src/lib/headInject';
import { buildPropertySEOMetadata, buildViewSEOMetadata } from '../src/utils/seo';
import type { SEOMetadata } from '../src/utils/seo';
import { DEFAULT_COMPANY_SETTINGS } from '../src/types';
import type { CompanySettings, Property } from '../src/types';
// Shared with the sitemap so the two can never disagree about what is public.
import { PUBLIC_PROPERTY_STATUSES } from '../scripts/sitemap-core.mjs';

const SITE_URL = 'https://www.adibexprestige.com';

/** Slugs are produced by slugify() (a-z, 0-9, -); reference_no and uuids fit too. */
const SAFE_KEY = /^[A-Za-z0-9_-]{1,120}$/;
const UUID_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROPERTY_PATH = /^\/property\/([^/]+)\/?$/;

const SHELL_TTL_MS = 5 * 60_000;
const SETTINGS_TTL_MS = 5 * 60_000;
const ROW_TTL_MS = 60_000;
const ROW_CACHE_LIMIT = 200;

const PROPERTY_COLUMNS = [
  'slug',
  'id',
  'reference_no',
  'title',
  'description',
  'property_type',
  'transaction_type',
  'status',
  'price',
  'currency',
  'rental_frequency',
  'area',
  'city',
  'region',
  'country',
  'address',
  'latitude',
  'longitude',
  'bedrooms',
  'bathrooms',
  'floor_area_sqm',
  'land_size_sqm',
  'amenities',
  'is_verified',
  'is_archived',
  'created_at',
  'updated_at',
  'media:property_media(url,media_type,sort_order,is_primary)',
].join(',');

interface CacheEntry<T> {
  value: T;
  at: number;
}

interface PageRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface PageResultWriter {
  status(code: number): void;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

let shellCache: CacheEntry<string> | null = null;
let settingsCache: CacheEntry<CompanySettings | null> | null = null;
const rowCache = new Map<string, CacheEntry<Property | null>>();

function supabaseUrl(): string {
  return String(process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
}

function anonKey(): string {
  return String(process.env.VITE_SUPABASE_ANON_KEY || '').trim();
}

function headerValue(headers: PageRequest['headers'], name: string): string {
  const raw = headers?.[name];
  return Array.isArray(raw) ? String(raw[0] || '') : String(raw || '');
}

/**
 * The built SPA shell, fetched from this project's own production origin.
 * VERCEL_URL (the *.vercel.app deployment URL) is deliberately not used: it can
 * sit behind Vercel Deployment Protection and would return an auth page, which
 * must never be mistaken for the shell. redirect: 'manual' + a strict status
 * check enforce that.
 */
async function fetchShell(): Promise<string | null> {
  if (shellCache && Date.now() - shellCache.at < SHELL_TTL_MS) return shellCache.value;

  const host = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim() || new URL(SITE_URL).host;
  try {
    const response = await fetch(`https://${host}/index.html`, {
      headers: { Accept: 'text/html', 'x-adibex-shell': '1' },
      redirect: 'manual',
      signal: AbortSignal.timeout(4000),
    });
    if (response.status !== 200) return null;
    const html = await response.text();
    if (!html || html.indexOf('</head>') === -1) return null;
    shellCache = { value: html, at: Date.now() };
    return html;
  } catch {
    return null;
  }
}

/** Brand / contact values used in JSON-LD, matching what the client renders. */
async function fetchSettings(): Promise<CompanySettings | null> {
  if (settingsCache && Date.now() - settingsCache.at < SETTINGS_TTL_MS) {
    return settingsCache.value;
  }
  const base = supabaseUrl();
  const key = anonKey();
  if (!base || !key) return null;

  try {
    const response = await fetch(
      `${base}/rest/v1/company_settings?select=company_name,brand_name,motto,phone,email,address,website&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<Record<string, unknown>> | null;
    const row = rows && rows[0];
    if (!row) return null;
    const value = { ...DEFAULT_COMPANY_SETTINGS, ...row } as CompanySettings;
    settingsCache = { value, at: Date.now() };
    return value;
  } catch {
    return null;
  }
}

type RowResult =
  | { outcome: 'found'; property: Property }
  | { outcome: 'missing' }
  | { outcome: 'error' };

/** One listing, visible only through the public anon role. */
async function fetchProperty(key: string): Promise<RowResult> {
  const base = supabaseUrl();
  const anon = anonKey();
  if (!base || !anon) return { outcome: 'error' };
  if (!SAFE_KEY.test(key)) return { outcome: 'missing' };

  const cached = rowCache.get(key);
  if (cached && Date.now() - cached.at < ROW_TTL_MS) {
    return cached.value ? { outcome: 'found', property: cached.value } : { outcome: 'missing' };
  }

  // uuid -> id lookup; anything else is slug or reference_no (both TEXT, so a
  // validated value can be interpolated safely).
  const filter = UUID_KEY.test(key) ? `id=eq.${key}` : `or=(slug.eq.${key},reference_no.eq.${key})`;
  const query =
    `${base}/rest/v1/properties?select=${encodeURIComponent(PROPERTY_COLUMNS)}` +
    `&${filter}&is_archived=eq.false&status=in.(${PUBLIC_PROPERTY_STATUSES})&limit=1`;

  try {
    const response = await fetch(query, {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        Accept: 'application/json',
        Prefer: 'count=none',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { outcome: 'error' };
    const rows = (await response.json()) as Array<Record<string, unknown>> | null;
    const row = rows && rows[0];

    if (rowCache.size >= ROW_CACHE_LIMIT) rowCache.clear();

    if (!row) {
      rowCache.set(key, { value: null, at: Date.now() });
      return { outcome: 'missing' };
    }

    const property = row as unknown as Property;
    rowCache.set(key, { value: property, at: Date.now() });
    return { outcome: 'found', property };
  } catch {
    return { outcome: 'error' };
  }
}

function writeHtml(
  res: PageResultWriter,
  status: number,
  html: string,
  cacheControl: string,
  sendBody: boolean
): void {
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(sendBody ? html : undefined);
}

export default async function handler(req: PageRequest, res: PageResultWriter): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  const sendBody = method !== 'HEAD';

  if (method !== 'GET' && method !== 'HEAD') {
    res.status(405);
    res.setHeader('Allow', 'GET, HEAD');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Method Not Allowed');
    return;
  }

  // Loop-breaker: the shell fetch marks itself, so an unexpected routing
  // regression can never make this function call itself forever.
  if (headerValue(req.headers, 'x-adibex-shell')) {
    res.status(503);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end('Shell unavailable.');
    return;
  }

  try {
    const url = new URL(req.url || '/property/', SITE_URL);
    // The rewrite passes ?slug=..., the path form is accepted as well so a
    // direct invocation of this function still resolves the right listing.
    const fromQuery = (url.searchParams.get('slug') || '').trim();
    const pathMatch = PROPERTY_PATH.exec(url.pathname);
    const key = fromQuery || (pathMatch ? decodeURIComponent(pathMatch[1]) : '');

    // Reached with neither form: this is a routing mistake, not a missing
    // listing, so fall back to the app root instead of claiming a 404.
    if (!key) {
      res.status(302);
      res.setHeader('Location', '/');
      res.setHeader('Cache-Control', 'no-store');
      res.end();
      return;
    }

    // Fail open when the shell or the backend is not reachable from the server:
    // serve the untouched shell / redirect to the legacy alias rather than
    // declaring a healthy listing missing.
    const [shell, result, settings] = await Promise.all([
      fetchShell(),
      fetchProperty(key),
      fetchSettings(),
    ]);

    if (!shell) {
      res.status(302);
      res.setHeader('Location', `/?property=${encodeURIComponent(key)}`);
      res.setHeader('Cache-Control', 'no-store');
      res.end();
      return;
    }

    // Backend hiccup: never 404 a listing we could not look up.
    if (result.outcome === 'error') {
      writeHtml(res, 200, shell, 'public, max-age=0, s-maxage=60', sendBody);
      return;
    }

    const metadata: SEOMetadata =
      result.outcome === 'found'
        ? buildPropertySEOMetadata(result.property, settings || undefined, SITE_URL)
        : buildViewSEOMetadata('property_not_found', undefined, settings || undefined, SITE_URL);

    writeHtml(
      res,
      result.outcome === 'found' ? 200 : 404,
      injectSeoHead(shell, metadata),
      result.outcome === 'found'
        ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
        : 'public, max-age=0, s-maxage=60, stale-while-revalidate=600',
      sendBody
    );
  } catch {
    res.status(500);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end('Unable to render this page.');
  }
}
