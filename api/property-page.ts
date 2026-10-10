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
 * SELF-CONTAINED BY DESIGN — read before "simplifying" this file:
 *   Vercel does not bundle files in `api/`. It compiles each one in place and
 *   resolves every import *at runtime by path*, so only modules that physically
 *   exist in the deployment resolve. Importing from `../src/...` therefore fails
 *   at load time with FUNCTION_INVOCATION_FAILED (verified in production:
 *   "Cannot find module '/var/task/src/lib/headInject'"), while the on-disk
 *   scripts/*.mjs modules (api/sitemap.ts) work. This is why the metadata and
 *   head-injection logic is ported here rather than imported.
 *   scripts/verify-seo.ts asserts byte-for-byte parity with src/utils/seo.ts
 *   and src/lib/headInject.ts on every run, so the two copies cannot drift
 *   without `pnpm test:seo` failing.
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

import { PUBLIC_PROPERTY_STATUSES } from '../scripts/sitemap-core.mjs';

const SITE_URL = 'https://www.adibexprestige.com';
const BRAND = 'ADIBEX PRESTIGE PROPERTIES';
const ENTERPRISE = 'ADIBEX PRESTIGE ENTERPRISE';

/** Slugs are produced by slugify() (a-z, 0-9, -); reference_no and uuids fit too. */
const SAFE_KEY = /^[A-Za-z0-9_-]{1,120}$/;
const UUID_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROPERTY_PATH = /^\/property\/([^/]+)\/?$/;

const SHELL_TTL_MS = 5 * 60_000;
const SETTINGS_TTL_MS = 5 * 60_000;
const ROW_TTL_MS = 60_000;
const ROW_CACHE_LIMIT = 200;

const DEFAULT_KEYWORDS =
  'room, single room, self contained room, rooms for rent in Ghana, single room self contained, lands, lands for sale, titled land Accra, serviced plots Ghana, properties, properties for rent, properties for sale, commercial properties, houses for rent, luxury apartments, real estate Ghana, ADIBEX PRESTIGE PROPERTIES, ADIBEX PRESTIGE ENTERPRISE, East Legon properties, Airport residential, Kumasi lands, property booking SaaS';

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

// ===========================================================================
// Ported from src/utils/seo.ts + src/lib/media.ts + src/lib/headInject.ts.
// Keep in step with those files — scripts/verify-seo.ts enforces parity.
// ===========================================================================

/** Must equal SSR_SEO_MARKER in src/utils/seo.ts (the client strips it). */
const SSR_SEO_MARKER = 'data-adibex-ssr';

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- media helpers (src/lib/media.ts) -------------------------------------

const VIDEO_FILE_EXT = /\.(mp4|m4v|mov|webm|ogv|ogg|avi|mkv)$/i;

function isAbsoluteHttpUrl(url?: string | null): boolean {
  if (!url) return false;
  const lower = String(url).trim().toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://');
}

function isDurableMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  const value = String(url).trim();
  if (!value) return false;
  const lower = value.toLowerCase();
  if (lower.startsWith('blob:')) return false;
  if (
    lower.startsWith('data:image/') ||
    lower.startsWith('data:video/') ||
    lower.startsWith('data:application/pdf')
  ) {
    return true;
  }
  if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
  return value.startsWith('/');
}

function isPlayableVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const value = String(url).trim();
  if (value.toLowerCase().startsWith('data:video/')) return true;
  if (!isAbsoluteHttpUrl(value)) return false;
  return VIDEO_FILE_EXT.test(value.split(/[?#]/)[0]);
}

interface MediaLike {
  url: string;
  media_type?: string;
  is_primary?: boolean;
}

function isImageMedia(media?: MediaLike | null): boolean {
  if (!media || !isDurableMediaUrl(media?.url)) return false;
  const type = String(media.media_type || 'IMAGE').toUpperCase();
  if (type === 'VIDEO' || type === 'DOCUMENT') return false;
  return !isPlayableVideoUrl(media.url);
}

function usableMedia<T extends { url: string }>(media?: T[] | null): T[] {
  if (!media || media.length === 0) return [];
  return media.filter((m) => isDurableMediaUrl(m?.url));
}

function primaryMedia(media?: MediaLike[] | null): MediaLike | null {
  const usable = usableMedia(media);
  if (usable.length === 0) return null;
  const images = usable.filter(isImageMedia);
  if (images.length === 0) return null;
  return images.find((m) => m.is_primary) || images[0] || null;
}

// --- formatting helpers (src/utils/seo.ts) --------------------------------

function formatPriceForSEO(price: number, currency: string): string {
  return `${currency} ${price.toLocaleString()}`;
}

/** "GHS 1,200 per month" — rental frequency only when the row actually has one. */
function formatPriceLabel(property: PropertyRow): string {
  const price = formatPriceForSEO(property.price, property.currency);
  if (property.transaction_type !== 'RENT' || !property.rental_frequency) return price;

  // The column stores adverbs ("monthly"); a listing title must read like
  // English ("per month"), and a wrong-sounding price line is the part of the
  // snippet most people read first.
  const PERIOD_LABEL: Record<string, string> = {
    daily: 'per day',
    weekly: 'per week',
    monthly: 'per month',
    yearly: 'per year',
  };
  return `${price} ${PERIOD_LABEL[property.rental_frequency] || 'per month'}`;
}

/** Human availability wording taken straight from the status column. */
function availabilityLabel(status?: string | null): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Available now';
    case 'PUBLISHED':
      return 'Available';
    case 'RESERVED':
      return 'Currently reserved';
    case 'RENTED':
      return 'Currently rented';
    case 'SOLD':
      return 'Sold';
    default:
      return 'Currently unavailable';
  }
}

/** schema.org availability for the same status values (never guessed). */
function schemaAvailability(status?: string | null): string {
  switch (status) {
    case 'AVAILABLE':
    case 'PUBLISHED':
      return 'https://schema.org/InStock';
    case 'RESERVED':
      return 'https://schema.org/PreOrder';
    case 'RENTED':
    case 'SOLD':
      return 'https://schema.org/SoldOut';
    default:
      return 'https://schema.org/OutOfStock';
  }
}

/** Trims a meta description at a word boundary instead of mid-word. */
function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > 60 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

/** Determine Schema.org @type based on property classification. */
function getSchemaPropertyType(propertyType: string): string {
  if (
    propertyType === 'residential_land' ||
    propertyType === 'commercial_land' ||
    propertyType === 'agricultural_land' ||
    propertyType === 'development_land'
  ) {
    return 'LandPlots';
  }
  if (propertyType === 'single_room' || propertyType === 'self_contained') {
    return 'Accommodation';
  }
  if (propertyType === 'apartment' || propertyType === 'flat') {
    return 'Apartment';
  }
  if (
    propertyType === 'house' ||
    propertyType === 'townhouse' ||
    propertyType === 'villa' ||
    propertyType === 'luxury_home'
  ) {
    return 'SingleFamilyResidence';
  }
  if (
    propertyType === 'office' ||
    propertyType === 'store_shop' ||
    propertyType === 'warehouse' ||
    propertyType === 'commercial_building'
  ) {
    return 'CommercialBuilding';
  }
  return 'RealEstateListing';
}

// --- the shape this function actually consumes -----------------------------

interface PropertyRow {
  id: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  property_type: string;
  transaction_type: string;
  status?: string | null;
  price: number;
  currency: string;
  rental_frequency?: string | null;
  area?: string | null;
  city: string;
  region: string;
  country?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms: number;
  bathrooms: number;
  floor_area_sqm?: number | null;
  land_size_sqm?: number | null;
  amenities?: string[] | null;
  is_verified?: boolean | null;
  created_at?: string | null;
  media?: MediaLike[] | null;
}

