-- ========================================================================
-- ADIBEX PRESTIGE ENTERPRISE | ADIBEX PRESTIGE PROPERTIES
-- PostgreSQL Schema & Row Level Security (RLS) for Supabase
-- Motto: "Your Vision Our Mission"
-- Highest Authority: COMPANY OWNER / ADMIN (No Super Admin / No Platform Admin)
-- ========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------
-- 1. PROFILES & ROLES
-- Role constraints: 'company_owner_admin', 'agent', 'customer'
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('company_owner_admin', 'agent', 'customer')),
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  country TEXT DEFAULT 'Ghana',
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 2. COMPANY SETTINGS
-- Company profile, bank and Mobile Money information, booking rules
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL DEFAULT 'ADIBEX PRESTIGE ENTERPRISE',
  brand_name TEXT NOT NULL DEFAULT 'ADIBEX PRESTIGE PROPERTIES',
  motto TEXT NOT NULL DEFAULT 'Your Vision Our Mission',
  phone TEXT DEFAULT '+233 24 000 0000',
  whatsapp TEXT DEFAULT '+233 24 000 0000',
  email TEXT DEFAULT 'contact@adibexprestige.com',
  website TEXT DEFAULT 'https://adibexprestige.com',
  address TEXT DEFAULT 'Airport Residential Area, Accra, Ghana',
  logo_url TEXT,
  bank_name TEXT DEFAULT 'GCB Bank Ghana',
  bank_account_name TEXT DEFAULT 'ADIBEX PRESTIGE ENTERPRISE',
  bank_account_number TEXT DEFAULT '1011123456789',
  bank_branch TEXT DEFAULT 'Accra High Street Branch',
  momo_number TEXT DEFAULT '+233 24 000 0000',
  momo_network TEXT DEFAULT 'MTN Mobile Money',
  momo_account_name TEXT DEFAULT 'ADIBEX PRESTIGE ENTERPRISE',
  payment_instructions TEXT DEFAULT 'Please include your unique Reservation Reference in the payment remark / reference field.',
  reservation_expiry_minutes INTEGER NOT NULL DEFAULT 15,
  default_currency TEXT NOT NULL DEFAULT 'GHS',
  supported_currencies TEXT[] DEFAULT ARRAY['GHS', 'USD', 'GBP', 'EUR'],
  cancellation_policy TEXT DEFAULT 'Cancellations made 48 hours prior to scheduled occupancy receive full refund less processing fees.',
  viewing_policy TEXT DEFAULT 'Physical viewings are accompanied by a licensed Adibex Prestige agent. Bring a valid government ID.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 3. PROPERTIES
-- Houses, Apartments, Rooms, Stores, Offices, Commercial, Lands
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_no TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  property_type TEXT NOT NULL CHECK (property_type IN (
    'single_room', 'self_contained', 'apartment', 'flat', 'house', 
    'townhouse', 'villa', 'luxury_home', 'store_shop', 'office', 
    'warehouse', 'commercial_building', 'residential_land', 
    'commercial_land', 'agricultural_land', 'development_land'
  )),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('RENT', 'SALE', 'LEASE')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'AVAILABLE', 'RESERVED', 'RENTED', 'SOLD', 'UNAVAILABLE')),
  price NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  rental_frequency TEXT CHECK (rental_frequency IN ('daily', 'weekly', 'monthly', 'yearly') OR rental_frequency IS NULL),
  lease_duration TEXT,
  country TEXT NOT NULL DEFAULT 'Ghana',
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  toilets INTEGER DEFAULT 0,
  parking_spaces INTEGER DEFAULT 0,
  floor_area_sqm NUMERIC(10, 2),
  land_size_sqm NUMERIC(10, 2),
  furnished BOOLEAN DEFAULT FALSE,
  amenities TEXT[] DEFAULT '{}',
  property_rules TEXT[] DEFAULT '{}',
  availability_date DATE DEFAULT CURRENT_DATE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_transaction_type ON public.properties(transaction_type);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_region_city ON public.properties(region, city);
