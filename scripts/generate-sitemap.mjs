#!/usr/bin/env node
/**
 * Local sitemap CLI — prints exactly what https://www.adibexprestige.com/sitemap.xml
 * returns (same shared module the Vercel function uses).
 *
 *   pnpm sitemap              # print XML to stdout
 *   pnpm sitemap -- --check   # validate well-formedness + canonical hostname
 *
 * Diagnostics go to stderr so stdout stays pure XML.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadLocalEnv,
  renderSitemap,
  resolveSiteUrl,
} from './sitemap-core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  loadLocalEnv(ROOT);

  const result = await renderSitemap({
    searchParams: new URLSearchParams(),
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
  });

  if (result.status !== 200) {
    process.stderr.write(`[sitemap] HTTP ${result.status}: ${result.body}\n`);
    process.exitCode = 1;
    return;
  }

  const siteUrl = resolveSiteUrl();
  const locs = [...result.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const offHost = locs.filter((loc) => !loc.startsWith(`${siteUrl}/`) && loc !== siteUrl);
  const openTags = (result.body.match(/<url>/g) || []).length;
  const closeTags = (result.body.match(/<\/url>/g) || []).length;
  const wellFormed =
    result.body.startsWith('<?xml') &&
    result.body.trimEnd().endsWith('</urlset>') &&
    openTags === closeTags &&
    openTags === locs.length;

  if (process.argv.includes('--check')) {
    const problems = [];
    if (!wellFormed) problems.push('not well-formed (url tags / root element)');
    if (offHost.length) problems.push(`off-host locations: ${offHost.join(', ')}`);
    if (result.contentType !== 'application/xml; charset=utf-8') {
      problems.push(`unexpected content type: ${result.contentType}`);
    }
    process.stderr.write(
      `[sitemap] ${locs.length} URL(s), content-type ${result.contentType}, ` +
        `cache-control ${result.cacheControl}\n`
    );
    if (problems.length) {
      process.stderr.write(`[sitemap] FAILED: ${problems.join('; ')}\n`);
      process.exitCode = 1;
      return;
    }
    process.stderr.write('[sitemap] OK: well-formed XML, all locations on the canonical host\n');
    return;
  }

  process.stdout.write(result.body);
}

main().catch((err) => {
  process.stderr.write(`[sitemap] failed: ${err?.message || err}\n`);
  process.exitCode = 1;
});
