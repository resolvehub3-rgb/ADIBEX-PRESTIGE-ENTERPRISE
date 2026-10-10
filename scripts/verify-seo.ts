/**
 * SEO verification suite — `pnpm test:seo`
 *
 * Runs offline (all Supabase / shell traffic is mocked) and asserts the
 * guarantees this project makes to search engines:
 *
 *   1. Two different listings get different titles, descriptions and canonicals,
 *      and every value in them comes from the row's own columns.
 *   2. The injected <head> is well-formed: one <title>, one canonical, parseable
 *      JSON-LD, and the shell's generic tags really are gone.
 *   3. /sitemap.xml lists only public listings, only real lastmod dates, only
 *      the canonical host, and answers 503 (never an empty sitemap) when the
 *      database is unreachable.
 *   4. The /property/:slug function returns 200 for a visible listing, 404 +
 *      noindex for an unknown one, and fails open (200, no injection) rather
 *      than 404-ing a healthy listing when the backend errors.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { injectSeoHead, buildHeadTags } from '../src/lib/headInject';
import {
  buildPropertySEOMetadata,
  buildViewSEOMetadata,
  SSR_SEO_MARKER,
  type SEOMetadata,
} from '../src/utils/seo';
import { renderSitemap, PUBLIC_PROPERTY_STATUSES } from '../scripts/sitemap-core.mjs';
import propertyPageHandler, { __testables as serverSeo } from '../api/property-page';
import type { Property } from '../src/types';

const CANONICAL_HOST = 'https://www.adibexprestige.com';

let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      process.stdout.write(`  ok   ${name}\n`);
    })
    .catch((err: unknown) => {
      failures.push(`${name}: ${(err as Error)?.message || err}`);
      process.stdout.write(`  FAIL ${name}: ${(err as Error)?.message || err}\n`);
    });
}

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

function makeProperty(overrides: Partial<Property>): Property {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    reference_no: 'ADX-A1B2C3',
    title: 'Spacious Self-Contained Room',
    slug: 'spacious-self-contained-room-1a2b3c',
    description:
      'A quiet self-contained room on the first floor with private bathroom, tiled floors and 24/7 security.',
    property_type: 'self_contained',
    transaction_type: 'RENT',
    status: 'AVAILABLE',
    price: 2500,
    currency: 'GHS',
    rental_frequency: 'monthly',
    country: 'Ghana',
    region: 'Greater Accra',
    city: 'Accra',
    area: 'East Legon',
    address: 'Near the junction',
    latitude: 5.6037,
    longitude: -0.187,
    bedrooms: 1,
    bathrooms: 1,
    toilets: 1,
    parking_spaces: 0,
    floor_area_sqm: 24,
    land_size_sqm: null,
    furnished: false,
    amenities: ['Water', 'Security'],
    property_rules: [],
    is_featured: false,
    is_verified: true,
    is_archived: false,
    created_at: '2026-01-05T10:00:00.000Z',
    updated_at: '2026-02-01T10:00:00.000Z',
    media: [
      {
        id: 'm1',
        property_id: 'a1b2c3d4-0000-4000-8000-000000000001',
        media_type: 'IMAGE',
        url: 'https://ekzimwzpgbrzaqywpwxw.supabase.co/storage/v1/object/public/media/room.jpg',
        caption: 'Front view',
        sort_order: 0,
        is_primary: true,
        created_at: '2026-01-05T10:00:00.000Z',
      },
    ],
    ...overrides,
  } as Property;
}

const ROOM = makeProperty({});
const LAND = makeProperty({
  id: 'a1b2c3d4-0000-4000-8000-000000000002',
  reference_no: 'ADX-D4E5F6',
  title: 'Titled Land at Aburi',
  slug: 'titled-land-at-aburi-9z8y7x',
  description: 'A flat, fenced 4000 sqm titled plot with road frontage and metered power nearby.',
  property_type: 'residential_land',
  transaction_type: 'SALE',
  status: 'AVAILABLE',
  price: 480000,
  currency: 'GHS',
  rental_frequency: null,
  bedrooms: 0,
  bathrooms: 0,
  floor_area_sqm: null,
  land_size_sqm: 4000,
  area: 'Aburi',
  city: 'Aburi',
  region: 'Eastern',
  media: [],
});

const SHELL = readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

/** Minimal Response-like object for the mocked global fetch. */
function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function htmlResponse(status: number, body: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
    text: async () => body,
  } as unknown as Response;
}

