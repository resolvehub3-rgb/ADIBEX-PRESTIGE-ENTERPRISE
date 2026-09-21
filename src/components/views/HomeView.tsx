import React, { useState } from 'react';
import {
  Search,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  MapPin,
  Home,
  Briefcase,
  Store,
  Layers,
  ChevronRight,
  Phone,
  MessageCircle,
} from 'lucide-react';
import {
  Property,
  CurrencyCode,
  CompanySettings,
  GHANA_REGIONS,
  PROPERTY_TYPE_LABELS,
} from '../../types';
import { PropertyCard } from '../common/PropertyCard';
import { PropertyListSkeleton } from '../common/Skeletons';

interface HomeViewProps {
  properties: Property[];
  currency: CurrencyCode;
  settings: CompanySettings;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onNavigate: (view: string, data?: any) => void;
  onOpenReservation?: (property: Property) => void;
  isLoading?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  properties,
  currency,
  settings,
  favorites,
  onToggleFavorite,
  onSelectProperty,
  onNavigate,
  onOpenReservation,
  isLoading = false,
}) => {
  const [heroSearch, setHeroSearch] = useState('');
  const [heroTxn, setHeroTxn] = useState('all');
  const [heroType, setHeroType] = useState('all');
  const [heroRegion, setHeroRegion] = useState('all');

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('search', {
      search: heroSearch,
      transaction_type: heroTxn,
      property_type: heroType,
      region: heroRegion,
    });
  };

  const featuredProperties = properties.slice(0, 6);

  const categories = [
    {
      id: 'single_room',
      title: 'Rooms & Self-Contained',
      desc: 'Affordable single rooms, self-contained units & chamber halls',
      icon: Home,
      count: properties.filter((p) => p.property_type === 'single_room' || p.property_type === 'self_contained').length,
    },
    {
      id: 'apartment',
      title: 'Flats & Apartments',
      desc: 'Modern 1, 2, and 3-bedroom serviced apartments',
      icon: Building2,
      count: properties.filter((p) => p.property_type === 'apartment').length,
    },
    {
      id: 'house',
      title: 'Houses & Luxury Villas',
      desc: 'Executive gated homes, duplexes, villas & family residences',
      icon: Home,
      count: properties.filter((p) => p.property_type === 'house').length,
    },
    {
      id: 'store_shop',
      title: 'Stores & Shops',
      desc: 'High-traffic commercial retail stores & market stalls',
      icon: Store,
      count: properties.filter((p) => p.property_type === 'store_shop').length,
    },
    {
      id: 'office',
      title: 'Commercial Offices',
      desc: 'Executive suites, corporate offices & shared spaces',
      icon: Briefcase,
      count: properties.filter((p) => p.property_type === 'office').length,
    },
    {
      id: 'land',
      title: 'Lands & Plots',
      desc: 'Registered, litigation-free residential & commercial plots',
      icon: Layers,
      count: properties.filter(
        (p) => PROPERTY_TYPE_LABELS[p.property_type]?.category === 'land'
      ).length,
    },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* HERO SECTION */}
      <section className="relative bg-gradient-to-br from-[#2A0845] via-[#350B57] to-[#1A042B] text-white pt-16 pb-24 overflow-hidden border-b-4 border-[#D4AF37]">
        {/* Background Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#4A1474]/30 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-4 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{settings.company_name}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white">
              Discover Premier Properties Across <span className="text-[#D4AF37]">Ghana</span>
            </h1>

            <p className="text-sm sm:text-base text-purple-200/90 font-medium leading-relaxed">
              "{settings.motto}" — Verified rooms, luxury apartments, executive houses, commercial stores, offices, and titled lands for rent, sale, or lease.
            </p>
          </div>

          {/* Quick Search Widget */}
          <div className="mt-10 bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-[#D4AF37]/30 text-slate-800">
            <form onSubmit={handleHeroSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-4 relative">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Location or Keyword
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="City, area (e.g. Airport, East Legon)"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Transaction
                </label>
                <select
                  value={heroTxn}
                  onChange={(e) => setHeroTxn(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 font-semibold"
                >
                  <option value="all">All (Rent & Sale)</option>
                  <option value="RENT">For Rent</option>
                  <option value="SALE">For Sale</option>
                  <option value="LEASE">For Lease</option>
                </select>
              </div>

              <div className="lg:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Property Type
                </label>
                <select
                  value={heroType}
                  onChange={(e) => setHeroType(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 font-semibold"
                >
                  <option value="all">All Property Types</option>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2A0845] text-white font-extrabold text-xs tracking-wider uppercase hover:bg-[#3D105E] transition-all shadow-md shadow-purple-950/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Search Properties</span>
                  <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* CATEGORIES BROWSER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#2A0845] px-2 py-0.5 rounded-sm">
              Portfolio Categories
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2A0845] tracking-tight mt-1.5">
              Browse by Housing & Property Type
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any category to view available units in Ghana
            </p>
          </div>

          <button
            onClick={() => onNavigate('search')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2A0845] hover:text-[#3D105E] cursor-pointer"
          >
            <span>View All Properties</span>
            <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={() =>
                  onNavigate('search', {
                    category: cat.id === 'land' ? 'land' : undefined,
                    property_type: cat.id !== 'land' ? cat.id : undefined,
                  })
                }
                className="group p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#D4AF37] hover:shadow-lg transition-all duration-200 cursor-pointer flex items-start gap-4"
              >
                <div className="p-3 rounded-xl bg-purple-50 group-hover:bg-[#2A0845] text-[#2A0845] group-hover:text-[#D4AF37] transition-colors border border-purple-100 shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#2A0845] transition-colors">
                      {cat.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{cat.desc}</p>
                  <span className="text-[11px] font-semibold text-[#2A0845] inline-block pt-1">
                    Explore Listings &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FEATURED PROPERTIES SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#2A0845] px-2 py-0.5 rounded-sm">
              Featured Listings
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2A0845] tracking-tight mt-1.5">
              Available Properties & Residences
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified availability, detailed specifications, and online reservation locks
            </p>
          </div>

          <button
            onClick={() => onNavigate('search')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2A0845] hover:text-[#3D105E] cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block w-20 h-4 bg-slate-200 rounded animate-pulse" />
            ) : (
              <span>Explore All ({properties.length})</span>
            )}
            <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
          </button>
        </div>

        {isLoading ? (
          <PropertyListSkeleton count={3} />
        ) : featuredProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProperties.map((prop) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                currency={currency}
                isFavorited={favorites.includes(prop.id)}
                onToggleFavorite={onToggleFavorite}
                onSelect={onSelectProperty}
                onReserveClick={onOpenReservation}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-md mx-auto space-y-3">
            <Building2 className="w-12 h-12 text-[#D4AF37] mx-auto" />
            <h3 className="font-extrabold text-base text-[#2A0845]">Ready for Listings</h3>
            <p className="text-xs text-slate-500">
              The enterprise database is configured. The Company Owner can publish rooms, apartments, and lands via the Owner Admin Dashboard.
            </p>
            <button
              onClick={() => onNavigate('admin')}
              className="px-4 py-2 rounded-xl bg-[#2A0845] text-white text-xs font-bold hover:bg-[#3D105E] transition-colors"
            >
              Go to Owner Admin Dashboard
            </button>
          </div>
        )}
      </section>

      {/* WHY CHOOSE ADIBEX PRESTIGE */}
      <section className="bg-purple-50/50 py-16 border-y border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#2A0845] px-2 py-0.5 rounded-sm">
              Enterprise Excellence
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2A0845] tracking-tight">
              Why Transact with Adibex Prestige?
            </h2>
            <p className="text-xs text-slate-600">
              A trusted commercial real estate partner for local and international diaspora clients
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#2A0845] flex items-center justify-center border border-purple-100">
                <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h3 className="font-bold text-base text-slate-900">100% Verified Titles & Land Checks</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every listed property and land plot is physically inspected and verified against Lands Commission records to ensure zero litigation or encumbrance.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#2A0845] flex items-center justify-center border border-purple-100">
                <Clock className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Real-Time Double Booking Guard</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our PostgreSQL state lock ensures that once a client selects a room or unit, it is temporarily locked and cannot be reserved concurrently by another user.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#2A0845] flex items-center justify-center border border-purple-100">
                <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Online & Bank Direct Receipts</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seamlessly pay via Ghana Mobile Money (MTN / Telecel), international Visa/Mastercard, or verified direct GCB Bank transfer with official corporate receipts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#2A0845] px-2 py-0.5 rounded-sm">
            Simple 4-Step Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2A0845] tracking-tight">
            How to Secure Your Next Property
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Explore Listings',
              desc: 'Filter by price, category, bedrooms, region, and rental duration.',
            },
            {
              step: '02',
              title: 'Schedule a Tour',
              desc: 'Book an in-person viewing with an assigned Adibex Prestige field specialist.',
            },
            {
              step: '03',
              title: 'Lock Reservation',
              desc: 'Select your preferred unit or whole property to lock in real-time.',
            },
            {
              step: '04',
              title: 'Pay & Move In',
              desc: 'Submit online or bank transfer payment and download your official receipt.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3 relative"
            >
              <span className="text-2xl font-extrabold text-[#D4AF37] font-mono">{item.step}</span>
              <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#2A0845] to-[#3D105E] rounded-3xl p-8 sm:p-12 text-white shadow-2xl flex flex-wrap items-center justify-between gap-6 border border-[#D4AF37]/30">
          <div className="space-y-2 max-w-xl">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4AF37]">
              Adibex Prestige Hotline
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Need Direct Assistance or a Custom Property Search?
            </h3>
            <p className="text-xs text-purple-200 leading-relaxed">
              Our real estate team is ready to assist you in securing your dream apartment, family home, commercial office, or prime registered land.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] text-white font-bold text-xs hover:bg-[#20bd5a] transition-all shadow-md"
            >
              <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
              <span>WhatsApp Us Directly</span>
            </a>
            <a
              href={`tel:${settings.phone}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all"
            >
              <Phone className="w-4 h-4 text-[#D4AF37]" />
              <span>Call {settings.phone}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
