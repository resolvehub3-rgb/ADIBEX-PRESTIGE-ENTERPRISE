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

  // NOTE: no hidden / sr-only keyword markup here. Search engines treat content
  // that is visually hidden but stuffed with keywords as spam, and the same
  // organization data is already emitted as visible-page JSON-LD by seo.ts.
  return null;
};