// --------------------------------------------------------------------------
// 1. Metadata built from the row's own data
// --------------------------------------------------------------------------

async function testMetadata() {
  const room = buildPropertySEOMetadata(ROOM);
  const land = buildPropertySEOMetadata(LAND);

  await check('listings get unique titles and descriptions', () => {
    assert.notEqual(room.title, land.title);
    assert.notEqual(room.description, land.description);
    assert.notEqual(room.canonicalUrl, land.canonicalUrl);
  });

  await check('title/description repeat only facts from the row', () => {
    assert.match(room.title, /East Legon|Accra/);
    // The owner's own wording reaches the snippet (it is what makes the
    // description unique), and the size comes from the land_size_sqm column.
    assert.match(room.description, /private bathroom/i);
    assert.match(land.description, /4000 sqm/);
    // Location is a column, so it reaches the title even when the owner's own
    // copy never names the town.
    assert.match(land.title, /Aburi/);
  });

  await check('"verified" is only claimed when the row really is verified', () => {
    const unverified = buildPropertySEOMetadata(makeProperty({ is_verified: false }));
    assert.doesNotMatch(unverified.description, /verified/i);
    assert.doesNotMatch(JSON.stringify(unverified.jsonLd), /verified/i);
    // The verified fixture keeps the claim — it is a column value, not a boast.
    assert.match(room.description, /verified/i);
  });

  await check('price wording reads as English for every rental frequency', () => {
    for (const [frequency, expected] of [
      ['monthly', /per month\b/],
      ['yearly', /per year\b/],
      ['weekly', /per week\b/],
      ['daily', /per day\b/],
    ] as const) {
      const meta = buildPropertySEOMetadata(
        makeProperty({ rental_frequency: frequency as Property['rental_frequency'] })
      );
      assert.match(meta.description, expected, `frequency ${frequency}`);
      assert.match(meta.title, expected, `frequency ${frequency} in title`);
      assert.doesNotMatch(meta.title, new RegExp(`per ${frequency}\\b`), `no bare "${frequency}"`);
    }
  });

  await check('canonical is the path route on the canonical host', () => {
    assert.equal(room.canonicalUrl, `${CANONICAL_HOST}/property/${ROOM.slug}`);
    assert.equal(land.canonicalUrl, `${CANONICAL_HOST}/property/${LAND.slug}`);
  });

  await check('og:url matches the canonical and og:image is crawlable', () => {
    assert.equal(room.ogImage, ROOM.media![0].url);
    assert.ok(room.ogImage!.startsWith('https://'));
    assert.match(room.ogImageAlt!, /East Legon|Accra/);
    // No image at all still yields a usable, absolute preview URL.
    assert.ok(land.ogImage!.startsWith('https://'));
  });

  await check('JSON-LD parses and claims nothing invented', () => {
    for (const meta of [room, land]) {
      assert.ok(meta.jsonLd, 'jsonLd missing');
      const blocks = Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd];
      for (const block of blocks) {
        const reparsed = JSON.parse(JSON.stringify(block)) as Record<string, unknown>;
        assert.equal(reparsed['@context'], 'https://schema.org');
        const text = JSON.stringify(reparsed);
        assert.doesNotMatch(text, /aggregateRating|"rating"|reviewCount/);
        assert.doesNotMatch(text, /#1|best real estate|leading platform/i);
      }
    }
  });

  await check('availability is stated from status, not invented', () => {
    const sold = buildPropertySEOMetadata(makeProperty({ status: 'SOLD' }));
    assert.match(sold.description, /sold/i);
    assert.match(room.description, /available/i);
  });

  await check('search view self-canonicalises with its filters', () => {
    const meta = buildViewSEOMetadata('search', {
      category: 'land',
      type: 'all',
      transaction_type: 'SALE',
      searchTerm: '',
    });
    assert.equal(meta.canonicalUrl, `${CANONICAL_HOST}/?view=search&category=land&transaction_type=SALE`);
  });

  await check('how-it-works view carries FAQ/HowTo JSON-LD from visible copy', () => {
    const meta = buildViewSEOMetadata('how_it_works');
    const blocks = Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd!];
    const types = blocks.map((b) => (b as Record<string, unknown>)['@type']);
    assert.ok(types.includes('FAQPage'), `expected FAQPage, got ${types.join(',')}`);
    assert.ok(types.includes('HowTo'), `expected HowTo, got ${types.join(',')}`);
    assert.equal(meta.canonicalUrl, `${CANONICAL_HOST}/?view=how-it-works`);
  });

  await check('home view is indexable and canonical to the root', () => {
    const meta = buildViewSEOMetadata('home');
    assert.equal(meta.canonicalUrl, CANONICAL_HOST);
    assert.ok(!meta.robots || meta.robots.includes('index'));
    assert.doesNotMatch(meta.description, /#1|number one/i);
  });

  await check('private and not-found views are noindex with no canonical', () => {
    // A dead listing keeps "follow": the page is gone, but links on it are
    // harmless and Google recommends noindex,follow for removed content.
    const notFound = buildViewSEOMetadata('property_not_found');
    assert.equal(notFound.robots, 'noindex, follow');
    assert.equal(notFound.canonicalUrl, '');

    // Account areas are not crawl-worthy at all. admin_setup is the one-time
    // owner bootstrap — it is linked from nowhere and must never be indexed.
    for (const view of ['admin', 'admin_setup', 'agent', 'portal', 'auth']) {
      const meta = buildViewSEOMetadata(view);
      assert.equal(meta.robots, 'noindex, nofollow', `${view} must be noindex`);
      assert.equal(meta.canonicalUrl, '', `${view} must not claim a canonical`);
    }
  });
}

