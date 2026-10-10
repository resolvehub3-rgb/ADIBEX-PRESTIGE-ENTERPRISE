/**
 * Server-side <head> injection for property detail pages.
 *
 * The app is a client-rendered SPA, so without this every listing URL served
 * the same generic <title>/og:* tags until JavaScript ran — invisible to social
 * scrapers (WhatsApp, X, LinkedIn) and to crawlers that read the raw HTML.
 * api/property-page.ts fetches the listing through the public anon key and
 * splices its real metadata into the shell right here.
 *
 * Every injected tag is stamped with SSR_SEO_MARKER. Once React hydrates,
 * applySEOMetadata() deletes them before writing the client-side equivalents,
 * so the final DOM always contains exactly one copy of each tag.
 */

import type { SEOMetadata } from '../utils/seo';
import { SSR_SEO_MARKER } from '../utils/seo';

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Builds the replacement <head> payload for a metadata object. */
export function buildHeadTags(metadata: SEOMetadata): string {
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
    meta('name', 'author', 'ADIBEX PRESTIGE ENTERPRISE'),
    meta('name', 'application-name', 'ADIBEX PRESTIGE PROPERTIES'),
    meta('property', 'og:title', metadata.title),
    meta('property', 'og:description', metadata.description),
    meta('property', 'og:type', metadata.ogType),
    meta('property', 'og:site_name', 'ADIBEX PRESTIGE PROPERTIES'),
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
 * Replaces the generic head tags in the built shell with the per-listing ones.
 * Returns the input unchanged when the shell has no </head> (never returns
 * broken markup).
 */
export function injectSeoHead(html: string, metadata: SEOMetadata): string {
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