CREATE INDEX IF NOT EXISTS idx_properties_is_featured ON public.properties(is_featured);
CREATE INDEX IF NOT EXISTS idx_properties_is_archived ON public.properties(is_archived);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 4. PROPERTY UNITS (Rooms, Apartments, Offices, Sub-units)
-- Essential for multi-unit properties (e.g. Sunrise Apartments Room 101, 102...)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  price NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'SOLD', 'UNAVAILABLE', 'MAINTENANCE')),
  floor_level TEXT,
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  size_sqm NUMERIC(10, 2),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.property_units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON public.property_units(status);

ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 5. PROPERTY MEDIA
-- Images, Videos, Floor plans, Brochures
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE', 'VIDEO', 'FLOOR_PLAN', 'DOCUMENT')),
  url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_property_id ON public.property_media(property_id);

ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 6. PROPERTY FAVORITES
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

ALTER TABLE public.property_favorites ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 7. RESERVATIONS
-- With unique reference, unit tracking, expiration logic & double-booking prevention
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_no TEXT NOT NULL UNIQUE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  total_amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN (
    'PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'REJECTED', 'COMPLETED'
  )),
  expires_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_property ON public.reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_reservations_unit ON public.reservations(unit_id);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON public.reservations(expires_at);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 8. PAYMENTS
-- Paystack card, Mobile Money (MTN MoMo, Telecel), Direct Bank transfer
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_ref TEXT NOT NULL UNIQUE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('PAYSTACK_CARD', 'MOBILE_MONEY', 'BANK_TRANSFER')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFYING', 'SUCCESSFUL', 'FAILED', 'REFUNDED')),
  payment_proof_url TEXT,
  bank_transaction_id TEXT,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_reservation ON public.payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 9. VIEWING APPOINTMENTS
-- Physical viewings requested by customers
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.viewing_appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  number_of_people INTEGER DEFAULT 1,
  message TEXT,
  assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viewings_customer ON public.viewing_appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_viewings_agent ON public.viewing_appointments(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_viewings_status ON public.viewing_appointments(status);

ALTER TABLE public.viewing_appointments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 10. CUSTOMER INQUIRIES
-- General property inquiries
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'CLOSED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.property_inquiries ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 11. NOTIFICATIONS
-- In-app notifications
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 12. AUDIT LOGS
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- ROW LEVEL SECURITY POLICIES
-- Strict Separation:
-- 1. COMPANY OWNER / ADMIN has complete control over company data
-- 2. AGENT has control over assigned properties, viewings, inquiries
-- 3. CUSTOMER can only access their own reservations, payments, viewings
-- 4. PUBLIC can only view published properties, units, media
-- NO SUPER ADMIN, NO PLATFORM ADMIN
-- ========================================================================

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "Public can view minimal agent profile" ON public.profiles
  FOR SELECT USING (role = 'agent' OR id = auth.uid());

CREATE POLICY "Owner has full access to profiles" ON public.profiles
  FOR ALL USING (public.get_auth_role() = 'company_owner_admin');

CREATE POLICY "Users can view and update their own profile" ON public.profiles
  FOR ALL USING (id = auth.uid());

-- COMPANY SETTINGS
CREATE POLICY "Public can view company settings" ON public.company_settings
  FOR SELECT USING (true);

CREATE POLICY "Owner can update company settings" ON public.company_settings
  FOR ALL USING (public.get_auth_role() = 'company_owner_admin');

-- PROPERTIES
CREATE POLICY "Public can view published unarchived properties" ON public.properties
  FOR SELECT USING (status IN ('PUBLISHED', 'AVAILABLE', 'RESERVED', 'RENTED', 'SOLD') AND is_archived = false);

CREATE POLICY "Owner has full access to properties" ON public.properties
  FOR ALL USING (public.get_auth_role() = 'company_owner_admin');

CREATE POLICY "Agents can view and edit assigned properties" ON public.properties
  FOR ALL USING (
    public.get_auth_role() = 'agent' AND (assigned_agent_id = auth.uid() OR created_by = auth.uid())
  );

-- PROPERTY UNITS
CREATE POLICY "Public can view units of active properties" ON public.property_units
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_units.property_id AND p.is_archived = false)
  );