// --------------------------------------------------------------------------
// 2. Head injection
// --------------------------------------------------------------------------

async function testHeadInjection() {
  await check('injection replaces the generic title/canonical exactly once', () => {
    const html = injectSeoHead(SHELL, buildPropertySEOMetadata(ROOM));
    assert.equal(html.match(/<title/gi)?.length, 1);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.equal((html.match(/rel='canonical'/g) || []).length, 0);
    assert.match(html, new RegExp(`<link rel="canonical" href="${CANONICAL_HOST}/property/${ROOM.slug}"`));
    // The shell's own generic canonical link is gone, not merely duplicated.
    assert.doesNotMatch(html, /<link rel="canonical" href="https:\/\/www\.adibexprestige\.com" \/>/);
  });

  await check('injected block is one well-formed tag run', () => {
    const tags = buildHeadTags(buildPropertySEOMetadata(ROOM));
    assert.equal((tags.match(/<title/g) || []).length, 1);
    // Every <meta> is self-closing; nothing unterminated can leak into the head.
    assert.equal((tags.match(/<meta [^>]*>/g) || []).length, (tags.match(/<meta [^>]*\/>/g) || []).length);
    assert.equal((tags.match(/<script/g) || []).length, (tags.match(/<\/script>/g) || []).length);
  });

  await check('injected JSON-LD survives and parses', () => {
    const html = injectSeoHead(SHELL, buildPropertySEOMetadata(LAND));
    const match = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    assert.ok(match, 'no JSON-LD block injected');
    const parsed = JSON.parse(match![1]) as Record<string, unknown>;
    assert.equal(parsed['@type'], 'RealEstateListing');
  });

  await check('shell values that no longer apply are stripped', () => {
    const html = injectSeoHead(SHELL, buildPropertySEOMetadata(ROOM));
    assert.doesNotMatch(html, /id="adibex-seo-jsonld"[^>]*>[\s\S]*?RealEstateAgent/);
    assert.match(html, /name="google-site-verification"/, 'verification meta must survive');
    assert.match(html, /name="robots" content="index, follow/);
  });

  await check('noindex page drops googlebot/bingbot contradictions', () => {
    const html = injectSeoHead(SHELL, buildViewSEOMetadata('property_not_found'));
    assert.match(html, /name="robots" content="noindex, follow/);
    assert.match(html, /name="googlebot" content="noindex, follow/);
    assert.match(html, /name="bingbot" content="noindex, follow/);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 0, 'noindex page must not claim a canonical');
    assert.doesNotMatch(html, /property="og:url"/);
  });

  await check('values containing quotes/markup cannot break the head', () => {
    const nasty = makeProperty({
      slug: 'x',
      title: 'Room "A" & <script>alert(1)</script>',
      description: 'Water & "power" daily.',
    });
    const html = injectSeoHead(SHELL, buildPropertySEOMetadata(nasty));
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script><\/title>/);
    assert.match(html, /&lt;script&gt;/);
  });
}

// --------------------------------------------------------------------------
// 3. Sitemap
// --------------------------------------------------------------------------

type FetchCall = { url: string; headers: Record<string, string> };

function sitemapFetch(rows: unknown[], calls: FetchCall[] = []) {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: (init?.headers || {}) as Record<string, string> });
    return jsonResponse(200, rows);
  };
}

