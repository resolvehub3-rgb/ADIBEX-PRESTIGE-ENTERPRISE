/**
 * GET /api/sitemap  (rewritten from /sitemap.xml — see vercel.json)
 *
 * Dynamic XML sitemap generated from the live Supabase database so publishing,
 * editing, unpublishing or deleting a listing is reflected within minutes
 * instead of waiting for the next deploy.
 *
 * Security / integrity:
 *   - Uses only VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (public anon key).
 *     No service-role key exists in this project; Row Level Security stays the
 *     authority on which listings are visible.
 *   - The query repeats the public policy predicate (published + unarchived),
 *     so drafts, archived and otherwise inaccessible rows can never appear.
 *   - No customer, reservation or payment data is ever read or returned.
 */

import { renderSitemap } from '../scripts/sitemap-core.mjs';

interface SitemapResponse {
  status: number;
  contentType: string;
  body: string;
  cacheControl: string;
}

interface SitemapRequest {
  method?: string;
  url?: string;
}

interface SitemapResultWriter {
  status(code: number): void;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

export default async function handler(req: SitemapRequest, res: SitemapResultWriter): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    res.status(405);
    res.setHeader('Allow', 'GET, HEAD');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end('Method Not Allowed');
    return;
  }

  try {
    const url = new URL(req.url || '/sitemap.xml', 'https://www.adibexprestige.com');
    const result: SitemapResponse = await renderSitemap({
      searchParams: url.searchParams,
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      anonKey: process.env.VITE_SUPABASE_ANON_KEY,
    });

    res.status(result.status);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', result.cacheControl);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(method === 'HEAD' ? undefined : result.body);
  } catch {
    res.status(500);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end('Sitemap generation failed.');
  }
}