interface CompanySettingsLike {
  brand_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface SEOMetadata {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogType: string;
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: string;
  jsonLd?: object | object[];
  robots?: string;
}

/** Port of buildPropertySEOMetadata() in src/utils/seo.ts. */
function buildPropertySEOMetadata(
  property: PropertyRow,
  settings?: CompanySettingsLike | null,
  baseUrl: string = ''
): SEOMetadata {
  const brand = settings?.brand_name || BRAND;
  const enterprise = settings?.company_name || ENTERPRISE;
  const base = baseUrl || SITE_URL;
  // Primary public route is the path-based /property/<slug> (see vercel.json,
  // where that path is served by this function with the tags already in the
  // HTML). ?property= remains a working alias but is never canonicalised to.
  const canonicalUrl = `${base}/property/${encodeURIComponent(property.slug || property.id)}`;

  const isLand =
    property.property_type.includes('land') ||
    property.property_type === 'residential_land' ||
    property.property_type === 'commercial_land' ||
    property.property_type === 'agricultural_land' ||
    property.property_type === 'development_land';

  const isRoom = property.property_type === 'single_room' || property.property_type === 'self_contained';

  let categoryKeyword = 'Properties';
  if (isLand) {
    categoryKeyword = 'Titled Lands & Plots';
  } else if (isRoom) {
    categoryKeyword = 'Rooms & Self-Contained Units';
  } else if (property.transaction_type === 'RENT') {
    categoryKeyword = 'Rental Properties & Apartments';
  } else {
    categoryKeyword = 'Properties for Sale';
  }

  const locationStr = [property.area, property.city, property.region, property.country]
    .filter(Boolean)
    .join(', ');

  const priceLabel = formatPriceLabel(property);
  const availability = availabilityLabel(property.status);

  const specs = isLand
    ? `${property.land_size_sqm ? `${property.land_size_sqm} sqm ` : ''}titled land`
    : `${property.bedrooms > 0 ? `${property.bedrooms} bed` : 'room'}${
        property.bathrooms > 0 ? `, ${property.bathrooms} bath` : ''
      }`;

  // Title: property name + category + location + price. The brand is appended
  // only while the whole string stays a sensible length, so the location and
  // price a searcher cares about are never pushed past the cut-off.
  const titleParts = [property.title, `${categoryKeyword} in ${property.city}`, priceLabel];
  const titleWithBrand = [...titleParts, brand].join(' | ');
  const title = titleWithBrand.length <= 96 ? titleWithBrand : titleParts.join(' | ');

  // Meta description: the owner's own copy leads when one exists — it is the
  // only part that differs listing-to-listing — followed by verified column
  // values. With no description on the row the sentence still stands on real
  // facts, and "verified" is only claimed when the listing is actually marked
  // verified.
  const ownedText = (property.description || '').replace(/\s+/g, ' ').trim();
  const factLine =
    `${property.title} in ${locationStr}. ${specs}, ${priceLabel}, ${availability.toLowerCase()}` +
    `${property.is_verified ? `, verified by ${brand}` : ''}.`;
  const factTail =
    `${specs}, ${priceLabel}, ${availability.toLowerCase()}` +
    `${property.is_verified ? `, verified by ${brand}` : ''}.`;
  const description = clampDescription(
    ownedText ? `${clampDescription(ownedText, 96)} ${factTail}` : factLine
  );

  const keywords = [
    'room',
    'single room',
    'self contained room',
    'rooms for rent',
    'lands',
    'lands for sale',
    'titled land Ghana',
    'properties',
    'properties for rent',
    'properties for sale',
    'real estate Ghana',
    BRAND,
    ENTERPRISE,
    property.title,
    property.city,
    property.region,
    property.property_type.replace(/_/g, ' '),
    property.transaction_type,
  ].join(', ');

  // Primary image (falls back to the brand logo so shared links always preview
  // correctly). Crawlers can only fetch absolute http(s) URLs, so inline data
  // URLs and dead blob: URLs are never emitted as og:image.
  const crawlableImages = usableMedia(property.media)
    .filter((m) => m.media_type === 'IMAGE')
    .map((m) => m.url)
    .filter((url) => isAbsoluteHttpUrl(url));
  const coverUrl = primaryMedia(property.media)?.url;
  const ogImage = isAbsoluteHttpUrl(coverUrl) ? coverUrl! : `${base}/logo.png`;

  const specificType = getSchemaPropertyType(property.property_type);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      '@id': canonicalUrl,
      name: property.title,
      description: property.description || description,
      url: canonicalUrl,
      image: crawlableImages.length > 0 ? crawlableImages : [ogImage],
      // Only reported when the row really carries a creation timestamp —
      // never backfilled with "now", which would be an invented date.
      ...(property.created_at ? { datePosted: property.created_at } : {}),
      offers: {
        '@type': 'Offer',
        price: property.price,
        priceCurrency: property.currency,
        availability: schemaAvailability(property.status),
        businessFunction:
          property.transaction_type === 'RENT' ? 'https://schema.org/LeaseOut' : 'https://schema.org/Sell',
        ...(property.created_at ? { validFrom: property.created_at } : {}),
      },
      seller: {
        '@type': 'RealEstateAgent',
        name: brand,
        legalName: enterprise,
        telephone: settings?.phone || '+233 24 000 0000',
        email: settings?.email || 'info@adibexprestige.com',
        url: base,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': specificType,
      name: property.title,
      description: property.description || description,
      url: canonicalUrl,
      image: ogImage,
      address: {
        '@type': 'PostalAddress',
        streetAddress: property.address || property.area || property.city,
        addressLocality: property.city,
        addressRegion: property.region,
        addressCountry: property.country || 'GH',
      },
      ...(property.latitude && property.longitude
        ? {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: property.latitude,
              longitude: property.longitude,
            },
          }
        : {}),
      ...(property.bedrooms > 0 ? { numberOfBedrooms: property.bedrooms } : {}),
      ...(property.bathrooms > 0 ? { numberOfBathroomsTotal: property.bathrooms } : {}),
      ...(property.floor_area_sqm
        ? {
            floorSize: {
              '@type': 'QuantitativeValue',
              value: property.floor_area_sqm,
              unitCode: 'MTK',
            },
          }
        : {}),
      ...(property.land_size_sqm
        ? {
            area: {
              '@type': 'QuantitativeValue',
              value: property.land_size_sqm,
              unitCode: 'MTK',
            },
          }
        : {}),
      amenityFeature: property.amenities?.map((amenity) => ({
        '@type': 'LocationFeatureSpecification',
        name: amenity,
        value: true,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: base,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: categoryKeyword,
          item: `${base}/?view=search&type=${property.property_type}`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: property.title,
          item: canonicalUrl,
        },
      ],
    },
  ];