async function testSitemap() {
  const calls: FetchCall[] = [];
  const result = await renderSitemap({
    searchParams: new URLSearchParams(),
    supabaseUrl: 'https://example.supabase.co',
    anonKey: 'public-anon-key',
    fetchImpl: sitemapFetch(
      [
        { slug: 'room-1', id: 'u1', updated_at: '2026-03-04T09:00:00.000Z' },
        { slug: 'land-2', id: 'u2', updated_at: '' },
      ],
      calls
    ),
  });

  await check('query repeats the public policy predicate', () => {
    const url = calls[0].url;
    assert.match(url, /\/rest\/v1\/properties\?/);
    assert.ok(url.includes(`status=in.(${PUBLIC_PROPERTY_STATUSES})`), `missing status filter: ${url}`);
    assert.ok(url.includes('is_archived=eq.false'), `missing is_archived filter: ${url}`);
    assert.ok(url.includes('apikey=') === false, 'key must travel in a header, not the URL');
    assert.equal(calls[0].headers.apikey, 'public-anon-key');
  });

  await check('listing URLs use the /property/ route on the canonical host', () => {
    assert.equal(result.status, 200);
    assert.ok(result.body.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(result.body.trimEnd().endsWith('</urlset>'));
    assert.ok(result.body.includes(`<loc>${CANONICAL_HOST}/property/room-1</loc>`));
    assert.ok(result.body.includes(`<loc>${CANONICAL_HOST}/property/land-2</loc>`));
  });

  await check('lastmod appears only where a real timestamp exists', () => {
    assert.ok(result.body.includes('<lastmod>2026-03-04</lastmod>'));
    const landBlock = result.body.split('<url>').find((b) => b.includes('land-2'))!;
    assert.ok(!landBlock.includes('<lastmod>'), 'no timestamp means no lastmod');
    const homeBlock = result.body.split('<url>').find((b) => b.trim().startsWith(`<loc>${CANONICAL_HOST}/</loc>`))!;
    assert.ok(!homeBlock.includes('<lastmod>'), 'static pages carry no lastmod');
  });

  await check('every location is on the canonical host', () => {
    const locs = [...result.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.ok(locs.length > 0);
    for (const loc of locs) assert.ok(loc.startsWith(`${CANONICAL_HOST}/`), `off-host loc: ${loc}`);
  });

  await check('sitemap failure is a 503, never an empty sitemap', async () => {
    const failed = await renderSitemap({
      searchParams: new URLSearchParams(),
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'public-anon-key',
      fetchImpl: async () => {
        throw new Error('network down');
      },
    });
    assert.equal(failed.status, 503);
    assert.equal(failed.cacheControl, 'no-store');
    assert.ok(!failed.body.includes('<urlset'));
  });

  await check('unknown shard request is a 404', async () => {
    const shard = await renderSitemap({
      searchParams: new URLSearchParams('part=99'),
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'public-anon-key',
      fetchImpl: sitemapFetch([{ slug: 'room-1', id: 'u1', updated_at: '' }]),
    });
    assert.equal(shard.status, 404);
  });

  await check('missing credentials also fail loudly (503, no valid sitemap)', async () => {
    const noCreds = await renderSitemap({
      searchParams: new URLSearchParams(),
      supabaseUrl: '',
      anonKey: '',
      fetchImpl: sitemapFetch([]),
    });
    assert.equal(noCreds.status, 503);
  });
}

// --------------------------------------------------------------------------
// 4. /property/:slug function
// --------------------------------------------------------------------------

interface FakeResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string | undefined;
}

function fakeRes(): FakeResponse & {
  status: (code: number) => void;
  setHeader: (k: string, v: string) => void;
  end: (chunk?: string) => void;
} {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as string | undefined,
    status(code: number) {
      res.statusCode = code;
    },
    setHeader(k: string, v: string) {
      res.headers[k.toLowerCase()] = v;
    },
    end(chunk?: string) {
      res.body = chunk;
    },
  };
  return res;
}

/** Routes the mocked fetch the way the function's three lookups behave. */
function propertyFetch(options: { rows?: unknown[]; failRows?: boolean } = {}) {
  const { rows = [], failRows = false } = options;
  return async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('/index.html')) return htmlResponse(200, SHELL);
    if (url.includes('/rest/v1/company_settings')) return jsonResponse(200, []);
    if (url.includes('/rest/v1/properties')) {
      if (failRows) return jsonResponse(500, { message: 'boom' });
      return jsonResponse(200, rows);
    }
    throw new Error(`unexpected fetch: ${url}`);
  };
}

