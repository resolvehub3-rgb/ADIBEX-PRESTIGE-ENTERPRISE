export type UserRole = 'company_owner_admin' | 'agent' | 'customer';

export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  country?: string | null;
  address?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CompanySettings {
  id?: string;
  company_name: string;
  brand_name: string;
  brand_identity?: string;
  motto: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  logo_url?: string | null;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_branch: string;
  momo_number: string;
  momo_network: string;
  momo_account_name: string;
  payment_instructions: string;
  reservation_expiry_minutes: number;
  default_currency: CurrencyCode;
  supported_currencies: CurrencyCode[];
  cancellation_policy: string;
  viewing_policy: string;
  created_at?: string;
  updated_at?: string;
}

export type PropertyCategory = 'residential' | 'commercial' | 'land';

export type PropertyType =
  | 'single_room'
  | 'self_contained'
  | 'apartment'
  | 'flat'
  | 'house'
  | 'townhouse'
  | 'villa'
  | 'luxury_home'
  | 'store_shop'
  | 'office'
  | 'warehouse'
  | 'commercial_building'
  | 'residential_land'
  | 'commercial_land'
  | 'agricultural_land'
  | 'development_land';

export type TransactionType = 'RENT' | 'SALE' | 'LEASE';

export type PropertyStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'AVAILABLE'
  | 'RESERVED'
  | 'RENTED'
  | 'SOLD'
  | 'UNAVAILABLE';

export type UnitStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'OCCUPIED'
  | 'SOLD'
  | 'UNAVAILABLE'
  | 'MAINTENANCE';

export type RentalFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type CurrencyCode = 'GHS' | 'USD' | 'GBP' | 'EUR';

export interface PropertyUnit {
  id: string;
  property_id: string;
  unit_number: string;
  unit_name: string;
  price: number;
  currency: CurrencyCode;
  status: UnitStatus;
  floor_level?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  size_sqm?: number | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyMedia {
  id: string;
  property_id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'FLOOR_PLAN' | 'DOCUMENT';
  url: string;
  caption?: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at?: string;
}

export interface Property {
  id: string;
  reference_no: string;
  title: string;
  slug: string;
  description: string | null;
  property_type: PropertyType;
  transaction_type: TransactionType;
  status: PropertyStatus;
  price: number;
  currency: CurrencyCode;
  rental_frequency?: RentalFrequency | null;
  lease_duration?: string | null;
  country: string;
  region: string;
  city: string;
  area?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms: number;
  bathrooms: number;
  toilets: number;
  parking_spaces: number;
  floor_area_sqm?: number | null;
  land_size_sqm?: number | null;
  furnished: boolean;
  amenities: string[];
  property_rules: string[];
  availability_date?: string | null;
  virtual_tour_url?: string | null;
  security_deposit?: number | null;
  service_charge?: number | null;
  furnishing_status?: 'unfurnished' | 'semi-furnished' | 'furnished';
  is_featured: boolean;
  is_verified: boolean;
  is_archived: boolean;
  assigned_agent_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joins
  units?: PropertyUnit[];
  media?: PropertyMedia[];
  agent?: UserProfile | null;
}

export type ReservationStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_PROCESSING'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'COMPLETED';

export interface Reservation {
  id: string;
  reference_no: string;
  property_id: string;
  unit_id?: string | null;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  start_date?: string | null;
  end_date?: string | null;
  total_amount: number;
  currency: CurrencyCode;
  status: ReservationStatus;
  expires_at: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joins
  property?: Property;
  unit?: PropertyUnit;
  payments?: Payment[];
}

export type PaymentMethod = 'PAYSTACK_CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING' | 'VERIFYING' | 'SUCCESSFUL' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  transaction_ref: string;
  reservation_id: string;
  customer_id: string;
  amount: number;
  currency: CurrencyCode;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  payment_proof_url?: string | null;
  bank_transaction_id?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joins
  reservation?: Reservation;
}

export type ViewingStatus = 'REQUESTED' | 'CONFIRMED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface ViewingAppointment {
  id: string;
  property_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  preferred_date: string;
  preferred_time: string;
  number_of_people: number;
  message?: string | null;
  assigned_agent_id?: string | null;
  status: ViewingStatus;
  admin_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joins
  property?: Property;
  agent?: UserProfile;
}

export interface PropertyInquiry {
  id: string;
  property_id: string;
  customer_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  message: string;
  assigned_agent_id?: string | null;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
  created_at?: string;
  updated_at?: string;
  // Joins
  property?: Property;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'reservation' | 'payment' | 'viewing' | 'inquiry' | 'system';
  link?: string | null;
  is_read: boolean;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export interface SearchFilters {
  query?: string;
  country?: string;
  region?: string;
  city?: string;
  property_type?: PropertyType | 'all';
  category?: PropertyCategory | 'all';
  transaction_type?: TransactionType | 'all';
  min_price?: number;
  max_price?: number;
  bedrooms?: number | 'any';
  bathrooms?: number | 'any';
  furnished?: boolean | null;
  is_featured?: boolean;
  currency?: CurrencyCode;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'featured';
}

export const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Central',
  'Eastern',
  'Volta',
  'Northern',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
  'Oti',
  'Western North',
  'North East',
  'Savannah',
] as const;