  return {
    title,
    description,
    keywords,
    canonicalUrl,
    // og:type "website" is what every social scraper expects for a property
    // detail page.
    ogType: 'website',
    ogImage,
    ogImageAlt: `${property.title} — ${categoryKeyword} in ${property.city}`,
    twitterCard: 'summary_large_image',
    jsonLd,
  };
}

/** Port of the `property_not_found` branch of buildViewSEOMetadata(). */
function buildNotFoundMetadata(settings?: CompanySettingsLike | null): SEOMetadata {
  const brand = settings?.brand_name || BRAND;
  return {
    title: `Listing not found | ${brand}`,
    description: 'This property listing is no longer available.',
    keywords: DEFAULT_KEYWORDS,
    // no canonical: combining noindex with a canonical that points somewhere
    // else sends crawlers mixed signals.
    canonicalUrl: '',
    ogType: 'website',
    ogImage: `${SITE_URL}/logo.png`,
    ogImageAlt: brand,
    twitterCard: 'summary',
    jsonLd: undefined,
    robots: 'noindex, follow',
  };
}

// --- head injection (src/lib/headInject.ts) -------------------------------

/** Builds the replacement <head> payload for a metadata object. */
function buildHeadTags(metadata: SEOMetadata): string {
  const meta = (attr: 'name' | 'property', key: string, content: string): string =>
    `<meta ${attr}="${key}" content="${escapeHtml(content)}" ${SSR_SEO_MARKER} />`;

  const tags: string[] = [
    `<title ${SSR_SEO_MARKER}>${escapeHtml(metadata.title)}</title>`,
    meta('name', 'description', metadata.description),
    meta('name', 'keywords', metadata.keywords),
    meta(
      'name',
      'robots',
      `${metadata.robots || 'index, follow'}, max-image-preview:large, max-snippet:-1, max-video-preview:-1`
    ),
    // The shell's static googlebot/bingbot tags would override the generic
    // directive for those crawlers, so they are replaced with the same value.
    meta('name', 'googlebot', metadata.robots || 'index, follow'),
    meta('name', 'bingbot', metadata.robots || 'index, follow'),
    meta('name', 'author', ENTERPRISE),
    meta('name', 'application-name', BRAND),
    meta('property', 'og:title', metadata.title),
    meta('property', 'og:description', metadata.description),
    meta('property', 'og:type', metadata.ogType),
    meta('property', 'og:site_name', BRAND),
  ];

  // An empty canonical means "no canonical" (a noindex page must not claim one),
  // so both og:url and <link rel=canonical> are omitted together.
  if (metadata.canonicalUrl) {
    tags.push(meta('property', 'og:url', metadata.canonicalUrl));
  }

  if (metadata.ogImage) {
    tags.push(meta('property', 'og:image', metadata.ogImage));
    tags.push(meta('property', 'og:image:secure_url', metadata.ogImage));
    if (metadata.ogImageAlt) {
      tags.push(meta('property', 'og:image:alt', metadata.ogImageAlt));
    }
    tags.push(meta('name', 'twitter:image', metadata.ogImage));
  }

  tags.push(meta('name', 'twitter:card', metadata.twitterCard || 'summary_large_image'));
  tags.push(meta('name', 'twitter:title', metadata.title));
  tags.push(meta('name', 'twitter:description', metadata.description));
  if (metadata.canonicalUrl) {
    tags.push(`<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" ${SSR_SEO_MARKER} />`);
  }

  if (metadata.jsonLd) {
    const blocks = Array.isArray(metadata.jsonLd) ? metadata.jsonLd : [metadata.jsonLd];
    for (const block of blocks) {
      // "<" is escaped so no value in the data can terminate the script tag.
      const json = JSON.stringify(block).replace(/</g, '\\u003c');
      tags.push(`<script type="application/ld+json" ${SSR_SEO_MARKER}>${json}</script>`);
    }
  }

  return `\n    ${tags.join('\n    ')}\n  `;
}