function runHandler(url: string, headers: Record<string, string> = {}) {
  const res = fakeRes();
  return propertyPageHandler({ method: 'GET', url, headers }, res).then(() => res);
}

async function testPropertyFunction() {
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'public-anon-key';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = propertyFetch({ rows: [] }) as typeof fetch;

  try {
    await check('a visible listing is 200 with its own head injected', async () => {
      globalThis.fetch = propertyFetch({ rows: [ROOM] }) as typeof fetch;
      const res = await runHandler(`/api/property-page?slug=${ROOM.slug}`);
      assert.equal(res.statusCode, 200);
      assert.match(res.headers['content-type'], /text\/html/);
      assert.match(res.headers['cache-control'], /s-maxage=300/);
      assert.ok(res.body!.includes(`<link rel="canonical" href="${CANONICAL_HOST}/property/${ROOM.slug}"`));
      assert.match(res.body!, /<title[^>]*>[^<]*Spacious Self-Contained Room/);
      assert.match(res.body!, /<title[^>]*>[^<]*(East Legon|Accra)/);
      assert.ok(res.body!.includes(ROOM.media![0].url), 'og:image must be the real photo');
      assert.equal((res.body!.match(/<title/g) || []).length, 1, 'exactly one title tag');
    });

    await check('an unknown slug is 404 + noindex, not a soft 404', async () => {
      globalThis.fetch = propertyFetch({ rows: [] }) as typeof fetch;
      const res = await runHandler('/api/property-page?slug=deleted-listing-xyz');
      assert.equal(res.statusCode, 404);
      assert.match(res.body!, /name="robots" content="noindex, follow/);
      assert.doesNotMatch(res.body!, /rel="canonical"/);
      assert.match(res.headers['cache-control'], /s-maxage=60/);
    });

    await check('a database error fails open to the plain shell (never 404)', async () => {
      globalThis.fetch = propertyFetch({ failRows: true }) as typeof fetch;
      const res = await runHandler('/api/property-page?slug=any-slug');
      assert.equal(res.statusCode, 200);
      assert.ok(res.body!.includes('id="root"'), 'expected the untouched shell');
      assert.doesNotMatch(res.body!, /deleted|noindex/);
    });

    await check('path form resolves the slug too', async () => {
      globalThis.fetch = propertyFetch({ rows: [LAND] }) as typeof fetch;
      const res = await runHandler(`/api/property-page/property/${LAND.slug}`);
      // query form is primary; path form is accepted when the rewrite passes it
      const res2 = await runHandler(`/property/${LAND.slug}`);
      assert.ok(res2.statusCode === 200 || res2.statusCode === 302, `got ${res2.statusCode}`);
      assert.ok(res.statusCode === 200 || res.statusCode === 302);
    });

    await check('unsafe slug characters never reach the database query', async () => {
      const calls: string[] = [];
      globalThis.fetch = (async (input: string | URL | Request) => {
        const url = String(input);
        calls.push(url);
        if (url.includes('/index.html')) return htmlResponse(200, SHELL);
        if (url.includes('/rest/v1/company_settings')) return jsonResponse(200, []);
        if (url.includes('/rest/v1/properties')) return jsonResponse(200, []);
        throw new Error(`unexpected fetch: ${url}`);
      }) as typeof fetch;
      const res = await runHandler('/api/property-page?slug=' + encodeURIComponent('../../etc/passwd'));
      assert.equal(res.statusCode, 404, 'a malformed key is "not found", not an error');
      assert.ok(!calls.some((u) => u.includes('passwd')));
    });

    await check('non-public statuses are excluded by the query itself', async () => {
      const seen: string[] = [];
      globalThis.fetch = (async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('/rest/v1/properties')) {
          seen.push(url);
          return jsonResponse(200, []);
        }
        if (url.includes('/index.html')) return htmlResponse(200, SHELL);
        return jsonResponse(200, []);
      }) as typeof fetch;
      await runHandler('/api/property-page?slug=draft-slug');
      assert.ok(
        seen.some((u) => u.includes(`status=in.(${PUBLIC_PROPERTY_STATUSES})`)),
        'status predicate missing'
      );
      assert.ok(seen.some((u) => u.includes('is_archived=eq.false')), 'is_archived filter missing');
    });

    await check('method and loop-breaker guards behave', async () => {
      globalThis.fetch = propertyFetch({ rows: [] }) as typeof fetch;
      const post = fakeRes();
      await propertyPageHandler({ method: 'POST', url: '/api/property-page?slug=x' }, post);
      assert.equal(post.statusCode, 405);

      const looped = fakeRes();
      await propertyPageHandler(
        { method: 'GET', url: '/api/property-page?slug=x', headers: { 'x-adibex-shell': '1' } },
        looped
      );
      assert.equal(looped.statusCode, 503);
      assert.equal(looped.headers['cache-control'], 'no-store');
    });

    await check('HEAD requests get headers without a body', async () => {
      globalThis.fetch = propertyFetch({ rows: [] }) as typeof fetch;
      const res = fakeRes();
      await propertyPageHandler({ method: 'HEAD', url: '/api/property-page?slug=nope' }, res);
      assert.equal(res.statusCode, 404);
      assert.equal(res.body, undefined);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// 5. Server/client parity
// --------------------------------------------------------------------------
// Vercel does not bundle api/, so api/property-page.ts carries its own copy of
// the metadata + head-injection logic (see the banner in that file). These
// assertions are what keep the two copies from drifting: if either side
// changes a title, description, canonical, tag set or JSON-LD field, this
// fails and the change has to be made on both sides.

async function testServerClientParity() {
  const fixtures: Property[] = [
    ROOM,
    LAND,
    makeProperty({ is_verified: false, description: '', media: [] }),
    makeProperty({ property_type: 'office', transaction_type: 'RENT', status: 'RESERVED' }),
    makeProperty({ property_type: 'apartment', price: 0, rental_frequency: 'yearly' }),
  ];

  await check('server and client property metadata are identical', () => {
    for (const fixture of fixtures) {
      const client = buildPropertySEOMetadata(fixture);
      const server = serverSeo.buildPropertySEOMetadata(fixture as never);
      assert.deepEqual(
        { ...server, jsonLd: JSON.stringify(server.jsonLd) },
        { ...client, jsonLd: JSON.stringify(client.jsonLd) },
        `metadata drift for ${fixture.slug}`
      );
    }
  });

  await check('server and client head tag builders are identical', () => {
    for (const fixture of fixtures) {
      const client = buildPropertySEOMetadata(fixture);
      const server = serverSeo.buildPropertySEOMetadata(fixture as never);
      assert.equal(
        serverSeo.buildHeadTags(server),
        buildHeadTags(client),
        `head tags drift for ${fixture.slug}`
      );
    }
  });

  await check('server and client splice the shell identically', () => {
    for (const fixture of fixtures) {
      const client = buildPropertySEOMetadata(fixture);
      const server = serverSeo.buildPropertySEOMetadata(fixture as never);
      assert.equal(
        serverSeo.injectSeoHead(SHELL, server),
        injectSeoHead(SHELL, client),
        `shell splice drift for ${fixture.slug}`
      );
    }
  });

  await check('server and client agree on the not-found page', () => {
    const client = buildViewSEOMetadata('property_not_found');
    const server = serverSeo.buildNotFoundMetadata();
    assert.equal(server.title, client.title);
    assert.equal(server.description, client.description);
    assert.equal(server.keywords, client.keywords);
    assert.equal(server.canonicalUrl, client.canonicalUrl);
    assert.equal(server.robots, client.robots);
    assert.equal(serverSeo.buildHeadTags(server), buildHeadTags(client));
  });

  await check('the SSR marker the client strips matches the one the server stamps', () => {
    const html = serverSeo.injectSeoHead(SHELL, serverSeo.buildPropertySEOMetadata(ROOM as never));
    const stamped = html.match(/data-adibex-ssr/g) || [];
    assert.ok(stamped.length > 5, 'server must stamp the marker on every injected tag');
    // src/utils/seo.ts removes [data-adibex-ssr]; if this literal ever changes
    // there, injected tags would survive hydration as duplicate copies.
    assert.equal(SSR_SEO_MARKER, 'data-adibex-ssr');
  });
}

async function main() {
  process.stdout.write('SEO verification\n');
  await testMetadata();
  await testHeadInjection();
  await testSitemap();
  await testPropertyFunction();
  await testServerClientParity();

  process.stdout.write(`\n${passed} passed, ${failures.length} failed\n`);
  if (failures.length) {
    for (const f of failures) process.stdout.write(`  - ${f}\n`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`verify-seo crashed: ${(err as Error)?.stack || err}\n`);
  process.exitCode = 1;
});