export const GHANA_MAJOR_CITIES: Record<string, string[]> = {
  'Greater Accra': ['Accra', 'East Legon', 'Airport Residential', 'Cantonments', 'Tema', 'Spintex', 'Dzorwulu', 'Achimota', 'Osu', 'Labone', 'Madina', 'Adenta'],
  'Ashanti': ['Kumasi', 'Ahodwo', 'Asokwa', 'Nhyiaeso', 'Bantama', 'Kwadaso', 'Ejisu', 'Obuasi'],
  'Western': ['Sekondi-Takoradi', 'Tarkwa', 'Axim'],
  'Central': ['Cape Coast', 'Kasoa', 'Elmina', 'Winneba'],
  'Eastern': ['Koforidua', 'Nkawkaw', 'Aburi', 'Akuapem'],
  'Volta': ['Ho', 'Keta', 'Hohoe'],
  'Northern': ['Tamale', 'Yendi'],
  'Upper East': ['Bolgatanga', 'Navrongo'],
  'Upper West': ['Wa'],
  'Bono': ['Sunyani', 'Berekum'],
  'Bono East': ['Techiman', 'Kintampo'],
  'Ahafo': ['Goaso'],
  'Oti': ['Dambai'],
  'Western North': ['Sefwi Wiawso'],
  'North East': ['Nalerigu'],
  'Savannah': ['Damongo'],
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, { label: string; category: PropertyCategory }> = {
  single_room: { label: 'Single Room', category: 'residential' },
  self_contained: { label: 'Self-Contained Room', category: 'residential' },
  apartment: { label: 'Apartment', category: 'residential' },
  flat: { label: 'Flat', category: 'residential' },
  house: { label: 'House', category: 'residential' },
  townhouse: { label: 'Townhouse', category: 'residential' },
  villa: { label: 'Villa', category: 'residential' },
  luxury_home: { label: 'Luxury Home', category: 'residential' },
  store_shop: { label: 'Store / Shop', category: 'commercial' },
  office: { label: 'Office Space', category: 'commercial' },
  warehouse: { label: 'Warehouse', category: 'commercial' },
  commercial_building: { label: 'Commercial Building', category: 'commercial' },
  residential_land: { label: 'Residential Land', category: 'land' },
  commercial_land: { label: 'Commercial Land', category: 'land' },
  agricultural_land: { label: 'Agricultural Land', category: 'land' },
  development_land: { label: 'Development Land', category: 'land' },
};

export const COMMON_AMENITIES = [
  '24/7 Security',
  'Water Reservoir (Polytank)',
  'Standby Generator',
  'Air Conditioning',
  'Swimming Pool',
  'Walled & Gated',
  'Paved Compound',
  'Fitted Kitchen',
  'CCTV Surveillance',
  'High-Speed Internet (Fiber)',
  'Electric Fence',
  'En-suite Bedrooms',
  'Balcony / Terrace',
  'Carport / Garage',
  'Servant Quarters (Boys Quarters)',
  'Tarred Road Access',
  'Solar Power System',
  'Garden / Lawn',
];

export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  GHS: 1,
  USD: 0.065, // 1 GHS ~ $0.065 USD
  GBP: 0.052,
  EUR: 0.061,
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  GHS: 'GH₵',
  USD: '$',
  GBP: '£',
  EUR: '€',
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  company_name: 'ADIBEX PRESTIGE ENTERPRISE',
  brand_name: 'ADIBEX PRESTIGE PROPERTIES',
  brand_identity: 'ADIBEX PRESTIGE PROPERTIES',
  motto: 'Your Vision Our Mission',
  phone: '+233 24 000 0000',
  whatsapp: '+233 24 000 0000',
  email: 'info@adibexprestige.com',
  website: 'https://adibexprestige.com',
  address: 'Accra, Greater Accra Region, Ghana',
  bank_name: 'Stanbic Bank Ghana / GCB',
  bank_account_name: 'ADIBEX PRESTIGE ENTERPRISE',
  bank_account_number: '1441000000000',
  bank_branch: 'High Street Branch, Accra',
  momo_number: '+233 24 000 0000',
  momo_network: 'MTN Mobile Money',
  momo_account_name: 'ADIBEX PRESTIGE ENTERPRISE',
  payment_instructions: 'Please provide your Reservation Reference (e.g. RES-XXXX) in the payment narration or memo field for prompt verification.',
  reservation_expiry_minutes: 15,
  default_currency: 'GHS',
  supported_currencies: ['GHS', 'USD', 'GBP', 'EUR'],
  cancellation_policy: 'Reservations not funded within 15 minutes are automatically released to prevent double-booking. Confirmed bookings adhere to company tenancy agreement regulations.',
  viewing_policy: 'Viewing tours are scheduled with accredited field agents. Advance notice of at least 24 hours is recommended.',
};

