import React, { useEffect } from 'react';
import { Property, CompanySettings } from '../../types';
import {
  buildPropertySEOMetadata,
  buildViewSEOMetadata,
  applySEOMetadata,
  SEOMetadata,
} from '../../utils/seo';

export interface SEOManagerProps {
  currentView: string;
  property?: Property | null;
  settings?: CompanySettings;
  searchFilters?: any;
}

/**
 * SEOManager Component
 * Dynamically synchronizes document title, meta descriptions, Open Graph tags,
 * Twitter cards, canonical URLs, and Schema.org JSON-LD structured data based
 * on the current route and the specific property being inspected.
 *
 * Maximizes search visibility on Google, Safari, Chrome, Edge and social previews
 * targeting "room", "lands", and "properties".
 */
export const SEOManager: React.FC<SEOManagerProps> = ({
  currentView,
  property,
  settings,
  searchFilters,
}) => {
  useEffect(() => {
    let metadata: SEOMetadata;

    if (currentView === 'property_detail' && property) {
      metadata = buildPropertySEOMetadata(property, settings);
    } else {
      metadata = buildViewSEOMetadata(currentView, searchFilters, settings);
    }

    applySEOMetadata(metadata);
  }, [currentView, property, settings, searchFilters]);

  // Hidden semantic markup aiding search engine crawlers (Googlebot, Bingbot, Applebot, DuckDuckBot)
  return (
    <aside
      id="seo-crawl-index"
      className="sr-only"
      aria-hidden="true"
      itemScope
      itemType="https://schema.org/RealEstateAgent"
    >
      <meta itemProp="name" content="ADIBEX PRESTIGE PROPERTIES" />
      <meta itemProp="legalName" content="ADIBEX PRESTIGE ENTERPRISE" />
      <meta
        itemProp="description"
        content="Premier Ghana Real Estate agency for Room rentals, Titled Land acquisitions, and Luxury Properties sales."
      />
      <meta itemProp="telephone" content={settings?.phone || '+233 24 000 0000'} />
      <meta itemProp="email" content={settings?.email || 'info@adibexprestige.com'} />
      <span itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
        <meta itemProp="streetAddress" content={settings?.address || 'Accra, Ghana'} />
        <meta itemProp="addressLocality" content="Accra" />
        <meta itemProp="addressCountry" content="GH" />
      </span>

      {/* Target Search Keywords Context for Crawlers */}
      <ul>
        <li>Rooms: Single room self-contained, chamber and hall, executive rooms for rent in Ghana</li>
        <li>Lands: Titled litigation-free land, serviced plots, commercial and residential land for sale</li>
        <li>Properties: Luxury houses, apartments, villas, and commercial properties by ADIBEX PRESTIGE PROPERTIES</li>
      </ul>
    </aside>
  );
};
