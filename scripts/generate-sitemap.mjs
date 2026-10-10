#!/usr/bin/env node
/**
 * Generates public/sitemap.xml so Google, Bing and every other crawler can
 * discover the home page, the search/category landing pages, and — most
 * importantly — every published room, land and property listing.
 *
 * Run automatically as part of `pnpm build` (Vercel runs `pnpm build`), or
 * manually with `pnpm sitemap`.
 *
 * It reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from the environment
 * (or from a local .env file) and lists every non-archived property. If those
 * credentials are unavailable it still writes a valid sitemap containing the
 * static pages, so a build never fails because of SEO tooling.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'public', 'sitemap.xml');
const SITE_URL = (process.env.VITE_SITE_URL || 'https://www.adibexprestige.com').trim().replace(/\/+$/, '');

/** Reads KEY=VALUE pairs the way Vite does, without printing any secrets. */
function loadLocalEnv() {
  for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    const filePath = path.join(ROOT, file);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

/** Every public, non-listing page that should rank for "room", "land", "property". */
const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/?view=search', priority: '0.9', changefreq: 'daily' },
  { path: '/?view=search&type=single_room', priority: '0.9', changefreq: 'daily' },
  { path: '/?view=search&category=land', priority: '0.9', changefreq: 'daily' },
  { path: '/?view=search&category=residential', priority: '0.9', changefreq: 'daily' },
  { path: '/?view=search&category=commercial', priority: '0.8', changefreq: 'weekly' },
  { path: '/?view=how-it-works', priority: '0.6', changefreq: 'monthly' },
];

const xmlEscape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const today = () => new Date().toISOString().slice(0, 10);

async function fetchPublishedListings() {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !anonKey) {
    console.warn('[sitemap] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — sitemap will contain static pages only.');
    return [];
  }

  const base = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/properties`;
  const pageSize = 1000; // Supabase's default max_rows per request
  const all = [];

  try {
    for (let from = 0; ; from += pageSize) {
      const endpoint =
        `${base}?select=slug,id,updated_at&is_archived=eq.false&order=updated_at.desc&limit=${pageSize}`;
      const response = await fetch(endpoint, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Range: `${from}-${from + pageSize - 1}`,
          'Range-Unit': 'items',
          Prefer: 'count=none',
        },
      });
      if (response.status === 416) break; // requested range past the last row
      if (!response.ok) {
        console.warn(`[sitemap] Supabase responded ${response.status} — sitemap will contain static pages only.`);
        return all;
      }
      const batch = (await response.json()) || [];
      all.push(...batch);
      if (batch.length < pageSize) break;
      if (from / pageSize >= 20) break; // safety cap: 20k listings
    }
    return all;
  } catch (err) {
    console.warn(`[sitemap] Could not reach Supabase (${err?.message}) — sitemap will contain static pages only.`);
    return all;
  }
}

function buildSitemap(listings) {
  const entries = [];

  for (const page of STATIC_PAGES) {
    entries.push(
      `  <url>\n` +
        `    <loc>${xmlEscape(`${SITE_URL}${page.path}`)}</loc>\n` +
        `    <lastmod>${today()}</lastmod>\n` +
        `    <changefreq>${page.changefreq}</changefreq>\n` +
        `    <priority>${page.priority}</priority>\n` +
        `  </url>`
    );
  }

  for (const listing of listings) {
    const slug = listing.slug || listing.id;
    if (!slug) continue;
    const lastmod = (listing.updated_at || '').slice(0, 10) || today();
    entries.push(
      `  <url>\n` +
        `    <loc>${xmlEscape(`${SITE_URL}/?property=${encodeURIComponent(slug)}`)}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>weekly</changefreq>\n` +
        `    <priority>0.8</priority>\n` +
        `  </url>`
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries.join('\n')}\n` +
    `</urlset>\n`
  );
}

async function main() {
  loadLocalEnv();
  mkdirSync(path.dirname(OUT_FILE), { recursive: true });

  const listings = await fetchPublishedListings();
  const xml = buildSitemap(listings);
  writeFileSync(OUT_FILE, xml, 'utf8');

  console.log(
    `[sitemap] Wrote ${path.relative(ROOT, OUT_FILE)} — ${STATIC_PAGES.length} page(s) + ${listings.length} listing(s).`
  );
  if (listings.length === 0) {
    console.log(
      '[sitemap] Tip: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Vercel project so every deploy lists all live rooms, lands and properties.'
    );
  }
}

main().catch((err) => {
  console.warn(`[sitemap] Skipped: ${err?.message}`);
});
