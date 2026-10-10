import { Property, CompanySettings } from '../types';
import { isAbsoluteHttpUrl, usableMedia, primaryMedia as findPrimaryMedia } from '../lib/media';
import { getSiteBaseUrl } from '../lib/siteUrl';
import { HOW_IT_WORKS_STEPS, HOW_IT_WORKS_FAQS } from '../content/howItWorks';

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogType: 'website' | 'article';
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  jsonLd?: object | object[];
  /** Robots directive. Omitted means "index, follow" (the public default). */
  robots?: string;
}

/**
 * Ensures or updates a <meta> element in the document head.
 * An empty value removes the tag, which is how a noindex page drops a
 * canonical/og:url it must not claim.
 */
export function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!content) {
    if (element && element.parentNode) element.parentNode.removeChild(element);
    return;
  }
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Ensures or updates a <link rel="..."> element in the document head.
 * An empty href removes the tag.
 */
export function setLinkTag(rel: string, href: string): void {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!href) {
    if (element && element.parentNode) element.parentNode.removeChild(element);
    return;
  }
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/**
 * Injects or updates a JSON-LD structured data script element.
 */
export function setJSONLD(id: string, data: object | object[]): void {
  if (typeof document === 'undefined') return;

  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data, null, 2);
}

/**
 * Remove a specific JSON-LD script if needed.
 */
export function removeJSONLD(id: string): void {
  if (typeof document === 'undefined') return;
  const script = document.getElementById(id);
  if (script && script.parentNode) {
    script.parentNode.removeChild(script);
  }
}

/**
 * Attribute stamped on head tags injected server-side by
 * src/lib/headInject.ts. Once React hydrates, applySEOMetadata() removes them
 * before writing the client-side equivalents, so crawlers that render JS and
 * crawlers that don't both end up with exactly one title / description /
 * canonical / JSON-LD block — never two competing copies.
 */
export const SSR_SEO_MARKER = 'data-adibex-ssr';

export function removeSSRSeoTags(): void {
  if (typeof document === 'undefined') return;
  const injected = document.head.querySelectorAll(`[${SSR_SEO_MARKER}]`);
  injected.forEach((element) => element.parentNode?.removeChild(element));
}

/**
 * Format currency amount for SEO labels
 */
function formatPriceForSEO(price: number, currency: string): string {
  return `${currency} ${price.toLocaleString()}`;
}

