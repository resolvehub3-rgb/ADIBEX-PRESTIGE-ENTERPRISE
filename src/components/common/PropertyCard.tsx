import React from 'react';
import {
  Bed,
  Bath,
  Maximize2,
  MapPin,
  CheckCircle,
  Heart,
  Eye,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Property, CurrencyCode, PROPERTY_TYPE_LABELS } from '../../types';
import { formatCurrency } from '../../lib/db';

interface PropertyCardProps {
  property: Property;
  currency: CurrencyCode;
  isFavorited?: boolean;
  onToggleFavorite?: (propertyId: string) => void;
  onSelect: (property: Property) => void;
  onReserveClick?: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  currency,
  isFavorited = false,
  onToggleFavorite,
  onSelect,
  onReserveClick,
}) => {
  // Find primary image or first media image
  const primaryMedia = property.media?.find((m) => m.is_primary) || property.media?.[0];
  const imageUrl = primaryMedia?.url || null;

  const typeInfo = PROPERTY_TYPE_LABELS[property.property_type] || {
    label: property.property_type,
    category: 'residential',
  };

  const availableUnitsCount = property.units?.filter((u) => u.status === 'AVAILABLE').length || 0;
  const totalUnitsCount = property.units?.length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-600/90 text-white backdrop-blur-xs shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Available
          </span>
        );
      case 'RESERVED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/95 text-white backdrop-blur-xs shadow-xs">
            Reserved
          </span>
        );
      case 'RENTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-900/90 text-white backdrop-blur-xs shadow-xs">
            Rented
          </span>
        );
      case 'SOLD':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-700/90 text-white backdrop-blur-xs shadow-xs">
            Sold Out
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-700/90 text-white backdrop-blur-xs shadow-xs">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 hover:border-[#D4AF37]/60 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      {/* Property Image Container */}
      <div className="relative aspect-16/10 overflow-hidden bg-slate-100 cursor-pointer" onClick={() => onSelect(property)}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#2A0845]/10 to-[#D4AF37]/15 text-[#2A0845] p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center mb-2 shadow-xs">
              <Sparkles className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <span className="text-xs font-bold text-[#2A0845]">{property.title}</span>
            <span className="text-[11px] text-slate-500 mt-0.5">{typeInfo.label}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          {getStatusBadge(property.status)}
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2A0845]/90 text-[#D4AF37] border border-[#D4AF37]/30 backdrop-blur-xs shadow-xs">
            For {property.transaction_type}
          </span>
        </div>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(property.id);
            }}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-rose-600 backdrop-blur-xs transition-colors shadow-xs cursor-pointer"
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        )}

        {/* Units badge if multi-unit property */}
        {totalUnitsCount > 0 && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 text-white backdrop-blur-xs text-[11px] font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>
              {availableUnitsCount} of {totalUnitsCount} Units Available
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Price Header */}
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <div className="text-lg font-extrabold text-[#2A0845]">
              {formatCurrency(property.price, currency, property.currency)}
              {property.transaction_type === 'RENT' && property.rental_frequency && (
                <span className="text-xs font-medium text-slate-500">
                  {' '}/ {property.rental_frequency}
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {property.reference_no}
            </span>
          </div>

          {/* Title */}
          <h3
            onClick={() => onSelect(property)}
            className="font-bold text-sm text-slate-900 group-hover:text-[#2A0845] transition-colors line-clamp-1 cursor-pointer"
            title={property.title}
          >
            {property.title}
          </h3>

          {/* Location */}
          <p className="flex items-center gap-1 text-xs text-slate-500 mt-1.5 mb-3 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
            <span>
              {property.area ? `${property.area}, ` : ''}{property.city}, {property.region}, {property.country}
            </span>
          </p>

          {/* Key Attributes */}
          <div className="flex items-center gap-3 py-3 border-y border-slate-100 text-xs text-slate-600">
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-purple-700" />
                <span>{property.bedrooms} Beds</span>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="flex items-center gap-1">
                <Bath className="w-3.5 h-3.5 text-purple-700" />
                <span>{property.bathrooms} Baths</span>
              </div>
            )}
            {property.floor_area_sqm && property.floor_area_sqm > 0 && (
              <div className="flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5 text-purple-700" />
                <span>{property.floor_area_sqm} m²</span>
              </div>
            )}
            {property.land_size_sqm && property.land_size_sqm > 0 && (
              <div className="flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5 text-purple-700" />
                <span>{property.land_size_sqm} m² Land</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 flex items-center gap-2">
          <button
            onClick={() => onSelect(property)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/60 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-purple-700" />
            <span>View Details</span>
          </button>

          {property.status === 'AVAILABLE' && onReserveClick && (
            <button
              onClick={() => onReserveClick(property)}
              className="py-2 px-3.5 rounded-xl bg-[#2A0845] text-white hover:bg-[#3D105E] font-semibold text-xs transition-all shadow-xs shadow-purple-950/10 cursor-pointer"
            >
              Reserve
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
