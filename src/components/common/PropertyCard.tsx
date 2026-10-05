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
  Play,
} from 'lucide-react';
import { Property, CurrencyCode, PROPERTY_TYPE_LABELS } from '../../types';
import { formatCurrency } from '../../lib/db';
import { primaryMedia, primaryVideo } from '../../lib/media';
import type { CoverVideo } from '../../lib/media';

interface PropertyCardProps {
  property: Property;
  currency: CurrencyCode;
  isFavorited?: boolean;
  onToggleFavorite?: (propertyId: string) => void;
  onSelect: (property: Property) => void;
  onReserveClick?: (property: Property) => void;
}

/** Reload attempts for a cover clip before the branded placeholder takes over. */
const VIDEO_MAX_RETRIES = 2;

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  currency,
  isFavorited = false,
  onToggleFavorite,
  onSelect,
  onReserveClick,
}) => {
  // Cover photo: primary image or first usable media row (never a dead URL)
  const cover = primaryMedia(property.media);
  const imageUrl = cover?.url || null;

  // A listing whose only media is a video would otherwise drop to the branded
  // placeholder. Use the clip itself as the cover and let it autoplay silently.
  const video: CoverVideo | null = primaryVideo(property.media, property.virtual_tour_url);

  // If a URL still fails to load at runtime, fall back to the branded
  // placeholder instead of showing a broken image.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const [failedVideo, setFailedVideo] = React.useState<string | null>(null);
  // One dropped connection must not strand the listing on the placeholder:
  // the clip gets a couple of reloads before we give up on it.
  const [videoRetry, setVideoRetry] = React.useState<{ src: string; attempt: number }>({
    src: '',
    attempt: 0,
  });
  const attempts = video && videoRetry.src === video.src ? videoRetry.attempt : 0;

  const showImage = Boolean(imageUrl) && failedSrc !== imageUrl;
  const showVideo = !showImage && video !== null && failedVideo !== video.src;

  const handleVideoError = React.useCallback(() => {
    if (!video) return;
    if (attempts >= VIDEO_MAX_RETRIES) {
      setFailedVideo(video.src);
      return;
    }
    const attempt = attempts + 1;
    const src = video.src;
    window.setTimeout(() => setVideoRetry({ src, attempt }), 1200 * attempt);
  }, [video, attempts]);

  // Autoplay is only allowed when the element is muted before playback starts,
  // and React does not always apply `muted` as a property, so force it here.
  const videoRef = React.useCallback((node: HTMLVideoElement | null) => {
    if (!node) return;
    node.muted = true;
    node.defaultMuted = true;
    node.volume = 0;
    const played = node.play();
    if (played && typeof played.catch === 'function') played.catch(() => undefined);
  }, []);

  // Browsers can defer or drop the first play() while the clip is still
  // buffering (or when the tab was briefly in the background), so kick it off
  // again as soon as there is enough data to show the preview moving.
  const ensurePlaying = React.useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    el.muted = true;
    if (!el.paused) return;
    const played = el.play();
    if (played && typeof played.catch === 'function') played.catch(() => undefined);
  }, []);

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
        {showImage ? (
          <img
            src={imageUrl as string}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={() => setFailedSrc(imageUrl as string)}
          />
        ) : showVideo && video?.kind === 'file' ? (
          <video
            ref={videoRef}
            key={`${video.src}#${attempts}`}
            src={video.src}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={`${property.title} video preview`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onCanPlay={ensurePlaying}
            onError={handleVideoError}
          />
        ) : showVideo && video?.kind === 'embed' ? (
          <iframe
            key={video.src}
            src={video.src}
            title={`${property.title} video preview`}
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="w-full h-full border-0 bg-black"
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

        {/* Silent autoplaying preview badge */}
        {showVideo && (
          <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/75 text-white backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Play className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />
            <span>Video Tour</span>
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
