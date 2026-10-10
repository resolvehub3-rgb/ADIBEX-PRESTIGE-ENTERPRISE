/**
 * Shared sitemap generation for ADIBEX PRESTIGE.
 *
 * One implementation, three consumers:
 *   - api/sitemap.ts                  -> Vercel function serving /sitemap.xml (production)
 *   - scripts/generate-sitemap.mjs    -> local CLI that prints the same XML
 *   - vite.config.ts                  -> dev/preview middleware for /sitemap.xml
 *
 * Data rules (security / integrity):
 *   - Reads through the PUBLIC anon key only, so Supabase Row Level Security is
 *     the authority on what may appear. No service-role key is ever used.
 *   - Repeats the public policy predicate in the query itself
 *     (status IN public statuses AND is_archived = false) so an unpublished,
 *     draft, archived or otherwise inaccessible record can never leak into a
 *     sitemap response, even if a database policy changed.
 *   - lastmod is only emitted from real updated_at timestamps. Static pages
 *     carry no lastmod rather than an invented one.
 */

import { existsSync, readFileSync } from 'node:fs';

export const DEFAULT_SITE_URL = 'https://www.adibexprestige.com';

/** Protocol cap is 50,000 URLs per sitemap; leave headroom before splitting. */
export const MAX_URLS_PER_SITEMAP = 45000;

/** Exactly the statuses the public RLS policy exposes on public.properties. */
export const PUBLIC_PROPERTY_STATUSES = 'PUBLISHED,AVAILABLE,RESERVED,RENTED,SOLD';

/** Rows per Supabase REST request (project max_rows default is 1000). */
const PAGE_SIZE = 1000;

/** Hard ceiling so a misbehaving API can never loop forever. */
const MAX_PAGES = 50;

export function resolveSiteUrl(env = process.env) {
  const raw = String(env.VITE_SITE_URL || DEFAULT_SITE_URL).trim();
  return raw.replace(/\/+$/, '');
}

/**
 * Public, non-listing pages that must be discoverable. Every URL here is the
 * self-referencing canonical of its own view (see src/utils/seo.ts).
 * No lastmod: these rows have no real modification timestamp to report.
 */
export const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/?view=search', changefreq: 'daily', priority: '0.9' },
  { path: '/?view=search&type=single_room', changefreq: 'daily', priority: '0.9' },
  { path: '/?view=search&category=land', changefreq: 'daily', priority: '0.9' },
  { path: '/?view=search&category=residential', changefreq: 'daily', priority: '0.9' },
  { path: '/?view=search&category=commercial', changefreq: 'weekly', priority: '0.8' },
  { path: '/?view=how-it-works', changefreq: 'monthly', priority: '0.6' },
];

export function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Best-effort KEY=VALUE reader for local runs only (CLI / vite dev).
 * Never prints or returns secret values; only fills variables that are unset.
 */
export function loadLocalEnv(rootDir) {
  for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    let text;
    try {
      const filePath = `${String(rootDir).replace(/[\\/]+$/, '')}/${file}`;
      if (!existsSync(filePath)) continue;
      text = readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[match[1]] === undefined) process.env[match[1]] = value;
    }
  }
}

/**
 * Fetches every listing the anonymous (public) role is allowed to read.
 * Returns `{ listings, error }`; `error` is set only when the request failed,
 * never when the result is legitimately empty.
 */
