import { getSupabase } from './supabase';
import {
  Property,
  PropertyUnit,
  PropertyMedia,
  Reservation,
  Payment,
  ViewingAppointment,
  PropertyInquiry,
  CompanySettings,
  NotificationItem,
  AuditLog,
  SearchFilters,
  CurrencyCode,
  ReservationStatus,
  ViewingStatus,
  PropertyStatus,
  UnitStatus,
  UserProfile,
  UserRole,
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
} from '../types';

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  company_name: 'ADIBEX PRESTIGE ENTERPRISE',
  brand_name: 'ADIBEX PRESTIGE PROPERTIES',
  motto: 'Your Vision Our Mission',
  phone: '+233 24 456 7890',
  whatsapp: '+233 24 456 7890',
  email: 'info@adibexprestige.com',
  website: 'https://adibexprestige.com',
  address: 'Airport Residential Area, Liberation Road, Accra, Ghana',
  logo_url: null,
  bank_name: 'GCB Bank Ghana Ltd',
  bank_account_name: 'ADIBEX PRESTIGE ENTERPRISE',
  bank_account_number: '1011123456789',
  bank_branch: 'Accra High Street Branch',
  momo_number: '+233 24 456 7890',
  momo_network: 'MTN Mobile Money',
  momo_account_name: 'ADIBEX PRESTIGE ENTERPRISE',
  payment_instructions:
    'For direct bank transfer or Mobile Money, include your unique Reservation Reference as the transaction reference. Upload a clear screenshot/receipt of payment proof for verification.',
  reservation_expiry_minutes: 15,
  default_currency: 'GHS',
  supported_currencies: ['GHS', 'USD', 'GBP', 'EUR'],
  cancellation_policy:
    'Cancellations made 48 hours prior to scheduled start date receive a 90% refund. Direct bank deposits are refunded after company review within 3-5 business days.',
  viewing_policy:
    'All physical property viewings must be scheduled at least 24 hours in advance. A designated Adibex Prestige agent will accompany you.',
};

// Currency Converter Helper
export function convertCurrency(
  amount: number,
  from: CurrencyCode = 'GHS',
  to: CurrencyCode = 'GHS'
): number {
  if (from === to) return amount;
  // Convert from origin to GHS first
  const amountInGHS = from === 'GHS' ? amount : amount / EXCHANGE_RATES[from];
  // Convert from GHS to target
  return to === 'GHS' ? amountInGHS : amountInGHS * EXCHANGE_RATES[to];
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'GHS',
  convertFrom?: CurrencyCode
): string {
  const finalAmount = convertFrom ? convertCurrency(amount, convertFrom, currency) : amount;
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol} ${Number(finalAmount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// ------------------------------------------------------------------------
// COMPANY SETTINGS
// ------------------------------------------------------------------------
export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_COMPANY_SETTINGS;
    }
    return data as CompanySettings;
  } catch (err) {
    return DEFAULT_COMPANY_SETTINGS;
  }
}

