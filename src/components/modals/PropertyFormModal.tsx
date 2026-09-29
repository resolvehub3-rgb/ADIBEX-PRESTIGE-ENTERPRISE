import React, { useEffect, useState } from 'react';
import { X, Building2, Upload, Plus, Trash2, CheckCircle2, Layers, Sparkles, ImageIcon, Film } from 'lucide-react';
import {
  Property,
  PropertyType,
  PropertyCategory,
  TransactionType,
  CurrencyCode,
  RentalFrequency,
  GHANA_REGIONS,
  PROPERTY_TYPE_LABELS,
  COMMON_AMENITIES,
} from '../../types';
import {
  createProperty,
  updateProperty,
  uploadMediaFile,
  addPropertyMedia,
  deleteInvalidPropertyMedia,
} from '../../lib/db';
import { usableMedia, isVideoMedia, isAbsoluteHttpUrl } from '../../lib/media';

import { useAuth } from '../../context/AuthContext';

interface PropertyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyToEdit?: Property | null;
  onSuccess: () => void;
}

type SavedMediaRow = { url: string; media_type: 'IMAGE' | 'VIDEO' };

const toSavedRows = (media?: Property['media']): SavedMediaRow[] =>
  usableMedia(media).map((m) => ({
    url: m.url,
    media_type: isVideoMedia(m) ? 'VIDEO' : 'IMAGE',
  }));

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({
  isOpen,
  onClose,
  propertyToEdit,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const isEditing = !!propertyToEdit;

  // Form states
  const [title, setTitle] = useState(propertyToEdit?.title || '');
  const [propertyType, setPropertyType] = useState<PropertyType>(propertyToEdit?.property_type || 'apartment');
  const [category, setCategory] = useState<PropertyCategory>(
    propertyToEdit ? PROPERTY_TYPE_LABELS[propertyToEdit.property_type]?.category || 'residential' : 'residential'
  );
  const [transactionType, setTransactionType] = useState<TransactionType>(propertyToEdit?.transaction_type || 'RENT');
  const [price, setPrice] = useState(propertyToEdit?.price?.toString() || '');
  const [currency, setCurrency] = useState<CurrencyCode>(propertyToEdit?.currency || 'GHS');
  const [rentalFrequency, setRentalFrequency] = useState<RentalFrequency>(propertyToEdit?.rental_frequency || 'monthly');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [serviceCharge, setServiceCharge] = useState('');

  // Location
  const [region, setRegion] = useState(propertyToEdit?.region || 'Greater Accra');
  const [city, setCity] = useState(propertyToEdit?.city || 'Accra');
  const [area, setArea] = useState(propertyToEdit?.area || 'Airport Residential');
  const [address, setAddress] = useState(propertyToEdit?.address || '');

  // Specs
  const [bedrooms, setBedrooms] = useState(propertyToEdit?.bedrooms?.toString() || '2');
  const [bathrooms, setBathrooms] = useState(propertyToEdit?.bathrooms?.toString() || '2');
  const [floorArea, setFloorArea] = useState(propertyToEdit?.floor_area_sqm?.toString() || '');
  const [landSize, setLandSize] = useState(propertyToEdit?.land_size_sqm?.toString() || '');
  const [furnishing, setFurnishing] = useState<'unfurnished' | 'semi-furnished' | 'furnished'>(
    propertyToEdit?.furnished ? 'furnished' : 'unfurnished'
  );
  const [description, setDescription] = useState(propertyToEdit?.description || '');
  const [virtualTourUrl, setVirtualTourUrl] = useState(propertyToEdit?.virtual_tour_url || '');

  // Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(propertyToEdit?.amenities || []);

  // Multi-Units Builder
  const [units, setUnits] = useState<
    Array<{ unit_name: string; unit_type: string; floor_level: string; price: number; status: string }>
  >(
    propertyToEdit?.units?.map((u) => ({
      unit_name: u.unit_name,
      unit_type: propertyToEdit.property_type,
      floor_level: u.floor_level || '',
      price: u.price,
      status: u.status,
    })) || []
  );

  // New photo / video uploads
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [savedMedia, setSavedMedia] = useState<SavedMediaRow[]>(() => toSavedRows(propertyToEdit?.media));
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(propertyToEdit?.id || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Re-sync the dialog with its target property whenever it opens, so an
  // "Add Property" session never inherits (or updates) a previous listing.
  const resetForm = () => {
    setTitle(propertyToEdit?.title || '');
    setPropertyType(propertyToEdit?.property_type || 'apartment');
    setCategory(
      propertyToEdit
        ? PROPERTY_TYPE_LABELS[propertyToEdit.property_type]?.category || 'residential'
        : 'residential'
    );
    setTransactionType(propertyToEdit?.transaction_type || 'RENT');
    setPrice(propertyToEdit?.price?.toString() || '');
    setCurrency(propertyToEdit?.currency || 'GHS');
    setRentalFrequency(propertyToEdit?.rental_frequency || 'monthly');
    setSecurityDeposit('');
    setServiceCharge('');
    setRegion(propertyToEdit?.region || 'Greater Accra');
    setCity(propertyToEdit?.city || 'Accra');
    setArea(propertyToEdit?.area || 'Airport Residential');
    setAddress(propertyToEdit?.address || '');
    setBedrooms(propertyToEdit?.bedrooms?.toString() || '2');
    setBathrooms(propertyToEdit?.bathrooms?.toString() || '2');
    setFloorArea(propertyToEdit?.floor_area_sqm?.toString() || '');
    setLandSize(propertyToEdit?.land_size_sqm?.toString() || '');
    setFurnishing(propertyToEdit?.furnished ? 'furnished' : 'unfurnished');
    setDescription(propertyToEdit?.description || '');
    setVirtualTourUrl(propertyToEdit?.virtual_tour_url || '');
    setSelectedAmenities(propertyToEdit?.amenities || []);
    setUnits(
      propertyToEdit?.units?.map((u) => ({
        unit_name: u.unit_name,
        unit_type: propertyToEdit.property_type,
        floor_level: u.floor_level || '',
        price: u.price,
        status: u.status,
      })) || []
    );
    setSavedPropertyId(propertyToEdit?.id || null);
    setSavedMedia(toSavedRows(propertyToEdit?.media));
    setImageFiles([]);
    setVideoFiles([]);
    setError(null);
    setWarning(null);
    setLoading(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, propertyToEdit?.id]);

  if (!isOpen) return null;

  const handleToggleAmenity = (item: string) => {
    if (selectedAmenities.includes(item)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== item));
    } else {
      setSelectedAmenities([...selectedAmenities, item]);
    }
  };

  const handleAddUnit = () => {
    setUnits([
      ...units,
      {
        unit_name: `Unit ${units.length + 1}`,
        unit_type: propertyType,
        floor_level: 'Floor 1',
        price: Number(price) || 0,
        status: 'AVAILABLE',
      },
    ]);
  };

  const handleRemoveUnit = (index: number) => {
    setUnits(units.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setLoading(true);

    try {
      const tourUrl = virtualTourUrl.trim();
      if (tourUrl && !isAbsoluteHttpUrl(tourUrl)) {
        throw new Error('The 360° tour / video link must be a full URL, e.g. https://…');
      }

      const propertyData: Partial<Property> = {
        title: title.trim(),
        property_type: propertyType,
        transaction_type: transactionType,
        price: Number(price),
        currency,
        rental_frequency: transactionType === 'RENT' ? rentalFrequency : null,
        country: 'Ghana',
        region,
        city: city.trim(),
        area: area.trim() || null,
        address: address.trim() || null,
        bedrooms: Number(bedrooms) || 0,
        bathrooms: Number(bathrooms) || 0,
        toilets: Number(bathrooms) || 1,
        parking_spaces: 2,
        floor_area_sqm: floorArea ? Number(floorArea) : null,
        land_size_sqm: landSize ? Number(landSize) : null,
        furnished: furnishing !== 'unfurnished',
        description: description.trim(),
        amenities: selectedAmenities,
        property_rules: ['No smoking indoors', 'Quiet hours after 10 PM'],
        assigned_agent_id: profile?.id || null,
        status: propertyToEdit?.status || 'AVAILABLE',
        is_featured: false,
        is_verified: true,
        is_archived: false,
        // Only sent when there is a value to write (or an old one to clear), so a
        // database that hasn't run the virtual_tour_url migration yet is never
        // hit with an unknown column on a plain listing save.
        ...(tourUrl || propertyToEdit?.virtual_tour_url
          ? { virtual_tour_url: tourUrl || null }
          : {}),
      };

      const missingTourColumn = (msg?: string) => /virtual_tour_url/i.test(msg || '');
      const withoutTour = (data: Partial<Property>): Partial<Property> => {
        const { virtual_tour_url, ...rest } = data;
        return rest;
      };

      let tourSkipped = false;
      let propertyId = savedPropertyId || propertyToEdit?.id || null;

      if (propertyId) {
        let res = await updateProperty(propertyId, propertyData, profile?.id);
        if (!res.success && 'virtual_tour_url' in propertyData && missingTourColumn(res.error)) {
          const retry = await updateProperty(propertyId, withoutTour(propertyData), profile?.id);
          if (retry.success) {
            tourSkipped = true;
            res = retry;
          }
        }
        if (!res.success) throw new Error(res.error);
      } else {
        let res = await createProperty(propertyData, [], [], profile?.id);
        if (!res.success && 'virtual_tour_url' in propertyData && missingTourColumn(res.error)) {
          const retry = await createProperty(withoutTour(propertyData), [], [], profile?.id);
          if (retry.success) {
            tourSkipped = true;
            res = retry;
          }
        }
        if (!res.success || !res.data) throw new Error(res.error);
        propertyId = res.data.id;
        setSavedPropertyId(propertyId);
      }

      // Upload photos and videos if any selected
      const failedFiles: string[] = [];
      const mediaErrors: string[] = [];
      const uploadedRows: SavedMediaRow[] = [];

      if (propertyId) {
        const startingOrder = savedMedia.length;
        let order = startingOrder;

        for (const file of imageFiles) {
          const uploadRes = await uploadMediaFile(file, 'property-media');
          if (!uploadRes.url) {
            failedFiles.push(file.name);
            order += 1;
            continue;
          }

          const mediaRes = await addPropertyMedia({
            property_id: propertyId,
            url: uploadRes.url,
            is_primary: startingOrder === 0 && order === startingOrder,
            media_type: 'IMAGE',
            sort_order: order,
          });

          if (mediaRes.success) uploadedRows.push({ url: uploadRes.url, media_type: 'IMAGE' });
          else mediaErrors.push(mediaRes.error || 'unknown database error');
          order += 1;
        }

        for (const file of videoFiles) {
          const uploadRes = await uploadMediaFile(file, 'property-media');
          if (!uploadRes.url) {
            failedFiles.push(file.name);
            order += 1;
            continue;
          }

          // Videos are their own media type: never the card cover, never <img>.
          const mediaRes = await addPropertyMedia({
            property_id: propertyId,
            url: uploadRes.url,
            is_primary: false,
            media_type: 'VIDEO',
            caption: file.name,
            sort_order: order,
          });

          if (mediaRes.success) uploadedRows.push({ url: uploadRes.url, media_type: 'VIDEO' });
          else mediaErrors.push(mediaRes.error || 'unknown database error');
          order += 1;
        }

        // Self-heal: drop stale rows saved with an unloadable (blob:) URL
        await deleteInvalidPropertyMedia(propertyId);
      }

      if (mediaErrors.length > 0) {
        throw new Error(`Files uploaded, but could not be saved: ${mediaErrors[0]}`);
      }

      if (uploadedRows.length > 0) {
        setSavedMedia((prev) => [...prev, ...uploadedRows]);
      }

      onSuccess();

      if (failedFiles.length > 0) {
        // Listing is saved; keep the dialog open so the warning is visible and
        // the remaining files can be picked again safely (no duplicate listing).
        setImageFiles([]);
        setVideoFiles([]);
        setWarning(
          `${failedFiles.length} file(s) could not be uploaded (${failedFiles.join(
            ', '
          )}). Your listing was saved — select ${failedFiles.length === 1 ? 'it' : 'them'} again to retry.`
        );
        return;
      }

      if (tourSkipped) {
        setWarning(
          'Your listing was saved, but the 360° tour / video link was not stored: the properties.virtual_tour_url column is missing. Run the SQL schema once (Supabase SQL Editor → Database Connection & SQL → Copy Full SQL Schema), then re-save this field.'
        );
        return;
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save property listing');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-purple-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-[#2A0845] to-[#3D105E] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[#D4AF37] font-bold text-[10px] tracking-wider uppercase">
                Enterprise Listing Manager
              </span>
              <h3 className="font-bold text-lg text-white">
                {isEditing ? 'Edit Property Listing' : 'Publish New Property'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-slate-700 text-xs">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {error}
            </div>
          )}

          {warning && !error && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-medium">
              {warning}
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-[#2A0845] border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              1. Title & Classification
            </h4>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Property Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Luxury 3-Bedroom Executive Villa with Swimming Pool"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Property Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PropertyCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="land">Land</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Property Type *</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Type *</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0845]"
                >
                  <option value="RENT">For Rent</option>
                  <option value="SALE">For Sale</option>
                  <option value="LEASE">For Lease</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Terms */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-[#2A0845] border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              2. Financials & Pricing
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Listing Price *</label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="e.g. 5000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Currency *</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="GHS">GHS (GH₵ - Ghana Cedis)</option>
                  <option value="USD">USD ($ - US Dollars)</option>
                  <option value="GBP">GBP (£ - British Pounds)</option>
                  <option value="EUR">EUR (€ - Euros)</option>
                </select>
              </div>

              {transactionType === 'RENT' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rental Frequency</label>
                  <select
                    value={rentalFrequency}
                    onChange={(e) => setRentalFrequency(e.target.value as RentalFrequency)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="monthly">Per Month</option>
                    <option value="yearly">Per Year / Advance</option>
                    <option value="weekly">Per Week</option>
                    <option value="daily">Per Day / Short Stay</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Security Deposit</label>
                <input
                  type="number"
                  min={0}
                  placeholder="Optional deposit"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monthly Service Charge</label>
                <input
                  type="number"
                  min={0}
                  placeholder="Optional service fee"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Location (Ghana) */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-[#2A0845] border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              3. Location Details (Ghana)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Region *</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  {GHANA_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City / Town *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Accra, Kumasi, Takoradi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Neighborhood / Area</label>
                <input
                  type="text"
                  placeholder="e.g. East Legon, Cantonments"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Street Address or GhanaPost GPS</label>
              <input
                type="text"
                placeholder="e.g. GA-183-9022, 14 Kofi Annan St"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Section 4: Specifications */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-[#2A0845] border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              4. Physical Specifications & Furnishing
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  min={0}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  min={0}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Floor Area (m²)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 180"
                  value={floorArea}
                  onChange={(e) => setFloorArea(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Land Size (m²)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 500"
                  value={landSize}
                  onChange={(e) => setLandSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Furnishing Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(['unfurnished', 'semi-furnished', 'furnished'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFurnishing(f)}
                    className={`py-2 px-3 rounded-xl border text-center capitalize font-semibold transition-all ${
                      furnishing === f
                        ? 'bg-[#2A0845] text-white border-[#2A0845]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
              <textarea
                rows={3}
                required
                placeholder="Comprehensive description of the property, architectural finishes, neighborhood amenities..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Section 5: Amenities */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-[#2A0845] border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              5. Amenities & Features
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
              {COMMON_AMENITIES.map((item) => {
                const isSelected = selectedAmenities.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleToggleAmenity(item)}
                    className={`py-2 px-3 rounded-xl border text-left flex items-center justify-between text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-[#2A0845] bg-[#2A0845]/10 text-[#2A0845] font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="capitalize">{item.replace('_', ' ')}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 6: Photos, Videos & Media */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-[#2A0845] border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#D4AF37]" />
              6. Photos, Videos & Virtual Tour
            </h4>

            {savedMedia.length > 0 && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Media on this listing ({savedMedia.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {savedMedia.map((row, idx) => (
                    <div
                      key={`saved-${idx}`}
                      className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                    >
                      {row.media_type === 'VIDEO' ? (
                        <video
                          src={row.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLVideoElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <img
                          src={row.url}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      {row.media_type === 'VIDEO' && (
                        <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold uppercase">
                          <Film className="w-2.5 h-2.5" /> Video
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}



            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Upload Real Property Photos (Multi-select)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    setImageFiles(Array.from(e.target.files));
                  }
                }}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#2A0845] file:text-white hover:file:bg-[#3D105E]"
              />
              {imageFiles.length > 0 && (
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                  {imageFiles.length} photo(s) selected for upload.
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Upload Property Video Walkthrough (MP4 / WebM)
              </label>
              <input
                type="file"
                multiple
                accept="video/*"
                onChange={(e) => {
                  if (e.target.files) {
                    setVideoFiles(Array.from(e.target.files));
                  }
                }}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-purple-800"
              />
              {videoFiles.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {videoFiles.map((f, idx) => (
                    <li key={`video-${idx}`} className="text-[11px] text-purple-800 font-semibold flex items-center gap-1.5">
                      <Film className="w-3 h-3" />
                      {f.name} ({(f.size / 1_000_000).toFixed(1)} MB)
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                Saved videos play directly on the public listing page — no third-party link needed.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">360° Virtual Tour / Video URL</label>
              <input
                type="url"
                placeholder="https://my.matterport.com/show/?m=..."
                value={virtualTourUrl}
                onChange={(e) => setVirtualTourUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Optional. YouTube, Vimeo and Matterport links are embedded on the listing page.
              </p>
            </div>
          </div>
        </form>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-[#2A0845] text-white font-bold text-xs hover:bg-[#3D105E] transition-all shadow-md shadow-purple-950/15 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Saving Listing...' : isEditing ? 'Update Property' : 'Publish Property to Marketplace'}
          </button>
        </div>
      </div>
    </div>
  );
};
