import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CreditCard,
  Eye,
  Heart,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building,
  Lock,
  UserCheck,
  ArrowRight,
  Star,
  MapPin,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  Property,
  Reservation,
  Payment,
  ViewingAppointment,
  CurrencyCode,
  CompanySettings,
} from '../../types';
import { formatCurrency, fetchUserReservations, fetchUserPayments, fetchUserViewings } from '../../lib/db';
import { ReceiptModal } from '../modals/ReceiptModal';
import { PropertyCard } from '../common/PropertyCard';
import { CustomerPortalListSkeleton, PropertyListSkeleton } from '../common/Skeletons';

interface CustomerPortalViewProps {
  initialTab?: 'reservations' | 'payments' | 'viewings' | 'favorites' | 'profile';
  properties: Property[];
  currency: CurrencyCode;
  settings: CompanySettings;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onOpenAuth?: () => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  initialTab = 'reservations',
  properties,
  currency,
  settings,
  favorites,
  onToggleFavorite,
  onSelectProperty,
  onOpenAuth,
}) => {
  const { profile, updateProfile, user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [viewings, setViewings] = useState<ViewingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);

  // Profile edit states
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [country, setCountry] = useState(profile?.country || 'Ghana');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const userId = profile?.id || user?.id;

  const loadData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [resList, payList, viewList] = await Promise.all([
        fetchUserReservations(userId),
        fetchUserPayments(userId),
        fetchUserViewings(userId),
      ]);
      setReservations(resList);
      setPayments(payList);
      setViewings(viewList);
    } catch (e) {
      console.warn('Error fetching customer data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    const res = await updateProfile({ full_name: fullName, phone, country });
    if (res.success) {
      setProfileMessage('Profile information successfully updated.');
    } else {
      setProfileMessage(res.error || 'Failed to update profile.');
    }
  };

  const savedProperties = properties.filter((p) => favorites.includes(p.id));

  // If user is not authenticated with a real account, prompt to sign in or register
  if (!user || !profile) {
    return (
      <div className="min-h-[80vh] bg-gradient-to-br from-[#1A042B] via-[#2A0845] to-[#3D105E] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4AF37]/3 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-lg w-full">
          {/* Main Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-8 sm:p-10 border border-white/10 shadow-2xl">
            {/* Logo Section */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2A0845] to-[#451368] flex items-center justify-center ring-2 ring-[#D4AF37]/50 ring-offset-2 ring-offset-[#1A042B] shadow-xl p-2">
                  <img src="/logo.png" alt="ADIBEX PRESTIGE Logo" className="w-full h-full object-contain rounded-xl" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-lg">
                  <Lock className="w-4 h-4 text-[#2A0845]" />
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mb-3">
                Customer Portal
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                Real-time Reservations & Payment Receipts
              </h2>
              <p className="text-sm text-purple-200/80 leading-relaxed max-w-sm mx-auto">
                Sign in or register your account to manage your property reservations, track payment verifications, schedule inspection tours, and access official receipts.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {[
                { icon: Calendar, label: 'Manage Reservations', desc: 'Track all your bookings', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                { icon: CreditCard, label: 'Track Payments', desc: 'Monitor transaction status', color: 'text-blue-400', bg: 'bg-blue-400/10' },
                { icon: Eye, label: 'Schedule Viewings', desc: 'Book inspection tours', color: 'text-amber-400', bg: 'bg-amber-400/10' },
                { icon: FileText, label: 'Access Receipts', desc: 'Download official receipts', color: 'text-rose-400', bg: 'bg-rose-400/10' },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                >
                  <div className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center shrink-0 ${feature.color} group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">{feature.label}</span>
                    <span className="text-[11px] text-purple-200/60">{feature.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={onOpenAuth}
              className="w-full group inline-flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#D4AF37] text-[#2A0845] font-extrabold text-sm hover:bg-[#E5C04A] transition-all shadow-xl shadow-[#D4AF37]/20 cursor-pointer"
            >
              <span>Sign In or Register</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-purple-200/60">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">Secure</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-purple-200/30" />
              <div className="flex items-center gap-1.5 text-purple-200/60">
                <Star className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">Trusted</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-purple-200/30" />
              <div className="flex items-center gap-1.5 text-purple-200/60">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">Ghana & Worldwide</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/60 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Customer Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2A0845] to-[#451368] text-[#D4AF37] font-bold text-xl flex items-center justify-center shadow-md shadow-purple-950/20 border border-[#D4AF37]/30">
              {profile?.full_name?.charAt(0) || 'C'}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#2A0845] px-2 py-0.5 rounded-sm">
                Customer Account
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#2A0845] mt-1">
                {profile.full_name}
              </h1>
              <p className="text-xs text-slate-500">
                {profile.email} • Ghana & International Portals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-purple-50 border border-purple-100 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Reservations</span>
              <span className="font-extrabold text-sm text-[#2A0845]">{reservations.length}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-purple-50 border border-purple-100 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Payments</span>
              <span className="font-extrabold text-sm text-emerald-700">{payments.length}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-purple-50 border border-purple-100 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Viewings</span>
              <span className="font-extrabold text-sm text-[#D4AF37]">{viewings.length}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs gap-1 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
              activeTab === 'reservations'
                ? 'bg-[#2A0845] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-[#D4AF37]" />
            <span>My Reservations ({reservations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
              activeTab === 'payments'
                ? 'bg-[#2A0845] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4 text-[#D4AF37]" />
            <span>Payments & Receipts ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('viewings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
              activeTab === 'viewings'
                ? 'bg-[#2A0845] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-4 h-4 text-[#D4AF37]" />
            <span>Viewing Appointments ({viewings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
              activeTab === 'favorites'
                ? 'bg-[#2A0845] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Heart className="w-4 h-4 text-[#D4AF37]" />
            <span>Saved Properties ({savedProperties.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
              activeTab === 'profile'
                ? 'bg-[#2A0845] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4 text-[#D4AF37]" />
            <span>Account Profile</span>
          </button>
        </div>

        {/* TAB 1: RESERVATIONS */}
        {activeTab === 'reservations' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-lg text-[#2A0845]">My Property Reservations</h2>

            {loading ? (
              <CustomerPortalListSkeleton items={3} />
            ) : reservations.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {reservations.map((res) => (
                  <div key={res.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-purple-50 text-[#2A0845] rounded">
                          {res.reference_no}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            res.status === 'CONFIRMED' || res.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : res.status === 'PENDING_PAYMENT' || res.status === 'PAYMENT_PROCESSING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {res.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {res.property?.title || 'Property Reservation'}
                      </h4>
                      {res.unit?.unit_name && (
                        <p className="text-xs text-purple-800 font-semibold">
                          Assigned Unit: {res.unit.unit_name}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        Created: {new Date(res.created_at || Date.now()).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="font-extrabold text-sm text-[#2A0845]">
                        {formatCurrency(res.total_amount, currency, res.currency)}
                      </div>
                      {res.expires_at && res.status === 'PENDING_PAYMENT' && (
                        <p className="text-[11px] text-amber-700 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          Expires: {new Date(res.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                You have no active or previous reservations yet. Browse our marketplace to reserve a room, apartment, or commercial property!
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PAYMENTS & RECEIPTS */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-lg text-[#2A0845]">Payment Records & Official Receipts</h2>

            {loading ? (
              <CustomerPortalListSkeleton items={3} />
            ) : payments.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {payments.map((pay) => (
                  <div key={pay.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {pay.transaction_ref}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            pay.status === 'SUCCESSFUL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pay.status === 'PENDING' || pay.status === 'VERIFYING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {pay.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Method: <strong className="capitalize">{pay.payment_method.replace('_', ' ')}</strong>
                      </p>
                      {pay.bank_transaction_id && (
                        <p className="text-[11px] text-slate-400">Bank Ref: {pay.bank_transaction_id}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right font-extrabold text-sm text-[#2A0845]">
                        {formatCurrency(pay.amount, currency, pay.currency)}
                      </div>
                      <button
                        onClick={() => setSelectedPaymentForReceipt(pay)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-[#2A0845] hover:bg-purple-50 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>View Receipt</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                No payment transactions recorded yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VIEWINGS */}
        {activeTab === 'viewings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-lg text-[#2A0845]">Property Viewing Appointments</h2>

            {loading ? (
              <CustomerPortalListSkeleton items={3} />
            ) : viewings.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {viewings.map((viewing) => (
                  <div key={viewing.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-700">
                          Date: <strong>{viewing.preferred_date}</strong> ({viewing.preferred_time})
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            viewing.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {viewing.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {viewing.property?.title || 'Property Viewing'}
                      </p>
                      {viewing.agent && (
                        <p className="text-xs text-slate-500">
                          Assigned Agent: {viewing.agent.full_name} ({viewing.agent.phone})
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                No upcoming viewing tours scheduled. Click "Book In-Person Viewing" on any property to schedule an inspection tour.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SAVED PROPERTIES */}
        {activeTab === 'favorites' && (
          <div className="space-y-4">
            <h2 className="font-extrabold text-lg text-[#2A0845] bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              My Saved Favorites ({savedProperties.length})
            </h2>

            {savedProperties.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedProperties.map((p) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    currency={currency}
                    isFavorited={true}
                    onToggleFavorite={onToggleFavorite}
                    onSelect={onSelectProperty}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-500 text-xs border border-slate-200">
                You haven't saved any properties yet. Click the heart icon on any property card to save it for quick review.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROFILE EDIT */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-xl space-y-6">
            <h2 className="font-extrabold text-lg text-[#2A0845]">Account Profile Settings</h2>

            {profileMessage && (
              <div className="p-3 rounded-xl bg-purple-50 text-[#2A0845] border border-purple-200 text-xs font-semibold">
                {profileMessage}
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Country of Residence</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#2A0845] text-white font-bold text-xs hover:bg-[#3D105E] transition-colors cursor-pointer"
              >
                Save Profile Changes
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      {selectedPaymentForReceipt && (
        <ReceiptModal
          isOpen={!!selectedPaymentForReceipt}
          onClose={() => setSelectedPaymentForReceipt(null)}
          payment={selectedPaymentForReceipt}
          settings={settings}
        />
      )}
    </div>
  );
};
