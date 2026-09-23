import { Property, CompanySettings } from '../types';

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
}

/**
 * Ensures or updates a <meta> element in the document head.
 */
export function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Ensures or updates a <link rel="..."> element in the document head.
 */
export function setLinkTag(rel: string, href: string): void {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
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
 * Format currency amount for SEO labels
 */
function formatPriceForSEO(price: number, currency: string): string {
  return `${currency} ${price.toLocaleString()}`;
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
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://adibexprestige.com');
  const canonicalUrl = `${base}/?property=${property.slug || property.id}`;

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

  const title = `${property.title} | ${categoryKeyword} in ${property.city} | ${brand}`;

  // Rich description with transaction, price, specs, and search terms
  const priceDisplay = formatPriceForSEO(property.price, property.currency);
  const specs = isLand
    ? `${property.land_size_sqm ? `${property.land_size_sqm} sqm ` : ''}titled land for sale`
    : `${property.bedrooms > 0 ? `${property.bedrooms} Bed` : 'Room'} • ${property.bathrooms > 0 ? `${property.bathrooms} Bath` : ''}`;

  const description = property.description
    ? `${property.title} in ${locationStr}. ${specs}, priced at ${priceDisplay} (${property.transaction_type.toLowerCase()}). Verified listing by ${brand}. Book an inspection tour or reserve online.`
    : `Explore ${property.title} located at ${locationStr}. Available for ${property.transaction_type.toLowerCase()} at ${priceDisplay}. Verified ${categoryKeyword.toLowerCase()} by ${brand}.`;

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

  // Primary image (falls back to the brand logo so shared links always preview correctly)
  const primaryMedia = property.media?.find((m) => m.is_primary) || property.media?.[0];
  const ogImage = primaryMedia?.url || `${base}/logo.png`;

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
      image: property.media?.map((m) => m.url) || [ogImage],
      datePosted: property.created_at || new Date().toISOString(),
      offers: {
        '@type': 'Offer',
        price: property.price,
        priceCurrency: property.currency,
        availability: property.status === 'AVAILABLE' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
        businessFunction: property.transaction_type === 'RENT' ? 'https://schema.org/LeaseOut' : 'https://schema.org/Sell',
        validFrom: property.created_at || new Date().toISOString(),
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
    ogType: 'article',
    ogImage,
    ogImageAlt: property.title,
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
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://adibexprestige.com');

  const defaultKeywords =
    'room, single room, self contained room, rooms for rent in Ghana, single room self contained, lands, lands for sale, titled land Accra, serviced plots Ghana, properties, properties for rent, properties for sale, commercial properties, houses for rent, luxury apartments, real estate Ghana, ADIBEX PRESTIGE PROPERTIES, ADIBEX PRESTIGE ENTERPRISE, East Legon properties, Airport residential, Kumasi lands, property booking SaaS';

  const defaultImage = `${base}/logo.png`;

  // Specific search filter optimizations
  if (view === 'search') {
    const typeFilter = filters?.propertyType || '';
    const transactionFilter = filters?.transactionType || '';
    const cityFilter = filters?.city || '';

    let searchTopic = 'Rooms, Lands & Properties';
    if (typeFilter.includes('land')) {
      searchTopic = 'Titled Lands & Plots for Sale';
    } else if (typeFilter === 'single_room' || typeFilter === 'self_contained') {
      searchTopic = 'Rooms & Self-Contained Units for Rent';
    } else if (transactionFilter === 'RENT') {
      searchTopic = 'Rental Rooms, Apartments & Properties';
    } else if (transactionFilter === 'SALE') {
      searchTopic = 'Properties & Lands for Sale';
    }

    const title = cityFilter
      ? `${searchTopic} in ${cityFilter} | ${brand}`
      : `${searchTopic} | Verified Listings | ${brand}`;

    const description = `Find verified ${searchTopic.toLowerCase()} in ${cityFilter || 'Ghana'}. Filter by price, location, bedrooms, and amenities with ${brand}. Secure instant reservations & fast viewing bookings.`;

    return {
      title,
      description,
      keywords: `search ${searchTopic.toLowerCase()}, ${defaultKeywords}`,
      canonicalUrl: `${base}/?view=search`,
      ogType: 'website',
      ogImage: defaultImage,
      ogImageAlt: `${searchTopic} - ${brand}`,
      twitterCard: 'summary',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'SearchResultsPage',
        name: title,
        description,
        url: `${base}/?view=search`,
        provider: {
          '@type': 'RealEstateAgent',
          name: brand,
          url: base,
        },
      },
    };
  }

  if (view === 'how-it-works') {
    return {
      title: `How to Rent Rooms, Buy Lands & Reserve Properties | ${brand}`,
      description: `Step-by-step guide to finding rooms for rent, buying titled litigation-free lands, and reserving properties securely with ${brand}. Transparent fees, mobile money, and fast verification.`,
      keywords: `how to buy land in Ghana, rent a room online, property reservation guide, ${defaultKeywords}`,
      canonicalUrl: `${base}/?view=how-it-works`,
      ogType: 'website',
      ogImage: defaultImage,
      ogImageAlt: `How It Works - ${brand}`,
      twitterCard: 'summary',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'How to Reserve Rooms, Lands & Properties with ADIBEX PRESTIGE PROPERTIES',
        description: 'Guide to searching, scheduling viewing, and reserving real estate in Ghana.',
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: 'Search Rooms, Lands & Properties',
            text: 'Browse our curated, verified listings for rooms, lands, apartments, and commercial real estate.',
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: 'Schedule Inspection Tour',
            text: 'Request an in-person viewing with an assigned staff agent.',
          },
          {
            '@type': 'HowToStep',
            position: 3,
            name: 'Instant Lock Reservation',
            text: 'Secure the property or room with an instant lock and formal payment verification.',
          },
        ],
      },
    };
  }

  // Default Home View - Maximum SEO punch for "room", "lands", "properties" to rank #1
  const homeTitle = `ADIBEX PRESTIGE PROPERTIES | Rooms, Lands & Properties in Ghana | Rent & Buy`;
  const homeDescription = `Ghana's #1 premier marketplace for verified rooms for rent, titled litigation-free lands, and luxury residential & commercial properties. Reserve your room or land with ADIBEX PRESTIGE PROPERTIES.`;

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
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '08:00',
          closes: '18:00',
        },
      ],
      priceRange: 'GHS 200 - GHS 50,000,000',
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
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do I find and rent a room with ADIBEX PRESTIGE PROPERTIES?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can search verified single rooms and self-contained units across Ghana on our platform, book an in-person viewing inspection, and reserve the room instantly with a secure lock countdown.',
          },
        },
        {
          '@type': 'Question',
          name: 'Are the lands listed on ADIBEX PRESTIGE PROPERTIES litigation-free and titled?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. ADIBEX PRESTIGE ENTERPRISE verifies all lands and serviced plots to ensure authentic documentation, clear land commission site plans, and litigation-free ownership before publishing.',
          },
        },
        {
          '@type': 'Question',
          name: 'What types of properties can I buy or rent?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We offer single rooms, self-contained rooms, 1-4 bedroom apartments, executive houses, luxury villas, commercial offices, warehouses, and titled residential and commercial lands.',
          },
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

  // 1. Document Title
  document.title = metadata.title;

  // 2. Standard Meta Tags
  setMetaTag('name', 'description', metadata.description);
  setMetaTag('name', 'keywords', metadata.keywords);
  setMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
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