export async function fetchPublicListings({ supabaseUrl, anonKey, fetchImpl = fetch }) {
  const base = String(supabaseUrl || '').trim().replace(/\/+$/, '');
  const key = String(anonKey || '').trim();

  if (!base || !key || !base.startsWith('http')) {
    return {
      listings: [],
      error: new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not configured'),
    };
  }

  const endpoint =
    `${base}/rest/v1/properties` +
    `?select=slug,id,updated_at` +
    `&is_archived=eq.false` +
    `&status=in.(${PUBLIC_PROPERTY_STATUSES})` +
    `&order=updated_at.desc`;

  const listings = [];

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE;
      const response = await fetchImpl(`${endpoint}&limit=${PAGE_SIZE}`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: `${from}-${from + PAGE_SIZE - 1}`,
          'Range-Unit': 'items',
          Prefer: 'count=none',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.status === 416) break; // requested range past the last row
      if (!response.ok) {
        return { listings: [], error: new Error(`Supabase responded ${response.status}`) };
      }

      const batch = (await response.json()) || [];
      for (const row of batch) {
        const slug = row && (row.slug || row.id);
        if (!slug) continue;
        listings.push({
          slug: String(slug),
          updated_at: row.updated_at ? String(row.updated_at) : '',
        });
      }
      if (batch.length < PAGE_SIZE) break;
    }

    return { listings, error: null };
  } catch (err) {
    return { listings: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

function urlEntry(loc, { lastmod, changefreq, priority } = {}) {
  const lines = [`  <url>`, `    <loc>${xmlEscape(loc)}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${xmlEscape(lastmod.slice(0, 10))}</lastmod>`);
  if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) lines.push(`    <priority>${priority}</priority>`);
  lines.push(`  </url>`);
  return lines.join('\n');
}

export function buildUrlsetXml(urls) {
  const body = urls.map((entry) => urlEntry(entry.loc, entry)).join('\n');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</urlset>\n`
  );
}

export function buildSitemapIndexXml(sitemapLocations, lastmod) {
  const body = sitemapLocations
    .map((loc) => {
      const lines = [`  <sitemap>`, `    <loc>${xmlEscape(loc)}</loc>`];
      if (lastmod) lines.push(`    <lastmod>${xmlEscape(lastmod.slice(0, 10))}</lastmod>`);
      lines.push(`  </sitemap>`);
      return lines.join('\n');
    })
    .join('\n');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</sitemapindex>\n`
  );
}

function chunk(items, size) {
  const parts = [];
  for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size));
  return parts;
}

const XML_HEADERS = {
  contentType: 'application/xml; charset=utf-8',
  cacheControl: 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
};

/**
 * Produces the response for /sitemap.xml (and its ?part=N shards).
 * Never throws: every outcome maps to an explicit status + body.
 */
export async function renderSitemap({ searchParams, supabaseUrl, anonKey, fetchImpl = fetch }) {
  const siteUrl = resolveSiteUrl();

  const { listings, error } = await fetchPublicListings({
    supabaseUrl,
    anonKey,
    fetchImpl,
  });

  if (error) {
    // Do not hand Google a valid-but-empty sitemap because of a transient
    // outage: answer 503 so the crawler retries instead of trusting it.
    return {
      status: 503,
      contentType: 'text/plain; charset=utf-8',
      body: 'Sitemap temporarily unavailable. Please retry later.',
      cacheControl: 'no-store',
    };
  }

  const entries = [
    ...STATIC_PAGES.map((page) => ({
      loc: `${siteUrl}${page.path}`,
      changefreq: page.changefreq,
      priority: page.priority,
    })),
    ...listings.map((listing) => ({
      loc: `${siteUrl}/?property=${encodeURIComponent(listing.slug)}`,
      lastmod: listing.updated_at,
      changefreq: 'weekly',
      priority: '0.8',
    })),
  ];

  const parts = chunk(entries, MAX_URLS_PER_SITEMAP);
  const requestedPart = searchParams.get('part');

  if (requestedPart !== null) {
    const index = Number.parseInt(requestedPart, 10);
    if (!Number.isInteger(index) || index < 1 || index > parts.length) {
      return {
        status: 404,
        contentType: 'text/plain; charset=utf-8',
        body: 'Unknown sitemap part.',
        cacheControl: 'no-store',
      };
    }
    return { status: 200, body: buildUrlsetXml(parts[index - 1]), ...XML_HEADERS };
  }

  if (parts.length > 1) {
    const newest = listings.reduce(
      (max, listing) => (listing.updated_at > max ? listing.updated_at : max),
      ''
    );
    const locations = parts.map((_, i) => `${siteUrl}/sitemap.xml?part=${i + 1}`);
    return {
      status: 200,
      body: buildSitemapIndexXml(locations, newest),
      ...XML_HEADERS,
    };
  }

  return { status: 200, body: buildUrlsetXml(entries), ...XML_HEADERS };
}
