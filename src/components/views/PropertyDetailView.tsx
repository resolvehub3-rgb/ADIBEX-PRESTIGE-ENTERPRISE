import React, { useState } from 'react';
import {
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  Phone,
  MessageCircle,
  Share2,
  Heart,
  CheckCircle2,
  Shield,
  Layers,
  Sparkles,
  ArrowLeft,
  Eye,
  Check,
  Building,
  Video,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Property, PropertyUnit, CurrencyCode, CompanySettings, UserProfile } from '../../types';
import { formatCurrency } from '../../lib/db';
import { ReservationModal } from '../modals/ReservationModal';
import { ViewingRequestModal } from '../modals/ViewingRequestModal';

interface PropertyDetailViewProps {
  property: Property;
  currency: CurrencyCode;
  settings: CompanySettings;
  userProfile?: UserProfile | null;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  onBack: () => void;
  onUnitReserved?: () => void;
}

export const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({
  property,
  currency,
  settings,
  userProfile,
  isFavorited = false,
  onToggleFavorite,
  onBack,
  onUnitReserved,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedUnitForBooking, setSelectedUnitForBooking] = useState<PropertyUnit | null>(null);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [viewingModalOpen, setViewingModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const images = property.media?.filter((m) => m.media_type === 'IMAGE') || [];
  const videos = property.media?.filter((m) => m.media_type === 'VIDEO') || [];
  const activeMedia = images[activeImageIndex] || null;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?property=${encodeURIComponent(property.slug || property.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${property.title} | ADIBEX PRESTIGE PROPERTIES`,
          text: `Check out this verified listing: ${property.title} on ADIBEX PRESTIGE PROPERTIES.`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch (e) {
      // share cancelled or clipboard error
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hello ADIBEX PRESTIGE PROPERTIES, I am interested in: "${property.title}" (Ref: ${property.reference_no}). Can you provide more information?`
  );
  const agentPhone = property.agent?.phone || settings.phone;
  const whatsappUrl = `https://wa.me/${agentPhone.replace(/[^\d]/g, '')}?text=${whatsappMessage}`;

  return (
    <div className="bg-slate-50/50 min-h-screen pb-20">
      {/* Top Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 font-semibold text-[#2A0845] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Listings</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="capitalize">{property.property_type.replace('_', ' ')}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-800 font-medium truncate max-w-xs">{property.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>

            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(property.id)}
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                  isFavorited
                    ? 'border-rose-300 bg-rose-50 text-rose-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Left Content (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Gallery Section */}
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs">
              <div className="relative aspect-16/9 bg-slate-900 overflow-hidden">
                {activeMedia?.url ? (
                  <img
                    src={activeMedia.url}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Building className="w-16 h-16 text-[#D4AF37] mb-2" />
                    <span className="text-sm font-semibold">ADIBEX PRESTIGE PROPERTIES</span>
                    <span className="text-xs text-slate-500">{property.title}</span>
                  </div>
                )}

                {/* Overlaid Badges */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-[#2A0845]/90 text-[#D4AF37] border border-[#D4AF37]/40 backdrop-blur-md">
                    For {property.transaction_type}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-md ${
                      property.status === 'AVAILABLE'
                        ? 'bg-emerald-600/90 text-white'
                        : 'bg-amber-600/90 text-white'
                    }`}
                  >
                    {property.status}
                  </span>
                </div>

                <div className="absolute bottom-4 right-4 px-3 py-1 rounded-lg bg-black/70 text-white text-xs font-medium backdrop-blur-xs">
                  {images.length > 0 ? `${activeImageIndex + 1} / ${images.length} Photos` : 'Photo Preview'}
                </div>
              </div>

              {/* Thumbnails row */}
              {images.length > 1 && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2.5 overflow-x-auto">
                  {images.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        activeImageIndex === idx
                          ? 'border-[#2A0845] scale-105 shadow-sm'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Core Overview */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-purple-50 text-[#2A0845] border border-purple-200">
                      REF: {property.reference_no}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Listing
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0845] tracking-tight">
                    {property.title}
                  </h1>
                  <p className="flex items-center gap-1.5 text-slate-600 text-sm mt-2">
                    <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span>
                      {property.address ? `${property.address}, ` : ''}
                      {property.area ? `${property.area}, ` : ''}
                      {property.city}, {property.region}, Ghana
                    </span>
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                    Offered Price
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#2A0845]">
                    {formatCurrency(property.price, currency, property.currency)}
                  </div>
                  {property.transaction_type === 'RENT' && property.rental_frequency && (
                    <span className="text-xs font-semibold text-slate-500">
                      per {property.rental_frequency}
                    </span>
                  )}
                </div>
              </div>

              {/* Key Attributes Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white text-[#2A0845] border border-purple-200 shadow-xs">
                    <Bed className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Bedrooms</span>
                    <p className="font-bold text-sm">{property.bedrooms > 0 ? property.bedrooms : 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white text-[#2A0845] border border-purple-200 shadow-xs">
                    <Bath className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Bathrooms</span>
                    <p className="font-bold text-sm">{property.bathrooms > 0 ? property.bathrooms : 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white text-[#2A0845] border border-purple-200 shadow-xs">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Floor Area</span>
                    <p className="font-bold text-sm">
                      {property.floor_area_sqm ? `${property.floor_area_sqm} m²` : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white text-[#2A0845] border border-purple-200 shadow-xs">
                    <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Furnishing</span>
                    <p className="font-bold text-sm capitalize">{property.furnishing_status}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <h3 className="font-bold text-base text-slate-900">Property Description</h3>
                <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {property.description}
                </div>
              </div>

              {/* Multi-Unit Listing Table if available */}
              {property.units && property.units.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#D4AF37]" />
                        Available Rooms & Units in this Complex
                      </h3>
                      <p className="text-xs text-slate-500">
                        Select a specific unit to lock your reservation immediately.
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4 text-left">Unit / Room</th>
                          <th className="py-3 px-4 text-left">Floor</th>
                          <th className="py-3 px-4 text-left">Price</th>
                          <th className="py-3 px-4 text-left">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {property.units.map((u) => {
                          const isAvail = u.status === 'AVAILABLE';
                          return (
                            <tr key={u.id} className="hover:bg-purple-50/30 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-800">
                                {u.unit_name}
                                {u.bedrooms ? (
                                  <span className="text-[10px] text-slate-400 font-normal block">
                                    {u.bedrooms} Bed • {u.bathrooms} Bath
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">{u.floor_level || 'Ground'}</td>
                              <td className="py-3.5 px-4 font-bold text-purple-900">
                                {formatCurrency(u.price, currency, u.currency)}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isAvail
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {u.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {isAvail ? (
                                  <button
                                    onClick={() => {
                                      setSelectedUnitForBooking(u);
                                      setReservationModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-[#2A0845] text-white text-xs font-semibold hover:bg-[#3D105E] transition-colors cursor-pointer"
                                  >
                                    Reserve
                                  </button>
                                ) : (
                                  <span className="text-slate-400 font-medium text-[11px]">Unavailable</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Amenities Grid */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="font-bold text-base text-slate-900">Amenities & Inclusions</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {property.amenities.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 font-medium"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                        <span className="capitalize">{item.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Virtual Tour or Video embed if provided */}
              {(property.virtual_tour_url || videos.length > 0) && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Video className="w-5 h-5 text-purple-700" />
                    Virtual Tour & Video Walkthrough
                  </h3>
                  {property.virtual_tour_url && (
                    <a
                      href={property.virtual_tour_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-100 text-[#2A0845] font-semibold text-xs hover:bg-purple-200 transition-colors"
                    >
                      <span>Open 360° Interactive Virtual Tour</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Sticky Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Primary Action Card */}
            <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xl shadow-purple-950/5 space-y-5 sticky top-28">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Reservation Price
                </span>
                <div className="text-2xl font-extrabold text-[#2A0845] mt-1">
                  {formatCurrency(property.price, currency, property.currency)}
                  {property.transaction_type === 'RENT' && property.rental_frequency && (
                    <span className="text-xs font-medium text-slate-500"> / {property.rental_frequency}</span>
                  )}
                </div>
              </div>

              {property.status === 'AVAILABLE' ? (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setSelectedUnitForBooking(null);
                      setReservationModalOpen(true);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#2A0845] text-white font-extrabold text-xs tracking-wider uppercase hover:bg-[#3D105E] transition-all shadow-lg shadow-purple-950/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Reserve Property Now</span>
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  </button>

                  <button
                    onClick={() => setViewingModalOpen(true)}
                    className="w-full py-3 px-4 rounded-xl border-2 border-[#2A0845] text-[#2A0845] font-bold text-xs hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-[#2A0845]" />
                    <span>Book In-Person Viewing</span>
                  </button>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#25D366] text-white font-bold text-xs hover:bg-[#20bd5a] transition-colors flex items-center justify-center gap-2 shadow-xs shadow-emerald-950/10"
                  >
                    <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
                    <span>Chat on WhatsApp</span>
                  </a>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  This property is currently <strong>{property.status}</strong>. You may still book an in-person viewing or contact an agent for upcoming availability.
                  <button
                    onClick={() => setViewingModalOpen(true)}
                    className="mt-3 w-full py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors block text-center"
                  >
                    Request Viewing
                  </button>
                </div>
              )}

              {/* Transparent Fees Breakdown */}
              <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Security Deposit:</span>
                  <span className="font-semibold text-slate-800">
                    {property.security_deposit
                      ? formatCurrency(property.security_deposit, currency, property.currency)
                      : 'Included / Waived'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Service Charge:</span>
                  <span className="font-semibold text-slate-800">
                    {property.service_charge
                      ? formatCurrency(property.service_charge, currency, property.currency)
                      : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Double-Booking Guard:</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                    Real-time Lock
                  </span>
                </div>
              </div>

              {/* Assigned Agent Card */}
              <div className="border-t border-slate-100 pt-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Designated Property Specialist
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2A0845] to-[#451368] text-[#D4AF37] font-bold flex items-center justify-center text-sm shadow-xs">
                    {property.agent?.full_name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800">
                      {property.agent?.full_name || 'Adibex Prestige Agent'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {property.agent?.phone || settings.phone}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <a
                    href={`tel:${property.agent?.phone || settings.phone}`}
                    className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#2A0845]" />
                    <span>Call Now</span>
                  </a>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReservationModal
        isOpen={reservationModalOpen}
        onClose={() => setReservationModalOpen(false)}
        property={property}
        selectedUnit={selectedUnitForBooking}
        userProfile={userProfile}
        settings={settings}
        currency={currency}
        onSuccess={() => {
          if (onUnitReserved) onUnitReserved();
        }}
      />

      <ViewingRequestModal
        isOpen={viewingModalOpen}
        onClose={() => setViewingModalOpen(false)}
        property={property}
        userProfile={userProfile}
      />
    </div>
  );
};
