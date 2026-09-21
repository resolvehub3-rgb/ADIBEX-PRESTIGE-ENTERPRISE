import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Building,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Layers,
  Check,
} from 'lucide-react';
import {
  Property,
  PropertyType,
  PropertyCategory,
  TransactionType,
  CurrencyCode,
  GHANA_REGIONS,
  PROPERTY_TYPE_LABELS,
} from '../../types';
import { PropertyCard } from '../common/PropertyCard';
import { PropertyListSkeleton } from '../common/Skeletons';

interface SearchFilterViewProps {
  properties: Property[];
  currency: CurrencyCode;
  initialFilters?: {
    transaction_type?: string;
    category?: string;
    property_type?: string;
  };
  onSelectProperty: (property: Property) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onOpenReservation?: (property: Property) => void;
  isLoading?: boolean;
}

export const SearchFilterView: React.FC<SearchFilterViewProps> = ({
  properties,
  currency,
  initialFilters = {},
  onSelectProperty,
  favorites,
  onToggleFavorite,
  onOpenReservation,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionType, setTransactionType] = useState<string>(initialFilters.transaction_type || 'all');
  const [category, setCategory] = useState<string>(initialFilters.category || 'all');
  const [propertyType, setPropertyType] = useState<string>(initialFilters.property_type || 'all');
  const [region, setRegion] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [bedrooms, setBedrooms] = useState<string>('all');
  const [bathrooms, setBathrooms] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filter logic
  const filteredProperties = useMemo(() => {
    return properties
      .filter((p) => {
        // Keyword
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(query);
          const matchCity = p.city.toLowerCase().includes(query);
          const matchArea = p.area?.toLowerCase().includes(query);
          const matchRef = p.reference_no.toLowerCase().includes(query);
          if (!matchTitle && !matchCity && !matchArea && !matchRef) return false;
        }

        // Transaction Type
        if (transactionType !== 'all' && p.transaction_type !== transactionType) {
          return false;
        }

        // Category
        if (category !== 'all' && PROPERTY_TYPE_LABELS[p.property_type]?.category !== category) {
          return false;
        }

        // Property Type
        if (propertyType !== 'all' && p.property_type !== propertyType) {
          return false;
        }

        // Region
        if (region !== 'all' && p.region !== region) {
          return false;
        }

        // Status
        if (status !== 'all' && p.status !== status) {
          return false;
        }

        // Price
        if (minPrice && p.price < Number(minPrice)) return false;
        if (maxPrice && p.price > Number(maxPrice)) return false;

        // Bedrooms
        if (bedrooms !== 'all') {
          if (bedrooms === '4+' && p.bedrooms < 4) return false;
          if (bedrooms !== '4+' && p.bedrooms !== Number(bedrooms)) return false;
        }

        // Bathrooms
        if (bathrooms !== 'all') {
          if (bathrooms === '3+' && p.bathrooms < 3) return false;
          if (bathrooms !== '3+' && p.bathrooms !== Number(bathrooms)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [
    properties,
    searchTerm,
    transactionType,
    category,
    propertyType,
    region,
    status,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setTransactionType('all');
    setCategory('all');
    setPropertyType('all');
    setRegion('all');
    setMinPrice('');
    setMaxPrice('');
    setBedrooms('all');
    setBathrooms('all');
    setStatus('all');
    setSortBy('newest');
  };

  return (
    <div className="bg-slate-50/60 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Search Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest bg-[#2A0845] px-2 py-0.5 rounded-sm">
                Marketplace
              </span>
              <span className="text-xs text-slate-400">Ghana & Worldwide Access</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0845] tracking-tight">
              Explore Available Properties
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Rooms, apartments, houses, stores, offices, commercial complexes, and prime lands.
            </p>
          </div>

          {/* Search Inputs Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Keyword Input */}
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search city, area, ref #, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
              />
            </div>

            {/* Transaction Type */}
            <div className="md:col-span-2">
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full py-3 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845] text-slate-700 font-medium"
              >
                <option value="all">All Transactions</option>
                <option value="RENT">For Rent</option>
                <option value="SALE">For Sale</option>
                <option value="LEASE">For Lease</option>
              </select>
            </div>

            {/* Property Type */}
            <div className="md:col-span-3">
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full py-3 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845] text-slate-700 font-medium"
              >
                <option value="all">All Property Types</option>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Region */}
            <div className="md:col-span-3">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full py-3 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845] text-slate-700 font-medium"
              >
                <option value="all">All Ghana Regions</option>
                {GHANA_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Toggles & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="inline-flex items-center gap-1.5 font-semibold text-[#2A0845] hover:text-[#3D105E] cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
              <span>{showAdvancedFilters ? 'Hide Advanced Filters' : 'More Filters (Bedrooms, Price, Status)'}</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="py-1 px-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Advanced Filters Expandable Drawer */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bedrooms</label>
                <select
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="all">Any</option>
                  <option value="1">1 Bedroom</option>
                  <option value="2">2 Bedrooms</option>
                  <option value="3">3 Bedrooms</option>
                  <option value="4+">4+ Bedrooms</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bathrooms</label>
                <select
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="all">Any</option>
                  <option value="1">1 Bathroom</option>
                  <option value="2">2 Bathrooms</option>
                  <option value="3+">3+ Bathrooms</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="AVAILABLE">Available Only</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="RENTED">Rented</option>
                  <option value="SOLD">Sold</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="all">All Categories</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="land">Land</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-2 min-h-[20px]">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse" />
            </div>
          ) : (
            <span>
              Found <strong className="text-[#2A0845] font-bold">{filteredProperties.length}</strong> matching{' '}
              {filteredProperties.length === 1 ? 'property' : 'properties'}
            </span>
          )}
        </div>

        {/* Property Grid, Skeleton, or Empty State */}
        {isLoading ? (
          <PropertyListSkeleton count={6} />
        ) : filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((prop) => (
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
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#2A0845] border border-purple-200 flex items-center justify-center mx-auto shadow-xs">
              <Building className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h3 className="text-lg font-extrabold text-[#2A0845]">No Properties Found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {properties.length === 0
                ? 'The database currently has no published property records. The Company Owner or designated Agents can publish new rooms, apartments, commercial properties, or lands directly from the Owner Admin Dashboard.'
                : 'No properties matched your current filter criteria. Try adjusting your search keywords, region, or price filters.'}
            </p>
            {properties.length > 0 && (
              <button
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-xl bg-[#2A0845] text-white font-semibold text-xs hover:bg-[#3D105E] transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