export async function updateCompanySettings(
  settings: Partial<CompanySettings>,
  userId?: string
): Promise<{ success: boolean; data?: CompanySettings; error?: string }> {
  try {
    const supabase = getSupabase();
    const { data: existing } = await supabase.from('company_settings').select('id').limit(1).maybeSingle();

    let result;
    if (existing?.id) {
      result = await supabase
        .from('company_settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase.from('company_settings').insert([settings]).select().single();
    }

    if (result.error) throw result.error;

    if (userId) {
      await logAuditAction(userId, null, 'company_owner_admin', 'UPDATE_SETTINGS', 'company_settings', result.data.id, settings);
    }

    return { success: true, data: result.data as CompanySettings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------
// PROPERTIES
// ------------------------------------------------------------------------
export async function getProperties(
  filters: SearchFilters = {},
  page = 1,
  pageSize = 12
): Promise<{ properties: Property[]; total: number; error?: string }> {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('properties')
      .select('*, units:property_units(*), media:property_media(*), agent:profiles!properties_assigned_agent_id_fkey(*)', { count: 'exact' })
      .eq('is_archived', false);

    // If query from public, filter published/available
    if (filters.is_featured) {
      query = query.eq('is_featured', true);
    }

    if (filters.transaction_type && filters.transaction_type !== 'all') {
      query = query.eq('transaction_type', filters.transaction_type);
    }

    if (filters.property_type && filters.property_type !== 'all') {
      query = query.eq('property_type', filters.property_type);
    }

    if (filters.region) {
      query = query.ilike('region', `%${filters.region}%`);
    }

    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    if (filters.query) {
      query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%,city.ilike.%${filters.query}%,region.ilike.%${filters.query}%,reference_no.ilike.%${filters.query}%`);
    }

    if (filters.min_price !== undefined && filters.min_price > 0) {
      query = query.gte('price', filters.min_price);
    }

    if (filters.max_price !== undefined && filters.max_price > 0) {
      query = query.lte('price', filters.max_price);
    }

    if (filters.bedrooms && filters.bedrooms !== 'any') {
      query = query.gte('bedrooms', Number(filters.bedrooms));
    }

    if (filters.bathrooms && filters.bathrooms !== 'any') {
      query = query.gte('bathrooms', Number(filters.bathrooms));
    }

    if (filters.furnished !== undefined && filters.furnished !== null) {
      query = query.eq('furnished', filters.furnished);
    }

    // Sort order
    if (filters.sortBy === 'price_asc') {
      query = query.order('price', { ascending: true });
    } else if (filters.sortBy === 'price_desc') {
      query = query.order('price', { ascending: false });
    } else if (filters.sortBy === 'featured') {
      query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    return { properties: (data as Property[]) || [], total: count || 0 };
  } catch (err: any) {
    return { properties: [], total: 0, error: err.message };
  }
}

export async function getAllPropertiesForAdmin(): Promise<Property[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('properties')
      .select('*, units:property_units(*), media:property_media(*), agent:profiles!properties_assigned_agent_id_fkey(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Property[]) || [];
  } catch (err) {
    return [];
  }
}

export async function getPropertyByIdOrSlug(idOrSlug: string): Promise<Property | null> {
  try {
    const supabase = getSupabase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let query = supabase
      .from('properties')
      .select('*, units:property_units(*), media:property_media(*), agent:profiles!properties_assigned_agent_id_fkey(*)');

    if (isUuid) {
      query = query.eq('id', idOrSlug);
    } else {
      query = query.eq('slug', idOrSlug);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return data as Property;
  } catch (err) {
    return null;
  }
}

export function generatePropertyReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'ADX-';
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createProperty(
  propertyData: Partial<Property>,
  unitsData: Partial<PropertyUnit>[] = [],
  mediaData: Partial<PropertyMedia>[] = [],
  userId?: string
): Promise<{ success: boolean; data?: Property; error?: string }> {
  try {
    const supabase = getSupabase();
    const referenceNo = propertyData.reference_no || generatePropertyReference();
    const slugBase = slugify(propertyData.title || 'property');
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    const { data: property, error: propError } = await supabase
      .from('properties')
      .insert([
        {
          ...propertyData,
          reference_no: referenceNo,
          slug,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (propError) throw propError;

    // Insert units if any
    if (unitsData.length > 0) {
      const unitsToInsert = unitsData.map((u) => ({
        ...u,
        property_id: property.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('property_units').insert(unitsToInsert);
    }

    // Insert media records if any
    if (mediaData.length > 0) {
      const mediaToInsert = mediaData.map((m, idx) => ({
        ...m,
        property_id: property.id,
        sort_order: m.sort_order ?? idx,
        is_primary: m.is_primary ?? idx === 0,
        created_at: new Date().toISOString(),
      }));
      await supabase.from('property_media').insert(mediaToInsert);
    }

    if (userId) {
      await logAuditAction(userId, null, 'company_owner_admin', 'CREATE_PROPERTY', 'property', property.id, {
        title: property.title,
        reference_no: referenceNo,
      });
    }

    return { success: true, data: property as Property };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProperty(
  id: string,
  updates: Partial<Property>,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('properties')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    if (userId) {
      await logAuditAction(userId, null, 'company_owner_admin', 'UPDATE_PROPERTY', 'property', id, updates);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function archiveProperty(
  id: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('properties')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    if (userId) {
      await logAuditAction(userId, null, 'company_owner_admin', 'ARCHIVE_PROPERTY', 'property', id);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------
// PROPERTY UNITS
// ------------------------------------------------------------------------
export async function getPropertyUnits(propertyId: string): Promise<PropertyUnit[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('property_units')
      .select('*')
      .eq('property_id', propertyId)
      .order('unit_number', { ascending: true });

    if (error) throw error;
    return (data as PropertyUnit[]) || [];
  } catch (err) {
    return [];
  }
}

export async function updateUnitStatus(
  unitId: string,
  status: UnitStatus,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('property_units')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', unitId);

    if (error) throw error;

    if (userId) {
      await logAuditAction(userId, null, 'staff', 'UPDATE_UNIT_STATUS', 'property_unit', unitId, { status });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createPropertyUnit(
  unitData: Partial<PropertyUnit>
): Promise<{ success: boolean; data?: PropertyUnit; error?: string }> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('property_units')
      .insert([{ ...unitData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as PropertyUnit };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePropertyUnit(unitId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('property_units').delete().eq('id', unitId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------
// MEDIA (Supabase Storage & Records)
// ------------------------------------------------------------------------
export async function uploadMediaFile(
  file: File,
  bucket: 'property-media' | 'payment-proofs' = 'property-media'
): Promise<{ url: string | null; error?: string }> {
  try {
    const supabase = getSupabase();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

    if (uploadError) {
      // Fallback: create base64 object URL so client preview never blocks
      const localUrl = URL.createObjectURL(file);
      return { url: localUrl, error: uploadError.message };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return { url: data.publicUrl };
  } catch (err: any) {
    return { url: null, error: err.message };
  }
}

export async function addPropertyMedia(
  mediaData: Partial<PropertyMedia>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('property_media').insert([mediaData]);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePropertyMedia(mediaId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('property_media').delete().eq('id', mediaId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------
// RESERVATION & DOUBLE-BOOKING PREVENTION
// ------------------------------------------------------------------------
export function generateReservationReference(): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let ref = 'RES-';
  for (let i = 0; i < 7; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

export async function checkUnitAvailability(
  propertyId: string,
  unitId?: string | null
): Promise<{ isAvailable: boolean; reason?: string }> {
  try {
    const supabase = getSupabase();

    if (unitId) {
      // Check unit status
      const { data: unit, error: unitErr } = await supabase
        .from('property_units')
        .select('status, unit_name')
        .eq('id', unitId)
        .single();

      if (unitErr || !unit) {
        return { isAvailable: false, reason: 'Unit not found' };
      }

      if (unit.status !== 'AVAILABLE') {
        return { isAvailable: false, reason: `This unit is currently ${unit.status}.` };
      }

      // Check active unexpired reservations
      const now = new Date().toISOString();
      const { data: activeRes, error: resErr } = await supabase
        .from('reservations')
        .select('id, reference_no, status, expires_at')
        .eq('unit_id', unitId)
        .in('status', ['PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'CONFIRMED'])
        .gt('expires_at', now);

      if (!resErr && activeRes && activeRes.length > 0) {
        return {
          isAvailable: false,
          reason: 'This unit is currently locked by an active reservation. Please try again later or choose another unit.',
        };
      }
    } else {
      // Check whole property
      const { data: prop, error: propErr } = await supabase
        .from('properties')
        .select('status, is_archived')
        .eq('id', propertyId)
        .single();

      if (propErr || !prop || prop.is_archived || prop.status !== 'AVAILABLE') {
        return { isAvailable: false, reason: 'This property is not currently available for reservation.' };
      }
    }

    return { isAvailable: true };
  } catch (err: any) {
    return { isAvailable: false, reason: err.message };
  }
}

export async function createReservation(
  reservationData: {
    property_id: string;
    unit_id?: string | null;
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    total_amount: number;
    currency: CurrencyCode;
    start_date?: string | null;
    end_date?: string | null;
    notes?: string | null;
    expiry_minutes?: number;
  }
): Promise<{ success: boolean; data?: Reservation; error?: string }> {
  try {
    const supabase = getSupabase();

    // 1. Concurrency double-booking check
    const availability = await checkUnitAvailability(reservationData.property_id, reservationData.unit_id);
    if (!availability.isAvailable) {
      return { success: false, error: availability.reason || 'Unit is no longer available.' };
    }

    const referenceNo = generateReservationReference();
    const expiryMins = reservationData.expiry_minutes || 15;
    const expiresAt = new Date(Date.now() + expiryMins * 60 * 1000).toISOString();

    // 2. Insert reservation
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .insert([
        {
          reference_no: referenceNo,
          property_id: reservationData.property_id,
          unit_id: reservationData.unit_id || null,
          customer_id: reservationData.customer_id,
          customer_name: reservationData.customer_name,
          customer_email: reservationData.customer_email,
          customer_phone: reservationData.customer_phone,
          total_amount: reservationData.total_amount,
          currency: reservationData.currency,
          start_date: reservationData.start_date || null,
          end_date: reservationData.end_date || null,
          status: 'PENDING_PAYMENT',
          expires_at: expiresAt,
          notes: reservationData.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*, property:properties(*), unit:property_units(*)')
      .single();

    if (resError) throw resError;

    // 3. Mark unit status as RESERVED
    if (reservationData.unit_id) {
      await supabase
        .from('property_units')
        .update({ status: 'RESERVED', updated_at: new Date().toISOString() })
        .eq('id', reservationData.unit_id);
    } else {
      await supabase
        .from('properties')
        .update({ status: 'RESERVED', updated_at: new Date().toISOString() })
        .eq('id', reservationData.property_id);
    }

    // 4. Audit Log
    await logAuditAction(
      reservationData.customer_id,
      reservationData.customer_email,
      'customer',
      'CREATE_RESERVATION',
      'reservation',
      reservation.id,
      { reference_no: referenceNo, total_amount: reservationData.total_amount }
    );

    // 5. In-app notification for customer
    await createNotification(
      reservationData.customer_id,
      'Reservation Created',
      `Your reservation ${referenceNo} has been created. Complete payment within ${expiryMins} minutes to confirm.`,
      'reservation',
      `/portal/reservations`
    );

    return { success: true, data: reservation as Reservation };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getCustomerReservations(customerId: string): Promise<Reservation[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('reservations')
      .select('*, property:properties(*), unit:property_units(*), payments(*)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Reservation[]) || [];
  } catch (err) {
    return [];
  }
}

export async function getAllReservations(statusFilter?: ReservationStatus | 'all'): Promise<Reservation[]> {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('reservations')
      .select('*, property:properties(*), unit:property_units(*), payments(*)')
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Reservation[]) || [];
  } catch (err) {
    return [];
  }
}

export async function cancelReservation(
  reservationId: string,
  unitId?: string | null,
  propertyId?: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', reservationId);

    if (error) throw error;

    // Release unit
    if (unitId) {
      await supabase.from('property_units').update({ status: 'AVAILABLE' }).eq('id', unitId);
    } else if (propertyId) {
      await supabase.from('properties').update({ status: 'AVAILABLE' }).eq('id', propertyId);
    }

    if (userId) {
      await logAuditAction(userId, null, 'user', 'CANCEL_RESERVATION', 'reservation', reservationId);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------
// PAYMENTS & BANK VERIFICATION
// ------------------------------------------------------------------------
export function generateTransactionReference(): string {
  const chars = '0123456789ABCDEF';
  let ref = 'TXN-';
  for (let i = 0; i < 10; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

export async function submitPayment(
  paymentData: {
    reservation_id: string;
    customer_id: string;
    amount: number;
    currency: CurrencyCode;
    payment_method: 'PAYSTACK_CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
    payment_proof_url?: string | null;
    bank_transaction_id?: string | null;
  }
): Promise<{ success: boolean; data?: Payment; error?: string }> {
  try {
    const supabase = getSupabase();
    const transactionRef = generateTransactionReference();
    const isManualBank = paymentData.payment_method === 'BANK_TRANSFER' || paymentData.payment_proof_url;
    const initialStatus = isManualBank ? 'VERIFYING' : 'SUCCESSFUL';

    const { data: payment, error } = await supabase
      .from('payments')
      .insert([
        {
          transaction_ref: transactionRef,
          reservation_id: paymentData.reservation_id,
          customer_id: paymentData.customer_id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          payment_method: paymentData.payment_method,
          status: initialStatus,
          payment_proof_url: paymentData.payment_proof_url || null,
          bank_transaction_id: paymentData.bank_transaction_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*, reservation:reservations(*)')
      .single();

    if (error) throw error;

    // If online direct card/momo successful, auto-confirm reservation
    if (initialStatus === 'SUCCESSFUL') {
      await supabase
        .from('reservations')
        .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
        .eq('id', paymentData.reservation_id);

      await createNotification(
        paymentData.customer_id,
        'Payment Successful & Reservation Confirmed',
        `Your payment of ${paymentData.currency} ${paymentData.amount} (Ref: ${transactionRef}) was successful. Your reservation is confirmed!`,
        'payment',
        `/portal/reservations`
      );
    } else {
      // Manual bank transfer awaiting owner verification
      await supabase
        .from('reservations')
        .update({ status: 'PAYMENT_PROCESSING', updated_at: new Date().toISOString() })
        .eq('id', paymentData.reservation_id);

      await createNotification(
        paymentData.customer_id,
        'Payment Proof Submitted',
        `Your payment proof (Ref: ${transactionRef}) is under review by our accounting department.`,
        'payment',
        `/portal/reservations`
      );
    }

    await logAuditAction(
      paymentData.customer_id,
      null,
      'customer',
      'SUBMIT_PAYMENT',
      'payment',
      payment.id,
      {
        transaction_ref: transactionRef,
        amount: paymentData.amount,
        status: initialStatus,
      }
    );

    return { success: true, data: payment as Payment };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function verifyBankPayment(
  paymentId: string,
  reservationId: string,
  isApproved: boolean,
  verifiedByUserId: string,
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const newPaymentStatus = isApproved ? 'SUCCESSFUL' : 'FAILED';
    const newReservationStatus = isApproved ? 'CONFIRMED' : 'REJECTED';

    // 1. Update payment record
    const { data: payment, error: pError } = await supabase
      .from('payments')
      .update({
        status: newPaymentStatus,
        verified_by: verifiedByUserId,
        verified_at: new Date().toISOString(),
        rejection_reason: rejectionReason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select('*, customer_id')
      .single();

    if (pError) throw pError;

    // 2. Update reservation
    const { data: res, error: rError } = await supabase
      .from('reservations')
      .update({
        status: newReservationStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId)
      .select('unit_id, property_id')
      .single();

    if (rError) throw rError;

    // 3. If rejected, release the unit
    if (!isApproved) {
      if (res?.unit_id) {
        await supabase.from('property_units').update({ status: 'AVAILABLE' }).eq('id', res.unit_id);
      } else if (res?.property_id) {
        await supabase.from('properties').update({ status: 'AVAILABLE' }).eq('id', res.property_id);
      }
    }

    // 4. Notify customer
    if (payment?.customer_id) {
      await createNotification(
        payment.customer_id,
        isApproved ? 'Payment Verified & Reservation Confirmed' : 'Payment Verification Rejected',
        isApproved
          ? 'Your bank transfer was verified by our finance team! Your reservation is confirmed.'
          : `Your payment could not be verified: ${rejectionReason || 'Invalid proof'}.`,
        'payment',
        '/portal/reservations'
      );
    }

    // 5. Audit Log
    await logAuditAction(
      verifiedByUserId,
      null,
      'company_owner_admin',
      isApproved ? 'APPROVE_BANK_PAYMENT' : 'REJECT_BANK_PAYMENT',
      'payment',
      paymentId,
      { isApproved, rejectionReason }
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getCustomerPayments(customerId: string): Promise<Payment[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('payments')
      .select('*, reservation:reservations(*, property:properties(*), unit:property_units(*))')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Payment[]) || [];
  } catch (err) {
    return [];
  }
}

export async function getAllPayments(): Promise<Payment[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('payments')
      .select('*, reservation:reservations(*, property:properties(*), unit:property_units(*))')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Payment[]) || [];
  } catch (err) {
    return [];
  }
}

// ------------------------------------------------------------------------
// VIEWING APPOINTMENTS
// ------------------------------------------------------------------------
export async function createViewingAppointment(
  appointment: Partial<ViewingAppointment>
): Promise<{ success: boolean; data?: ViewingAppointment; error?: string }> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('viewing_appointments')
      .insert([
        {
          ...appointment,
          status: 'REQUESTED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*, property:properties(*)')
      .single();

    if (error) throw error;

    if (appointment.customer_id) {
      await createNotification(
        appointment.customer_id,
        'Viewing Request Submitted',
        `Your viewing request for ${appointment.preferred_date} has been received. Our team will confirm shortly.`,
        'viewing',
        '/portal/viewings'
      );
    }

    return { success: true, data: data as ViewingAppointment };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getCustomerViewings(customerId: string): Promise<ViewingAppointment[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('viewing_appointments')
      .select('*, property:properties(*), agent:profiles!viewing_appointments_assigned_agent_id_fkey(*)')
      .eq('customer_id', customerId)
      .order('preferred_date', { ascending: true });

    if (error) throw error;
    return (data as ViewingAppointment[]) || [];
  } catch (err) {
    return [];
  }
}

export async function getAllViewings(): Promise<ViewingAppointment[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('viewing_appointments')
      .select('*, property:properties(*), agent:profiles!viewing_appointments_assigned_agent_id_fkey(*)')
      .order('preferred_date', { ascending: true });

    if (error) throw error;
    return (data as ViewingAppointment[]) || [];
  } catch (err) {
    return [];
  }
}

export async function updateViewingStatus(
  viewingId: string,
  status: ViewingStatus,
  adminNotes?: string,
  assignedAgentId?: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (adminNotes !== undefined) updates.admin_notes = adminNotes;
    if (assignedAgentId !== undefined) updates.assigned_agent_id = assignedAgentId;

    const { data, error } = await supabase
      .from('viewing_appointments')
      .update(updates)
      .eq('id', viewingId)
      .select('customer_id, preferred_date, status')
      .single();

    if (error) throw error;

    if (data?.customer_id) {
      await createNotification(
        data.customer_id,
        `Viewing Appointment ${status}`,
        `Your viewing appointment for ${data.preferred_date} has been marked as ${status}.`,
        'viewing',
        '/portal/viewings'
      );
    }

    if (userId) {
      await logAuditAction(userId, null, 'staff', 'UPDATE_VIEWING_STATUS', 'viewing_appointment', viewingId, { status, adminNotes });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------
// INQUIRIES
// ------------------------------------------------------------------------
export async function createPropertyInquiry(
  inquiry: Partial<PropertyInquiry>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('property_inquiries').insert([
      {
        ...inquiry,
        status: 'NEW',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getAllInquiries(): Promise<PropertyInquiry[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('property_inquiries')
      .select('*, property:properties(title, reference_no)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as PropertyInquiry[]) || [];
  } catch (err) {
    return [];
  }
}

export async function updateInquiryStatus(
  inquiryId: string,
  status: 'NEW' | 'CONTACTED' | 'CLOSED'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('property_inquiries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', inquiryId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------
// FAVORITES
// ------------------------------------------------------------------------
export async function getUserFavorites(userId: string): Promise<string[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('property_favorites')
      .select('property_id')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map((d) => d.property_id);
  } catch (err) {
    return [];
  }
}

export async function toggleFavorite(
  userId: string,
  propertyId: string
): Promise<{ isFavorited: boolean }> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('property_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .maybeSingle();

    if (data?.id) {
      await supabase.from('property_favorites').delete().eq('id', data.id);
      return { isFavorited: false };
    } else {
      await supabase.from('property_favorites').insert([{ user_id: userId, property_id: propertyId }]);
      return { isFavorited: true };
    }
  } catch (err) {
    return { isFavorited: false };
  }
}

// ------------------------------------------------------------------------
// NOTIFICATIONS
// ------------------------------------------------------------------------
export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) throw error;
    return (data as NotificationItem[]) || [];
  } catch (err) {
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  } catch (err) {
    // Ignore
  }
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  link?: string
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('notifications').insert([
      {
        user_id: userId,
        title,
        message,
        type,
        link: link || null,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    // Ignore
  }
}

// ------------------------------------------------------------------------
// AUDIT LOGS
// ------------------------------------------------------------------------
export async function logAuditAction(
  userId: string | null,
  userEmail: string | null,
  userRole: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: any
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('audit_logs').insert([
      {
        user_id: userId,
        user_email: userEmail,
        user_role: userRole,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || null,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    // Non-blocking
  }
}

export async function getAuditLogs(limit = 60): Promise<AuditLog[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as AuditLog[]) || [];
  } catch (err) {
    return [];
  }
}

// ------------------------------------------------------------------------
// USER & STAFF MANAGEMENT (NO SUPER ADMIN)
// ------------------------------------------------------------------------
export async function getStaffMembers(): Promise<UserProfile[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['company_owner_admin', 'agent'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as UserProfile[]) || [];
  } catch (err) {
    return [];
  }
}

export async function getAllCustomersList(): Promise<UserProfile[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as UserProfile[]) || [];
  } catch (err) {
    return [];
  }
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    await logAuditAction(adminUserId, null, 'company_owner_admin', 'UPDATE_USER_ROLE', 'profile', userId, { newRole: role });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------
// CONVENIENCE ALIASES & STATUS UPDATERS
// ------------------------------------------------------------------------
export const fetchProperties = getAllPropertiesForAdmin;
export const fetchCompanySettings = getCompanySettings;
export const fetchAllReservations = getAllReservations;
export const fetchAllPayments = getAllPayments;
export const fetchAllViewings = getAllViewings;
export const fetchUserReservations = getCustomerReservations;
export const fetchUserPayments = getCustomerPayments;
export const fetchUserViewings = getCustomerViewings;
export const fetchAuditLogs = getAuditLogs;
export const fetchStaffProfiles = getStaffMembers;
export const deleteProperty = archiveProperty;

export async function updatePropertyStatus(
  propertyId: string,
  status: PropertyStatus,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('properties')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', propertyId);

    if (error) throw error;
    if (userId) {
      await logAuditAction(userId, null, 'staff', 'UPDATE_PROPERTY_STATUS', 'property', propertyId, { status });
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updatePaymentStatus(
  paymentId: string,
  status: 'SUCCESSFUL' | 'FAILED' | 'VERIFIED' | 'REJECTED' | 'PENDING',
  userId?: string,
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const isApproved = status === 'SUCCESSFUL' || status === 'VERIFIED';
    const dbPaymentStatus = isApproved ? 'SUCCESSFUL' : status === 'PENDING' ? 'PENDING' : 'FAILED';

    const { data: payment, error: pError } = await supabase
      .from('payments')
      .update({
        status: dbPaymentStatus,
        verified_by: userId || null,
        verified_at: new Date().toISOString(),
        rejection_reason: rejectionReason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select('*, reservation_id')
      .single();

    if (pError) throw pError;

    if (payment?.reservation_id) {
      const resStatus: ReservationStatus = isApproved ? 'CONFIRMED' : status === 'PENDING' ? 'PENDING_PAYMENT' : 'REJECTED';
      await updateReservationStatus(payment.reservation_id, resStatus, userId);
    }

    if (userId) {
      await logAuditAction(userId, null, 'company_owner_admin', 'UPDATE_PAYMENT_STATUS', 'payment', paymentId, {
        status: dbPaymentStatus,
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateReservationStatus(
  reservationId: string,
  status: ReservationStatus,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { data: reservation, error } = await supabase
      .from('reservations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reservationId)
      .select('unit_id, property_id')
      .single();

    if (error) throw error;

    // Handle unit availability release if cancelled or expired
    if (status === 'CANCELLED' || status === 'EXPIRED' || status === 'REJECTED') {
      if (reservation?.unit_id) {
        await supabase.from('property_units').update({ status: 'AVAILABLE' }).eq('id', reservation.unit_id);
      } else if (reservation?.property_id) {
        await supabase.from('properties').update({ status: 'AVAILABLE' }).eq('id', reservation.property_id);
      }
    } else if (status === 'CONFIRMED') {
      if (reservation?.unit_id) {
        await supabase.from('property_units').update({ status: 'OCCUPIED' }).eq('id', reservation.unit_id);
      } else if (reservation?.property_id) {
        await supabase.from('properties').update({ status: 'RENTED' }).eq('id', reservation.property_id);
      }
    }

    if (userId) {
      await logAuditAction(userId, null, 'staff', 'UPDATE_RESERVATION_STATUS', 'reservation', reservationId, { status });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