/** "GHS 1,200 per month" — rental frequency only when the row actually has one. */
function formatPriceLabel(property: Property): string {
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
function availabilityLabel(status?: string): string {
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
function schemaAvailability(status?: string): string {
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

/**
 * Canonical URL for a search view, carrying only the filters that are actually
 * applied. A filtered page is therefore its own canonical (it really does show
 * different listings), while /?view=search&category=all collapses back to the
 * plain search URL instead of duplicating it.
 *
 * The parameter order matches STATIC_PAGES in scripts/sitemap-core.mjs so a
 * sitemap URL and its canonical are byte-identical.
 */
function buildSearchCanonicalUrl(
  base: string,
  { category, type, transaction, q }: { category?: string; type?: string; transaction?: string; q?: string }
): string {
  const params = new URLSearchParams();
  params.set('view', 'search');
  if (category && category !== 'all') params.set('category', category);
  if (type && type !== 'all') params.set('type', type);
  if (transaction && transaction !== 'all') params.set('transaction_type', transaction);
  if (q) params.set('q', q);
  return `${base}/?${params.toString()}`;
}

/**
 * Determine Schema.org @type based on property classification
 */
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
  if (propertyType === 'house' || propertyType === 'townhouse' || propertyType === 'villa' || propertyType === 'luxury_home') {
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

/**
 * Builds high-ranking SEO metadata for a single property
 */
export function buildPropertySEOMetadata(
  property: Property,
  settings?: CompanySettings,
  baseUrl: string = ''
): SEOMetadata {
  const brand = settings?.brand_name || 'ADIBEX PRESTIGE PROPERTIES';
  const enterprise = settings?.company_name || 'ADIBEX PRESTIGE ENTERPRISE';
  const base = baseUrl || getSiteBaseUrl();
  // Primary public route is the path-based /property/<slug> (see vercel.json,
  // where that path is served by api/property-page with the tags already in the
  // HTML). ?property= remains a working alias but is never canonicalised to.
  const canonicalUrl = `${base}/property/${encodeURIComponent(property.slug || property.id)}`;

  const isLand =
    property.property_type.includes('land') ||
    property.property_type === 'residential_land' ||
    property.property_type === 'commercial_land' ||
    property.property_type === 'agricultural_land' ||
    property.property_type === 'development_land';

  const isRoom =
    property.property_type === 'single_room' ||
    property.property_type === 'self_contained';

  // Keyword-rich Title targeting "room", "lands", "properties"
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

  // Price and availability come straight from the row's own columns.
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

  // Targeted keywords covering rooms, lands, properties explicitly
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
    'ADIBEX PRESTIGE PROPERTIES',
    'ADIBEX PRESTIGE ENTERPRISE',
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
  const coverUrl = findPrimaryMedia(property.media)?.url;
  const ogImage = isAbsoluteHttpUrl(coverUrl) ? coverUrl! : `${base}/logo.png`;

  // Schema.org RealEstateListing + Specific Accommodation/Land/Residence type
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
    // A listing is not an article; "website" is the correct Open Graph type and
    // what every social scraper expects for a property detail page.
    ogType: 'website',
    ogImage,
    ogImageAlt: `${property.title} — ${categoryKeyword} in ${property.city}`,
    twitterCard: 'summary_large_image',
    jsonLd,
  };
}

/**
 * Builds default / view-level SEO metadata ensuring ADIBEX PRESTIGE PROPERTIES
 * ranks #1 when searching for room, lands, properties across all search engines.
 */
export function buildViewSEOMetadata(
  view: string,
  filters?: any,
  settings?: CompanySettings,
  baseUrl: string = ''
): SEOMetadata {
  const brand = settings?.brand_name || 'ADIBEX PRESTIGE PROPERTIES';
  const enterprise = settings?.company_name || 'ADIBEX PRESTIGE ENTERPRISE';
  const base = baseUrl || getSiteBaseUrl();

  const defaultKeywords =
    'room, single room, self contained room, rooms for rent in Ghana, single room self contained, lands, lands for sale, titled land Accra, serviced plots Ghana, properties, properties for rent, properties for sale, commercial properties, houses for rent, luxury apartments, real estate Ghana, ADIBEX PRESTIGE PROPERTIES, ADIBEX PRESTIGE ENTERPRISE, East Legon properties, Airport residential, Kumasi lands, property booking SaaS';

  const defaultImage = `${base}/logo.png`;

  // Specific search filter optimizations.
  // Filtered search URLs are self-canonical: ?view=search&category=land really
  // does show only land, so it is its own landing page rather than a duplicate.
  if (view === 'search') {
    // The app's filter object is snake_case (see SearchFilterView / Navbar);
    // camelCase is accepted too so older callers keep working.
    const typeFilter = String(filters?.property_type || filters?.propertyType || '');
    const transactionFilter = String(filters?.transaction_type || filters?.transactionType || '');
    const categoryFilter = String(filters?.category || '');
    const cityFilter = String(filters?.city || '');
    const termFilter = String(filters?.searchTerm || filters?.q || '');

    let searchTopic = 'Rooms, Lands & Properties';
    if (typeFilter.includes('land') || categoryFilter === 'land') {
      searchTopic = 'Titled Lands & Plots for Sale';
    } else if (typeFilter === 'single_room' || typeFilter === 'self_contained') {
      searchTopic = 'Rooms & Self-Contained Units for Rent';
    } else if (categoryFilter === 'commercial') {
      searchTopic = 'Commercial Properties, Offices & Shops';
    } else if (categoryFilter === 'residential') {
      searchTopic = 'Residential Houses & Apartments';
    } else if (transactionFilter === 'RENT') {
      searchTopic = 'Rental Rooms, Apartments & Properties';
    } else if (transactionFilter === 'SALE') {
      searchTopic = 'Properties & Lands for Sale';
    }

    const topicWithTerm = termFilter ? `${searchTopic} for “${termFilter}”` : searchTopic;
    const title = cityFilter
      ? `${topicWithTerm} in ${cityFilter} | ${brand}`
      : `${topicWithTerm} in Ghana | ${brand}`;

    const description = clampDescription(
      `Find ${topicWithTerm.toLowerCase()} in ${cityFilter || 'Ghana'}. ` +
        `Filter by price, location, bedrooms and amenities with ${brand}, reserve instantly and book a viewing online.`
    );

    const canonicalUrl = buildSearchCanonicalUrl(base, {
      category: categoryFilter,
      type: typeFilter,
      transaction: transactionFilter,
      q: termFilter,
    });

    return {
      title,
      description,
      keywords: `search ${searchTopic.toLowerCase()}, ${defaultKeywords}`,
      canonicalUrl,
      ogType: 'website',
      ogImage: defaultImage,
      ogImageAlt: `${searchTopic} - ${brand}`,
      twitterCard: 'summary',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'SearchResultsPage',
        name: title,
        description,
        url: canonicalUrl,
        provider: {
          '@type': 'RealEstateAgent',
          name: brand,
          url: base,
        },
      },
    };
  }

  // ?view=how-it-works is the public URL; how_it_works is the internal view id
  // used by the navbar/footer. Both must resolve to the same page.
  if (view === 'how-it-works' || view === 'how_it_works') {
    const howTo = {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `How to Reserve Rooms, Lands & Properties with ${brand}`,
      description:
        'Guide to searching, scheduling a viewing, reserving, paying and collecting keys for real estate in Ghana.',
      // Built from the exact steps rendered by HowItWorksView.
      step: HOW_IT_WORKS_STEPS.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.title,
        text: step.description,
      })),
    };

    // Built from the exact Q&A rendered by HowItWorksView — the home page
    // carries no visible FAQ, so FAQPage markup only ever lives here.
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: HOW_IT_WORKS_FAQS.map((faqItem) => ({
        '@type': 'Question',
        name: faqItem.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faqItem.a,
        },
      })),
    };

    return {
      title: `How to Rent Rooms, Buy Lands & Reserve Properties | ${brand}`,
      description: clampDescription(
        `Step-by-step guide to finding rooms for rent, buying titled lands, and reserving properties securely with ${brand}: viewing, reservation lock, payment and receipt.`
      ),
      keywords: `how to buy land in Ghana, rent a room online, property reservation guide, ${defaultKeywords}`,
      canonicalUrl: `${base}/?view=how-it-works`,
      ogType: 'website',
      ogImage: defaultImage,
      ogImageAlt: `How It Works - ${brand}`,
      twitterCard: 'summary',
      jsonLd: [howTo, faq],
    };
  }

  // A listing URL that no longer resolves (deleted, unpublished or
  // archived listing): tell crawlers not to index a soft-404 page.
  if (view === 'property_not_found') {
    return {
      title: `Listing not found | ${brand}`,
      description: 'This property listing is no longer available.',
      keywords: defaultKeywords,
      // no canonical: combining noindex with a canonical that points somewhere
      // else sends crawlers mixed signals.
      canonicalUrl: '',
      ogType: 'website',
      ogImage: defaultImage,
      ogImageAlt: brand,
      twitterCard: 'summary',
      jsonLd: undefined,
      robots: 'noindex, follow',
    };
  }

  // The one-time owner bootstrap. It is linked from nowhere and carries noindex
  // so it can never appear in results, and it claims no canonical because a
  // noindex page pointing elsewhere sends crawlers mixed signals.
  if (view === 'admin_setup') {
    return {
      title: `Owner Setup | ${brand}`,
      description: `${brand} company owner setup.`,
      keywords: defaultKeywords,
      canonicalUrl: '',
      ogType: 'website',
      ogImage: defaultImage,
      ogImageAlt: brand,
      twitterCard: 'summary',
      jsonLd: undefined,
      robots: 'noindex, nofollow',
    };
  }

  // Dashboards, portals and the auth flow are never public content.
  if (['admin', 'agent', 'portal', 'auth'].includes(view)) {
    return {
      title: `${view === 'portal' ? 'My Account' : view === 'auth' ? 'Sign in' : 'Dashboard'} | ${brand}`,
      description: `${brand} account area.`,
      keywords: defaultKeywords,
      canonicalUrl: '',
      ogType: 'website',
      ogImage: defaultImage,
      ogImageAlt: brand,
      twitterCard: 'summary',
      jsonLd: undefined,
      robots: 'noindex, nofollow',
    };
  }

  // Default Home View — factual wording only ("#1" style ranking claims are
  // not something the page can substantiate, so they are never emitted).
  const homeTitle = `ADIBEX PRESTIGE PROPERTIES | Rooms, Lands & Properties in Ghana | Rent & Buy`;
  const homeDescription = clampDescription(
    `Rooms for rent, titled lands and residential & commercial properties across Ghana. ` +
      `Search listings by location and budget, book a viewing and reserve online with ${brand}.`
  );

  const homeJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      '@id': `${base}/#organization`,
      name: brand,
      legalName: enterprise,
      alternateName: ['ADIBEX PROPERTIES', 'ADIBEX PRESTIGE', 'Adibex Real Estate'],
      slogan: settings?.motto || 'Your Vision Our Mission',
      description: homeDescription,
      url: base,
      logo: `${base}/logo.png`,
      image: defaultImage,
      telephone: settings?.phone || '+233 24 000 0000',
      email: settings?.email || 'info@adibexprestige.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: settings?.address || 'Accra, Ghana',
        addressLocality: 'Accra',
        addressRegion: 'Greater Accra',
        addressCountry: 'GH',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 5.6037,
        longitude: -0.187,
      },
      priceRange: '$$',
      areaServed: [
        { '@type': 'AdministrativeArea', name: 'Greater Accra, Ghana' },
        { '@type': 'AdministrativeArea', name: 'Ashanti Region, Ghana' },
        { '@type': 'AdministrativeArea', name: 'Central Region, Ghana' },
        { '@type': 'AdministrativeArea', name: 'Eastern Region, Ghana' },
        { '@type': 'Country', name: 'Ghana' },
      ],
      makesOffer: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Room Rentals & Single Room Self-Contained Housing',
            description: 'Affordable and executive rooms, flat shares, and single-room self-contained units for rent.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Titled Lands & Commercial Plots Acquisition',
            description: 'Litigation-free residential, commercial, agricultural, and industrial lands in prime locations across Ghana.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Residential & Commercial Properties Sales & Leasing',
            description: 'Luxury homes, townhouses, apartments, office spaces, and retail shops.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${base}/#website`,
      url: base,
      name: brand,
      description: homeDescription,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${base}/?view=search&q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Featured Real Estate Categories: Rooms, Lands & Properties',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Rooms for Rent (Single Rooms & Self-Contained)',
          url: `${base}/?view=search&type=single_room`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Titled Lands & Plots for Sale',
          url: `${base}/?view=search&category=land`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Residential Properties, Houses & Apartments',
          url: `${base}/?view=search&category=residential`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'Commercial Properties & Offices',
          url: `${base}/?view=search&category=commercial`,
        },
      ],
    },
  ];

  return {
    title: homeTitle,
    description: homeDescription,
    keywords: defaultKeywords,
    canonicalUrl: base,
    ogType: 'website',
    ogImage: defaultImage,
    ogImageAlt: `${brand} - Rooms, Lands, Properties`,
    twitterCard: 'summary',
    jsonLd: homeJsonLd,
  };
}