/**
 * Replaces the generic head of the built SPA shell with this page's own tags.
 */
function injectSeoHead(html: string, metadata: SEOMetadata): string {
  const headClose = html.indexOf('</head>');
  if (headClose === -1) return html;

  const head = html
    .slice(0, headClose)
    .replace(/<title[^>]*>[\s\S]*?<\/title>/i, '')
    .replace(
      /<meta\b[^>]*\bname=["'](?:description|keywords|robots|googlebot|bingbot|author|application-name|twitter:[^"']*)["'][^>]*>/gi,
      ''
    )
    .replace(/<meta\b[^>]*\bproperty=["']og:[^"']*["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*\bid=["']adibex-seo-jsonld["'][^>]*>[\s\S]*?<\/script>/i, '');

  return `${head}${buildHeadTags(metadata)}${html.slice(headClose)}`;
}

// ===========================================================================
// Request handling
// ===========================================================================

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
let settingsCache: CacheEntry<CompanySettingsLike | null> | null = null;
const rowCache = new Map<string, CacheEntry<PropertyRow | null>>();

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

  const host =
    String(process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim() || new URL(SITE_URL).host;
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
async function fetchSettings(): Promise<CompanySettingsLike | null> {
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
    const value = row as CompanySettingsLike;
    settingsCache = { value, at: Date.now() };
    return value;
  } catch {
    return null;
  }
}

type RowResult =
  | { outcome: 'found'; property: PropertyRow }
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

    const property = row as unknown as PropertyRow;
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
        ? buildPropertySEOMetadata(result.property, settings, SITE_URL)
        : buildNotFoundMetadata(settings);

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

// Exported for scripts/verify-seo.ts parity checks only.
export const __testables = { buildPropertySEOMetadata, buildHeadTags, injectSeoHead, buildNotFoundMetadata };