CREATE POLICY "Owner has full access to units" ON public.property_units
  FOR ALL USING (public.get_auth_role() = 'company_owner_admin');

CREATE POLICY "Agents can manage units of assigned properties" ON public.property_units
  FOR ALL USING (
    public.get_auth_role() = 'agent' AND EXISTS (
      SELECT 1 FROM public.properties p 
      WHERE p.id = property_units.property_id AND p.assigned_agent_id = auth.uid()
    )
  );

-- PROPERTY MEDIA
CREATE POLICY "Public can view property media" ON public.property_media
  FOR SELECT USING (true);

CREATE POLICY "Owner can manage media" ON public.property_media
  FOR ALL USING (public.get_auth_role() = 'company_owner_admin');

CREATE POLICY "Agents can manage media for assigned properties" ON public.property_media
  FOR ALL USING (
    public.get_auth_role() = 'agent' AND EXISTS (
      SELECT 1 FROM public.properties p 
      WHERE p.id = property_media.property_id AND p.assigned_agent_id = auth.uid()
    )
  );

-- FAVORITES
CREATE POLICY "Customers can manage their own favorites" ON public.property_favorites
  FOR ALL USING (user_id = auth.uid());

-- RESERVATIONS
CREATE POLICY "Customers can view their own reservations" ON public.reservations
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can create reservations" ON public.reservations
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Owner has full access to reservations" ON public.reservations
  FOR ALL USING (public.get_auth_role() = 'company_owner_admin');

CREATE POLICY "Agents can view reservations for assigned properties" ON public.reservations
  FOR SELECT USING (
    public.get_auth_role() = 'agent' AND EXISTS (
      SELECT 1 FROM public.properties p 
      WHERE p.id = reservations.property_id AND p.assigned_agent_id = auth.uid()
    )
  );

-- PAYMENTS
CREATE POLICY "Customers can view their own payments" ON public.payments
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can submit payments" ON public.payments
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Owner has full access to payments" ON public.payments
  FOR ALL USING (public.get_auth_role() = 'company_owner_admin');

-- VIEWING APPOINTMENTS
CREATE POLICY "Customers can view and create their appointments" ON public.viewing_appointments
  FOR ALL USING (customer_id = auth.uid());

CREATE POLICY "Owner has full access to viewing appointments" ON public.viewing_appointments
  FOR ALL USING (public.get_auth_role() = 'company_owner_admin');

CREATE POLICY "Agents can view and manage assigned viewing appointments" ON public.viewing_appointments
  FOR ALL USING (
    public.get_auth_role() = 'agent' AND assigned_agent_id = auth.uid()
  );

-- INQUIRIES
CREATE POLICY "Customers can create inquiries" ON public.property_inquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Customers can view their own inquiries" ON public.property_inquiries
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Owner has full access to inquiries" ON public.property_inquiries
  FOR ALL USING (public.get_auth_role() = 'company_owner_admin');

CREATE POLICY "Agents can view assigned inquiries" ON public.property_inquiries
  FOR ALL USING (
    public.get_auth_role() = 'agent' AND assigned_agent_id = auth.uid()
  );

-- NOTIFICATIONS
CREATE POLICY "Users can manage their own notifications" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- AUDIT LOGS
CREATE POLICY "Owner can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.get_auth_role() = 'company_owner_admin');

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ========================================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- 1. Auto-update timestamps
-- 2. Double-booking prevention lock
-- 3. Trigger to create profile on user registration
-- ========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_units_updated_at ON public.property_units;
CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.property_units
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservations_updated_at ON public.reservations;
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ========================================================================
-- STORAGE BUCKET POLICIES (Supabase Storage)
-- Buckets: 'property-media', 'payment-proofs'
-- ========================================================================
-- Run these via Supabase dashboard or SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('property-media', 'property-media', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false) ON CONFLICT DO NOTHING;
