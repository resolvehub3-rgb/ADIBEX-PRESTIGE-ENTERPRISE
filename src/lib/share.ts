import type { Property } from '../types';
import { absoluteSiteUrl } from './siteUrl';

/**
 * Public listing URL for a property — the same deep link the SEO layer uses,
 * so a shared link lands on the property detail page (works on any device).
 * Always the production domain, never localhost or a preview URL.
 */
export function propertyShareUrl(property: Pick<Property, 'id' | 'slug'>): string {
  return absoluteSiteUrl(`/property/${encodeURIComponent(property.slug || property.id)}`);
}

/** Short caption used by the native share sheet and social intents. */
export function propertyShareText(
  property: Pick<Property, 'title'> & { reference_no?: string | null }
): string {
  const ref = property.reference_no ? ` (Ref: ${property.reference_no})` : '';
  return `Check out this verified listing: ${property.title}${ref} on ADIBEX PRESTIGE PROPERTIES.`;
}