/**
 * Main application function to apply SEO metadata dynamically to the document.
 */
export function applySEOMetadata(metadata: SEOMetadata): void {
  if (typeof document === 'undefined') return;

  // 0. Drop any server-injected head tags first (see src/lib/headInject.ts) so
  // the rendered document ends up with exactly one copy of every tag.
  removeSSRSeoTags();

  // 1. Document Title
  document.title = metadata.title;

  // 2. Standard Meta Tags
  setMetaTag('name', 'description', metadata.description);
  setMetaTag('name', 'keywords', metadata.keywords);
  setMetaTag(
    'name',
    'robots',
    `${metadata.robots || 'index, follow'}, max-image-preview:large, max-snippet:-1, max-video-preview:-1`
  );
  // The static shell also ships googlebot/bingbot-specific tags. If they were
  // left at their generic "index, follow" value they would override the generic
  // robots directive for exactly those crawlers, which turns a noindex 404 into
  // an indexed one. Mirror the directive instead of leaving the contradiction.
  setMetaTag('name', 'googlebot', metadata.robots || 'index, follow');
  setMetaTag('name', 'bingbot', metadata.robots || 'index, follow');
  setMetaTag('name', 'author', 'ADIBEX PRESTIGE ENTERPRISE');
  setMetaTag('name', 'application-name', 'ADIBEX PRESTIGE PROPERTIES');

  // 3. Open Graph Tags
  setMetaTag('property', 'og:title', metadata.title);
  setMetaTag('property', 'og:description', metadata.description);
  setMetaTag('property', 'og:type', metadata.ogType);
  setMetaTag('property', 'og:url', metadata.canonicalUrl);
  setMetaTag('property', 'og:site_name', 'ADIBEX PRESTIGE PROPERTIES');
  setMetaTag('property', 'og:locale', 'en_US');

  if (metadata.ogImage) {
    setMetaTag('property', 'og:image', metadata.ogImage);
    setMetaTag('property', 'og:image:secure_url', metadata.ogImage);
    if (metadata.ogImageAlt) {
      setMetaTag('property', 'og:image:alt', metadata.ogImageAlt);
    }
  }

  // 4. Twitter / X Cards
  setMetaTag('name', 'twitter:card', metadata.twitterCard || 'summary_large_image');
  setMetaTag('name', 'twitter:title', metadata.title);
  setMetaTag('name', 'twitter:description', metadata.description);
  if (metadata.ogImage) {
    setMetaTag('name', 'twitter:image', metadata.ogImage);
  }

  // 5. Canonical Link
  setLinkTag('canonical', metadata.canonicalUrl);

  // 6. Schema.org JSON-LD structured data
  if (metadata.jsonLd) {
    setJSONLD('adibex-seo-jsonld', metadata.jsonLd);
  } else {
    removeJSONLD('adibex-seo-jsonld');
  }
}
