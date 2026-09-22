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
      <div className="min-h-[80vh] bg-gradient-to-br from-[#0F0118] via-[#1A042B] to-[#0D0015] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#2A0845]/30 blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#D4AF37]/10 blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

        {/* Floating grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />

        <div className="relative z-10 max-w-6xl w-full">
          {/* Main two-column card */}
          <div className="relative bg-white/[0.04] backdrop-blur-2xl rounded-[2rem] border border-white/[0.08] shadow-2xl shadow-purple-950/50 overflow-hidden">
            {/* Top accent line */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[560px]">
              {/* Left Column — Main Content */}
              <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center space-y-7 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 w-fit">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                    Customer Portal
                  </span>
                </div>

                {/* Heading */}
                <div className="space-y-3">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                    Real-time Reservations & Payment Receipts
                  </h2>
                  <p className="text-sm text-purple-200/60 leading-relaxed max-w-md">
                    Sign in or register your account to manage your property reservations, track payment verifications, schedule inspection tours, and access official receipts.
                  </p>
                </div>

                {/* Feature Grid — 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: Calendar, label: 'Manage Reservations', desc: 'Track all your bookings', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
                    { icon: CreditCard, label: 'Track Payments', desc: 'Monitor transaction status', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
                    { icon: Eye, label: 'Schedule Viewings', desc: 'Book inspection tours', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
                    { icon: FileText, label: 'Access Receipts', desc: 'Download official receipts', color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20' },
                  ].map((feature, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-4 rounded-2xl bg-white/[0.04] border ${feature.border} hover:bg-white/[0.08] transition-all group cursor-default`}
                    >
                      <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center shrink-0 ${feature.color} group-hover:scale-110 transition-transform`}>
                        <feature.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white block">{feature.label}</span>
                        <span className="text-[11px] text-purple-200/50">{feature.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={onOpenAuth}
                  className="group relative w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E8C547] to-[#D4AF37] text-[#1A042B] font-extrabold text-sm tracking-wide transition-all duration-300 hover:shadow-lg hover:shadow-[#D4AF37]/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Sign In or Register
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                </button>
              </div>

              {/* Right Column — Visual Info Panel */}
              <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center relative">
                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#D4AF37]/10 to-transparent rounded-bl-[4rem]" />

                <div className="space-y-8 relative z-10">
                  {/* Logo */}
                  <div className="flex justify-center lg:justify-start">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#2A0845] to-[#451368] flex items-center justify-center ring-2 ring-[#D4AF37]/50 ring-offset-2 ring-offset-[#0F0118] shadow-xl p-2.5">
                        <img src="/logo.png" alt="ADIBEX PRESTIGE Logo" className="w-full h-full object-contain rounded-xl" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-lg">
                        <Lock className="w-4 h-4 text-[#1A042B]" />
                      </div>
                    </div>
                  </div>

                  {/* How it works */}
                  <div className="space-y-5">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37]/80">
                      How It Works
                    </h3>

                    {[
                      { step: '01', title: 'Create Account', desc: 'Register with your email in seconds' },
                      { step: '02', title: 'Browse Properties', desc: 'Explore our premium portfolio' },
                      { step: '03', title: 'Reserve & Pay', desc: 'Book your property and submit payment' },
                      { step: '04', title: 'Track & Manage', desc: 'Monitor status and download receipts' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-4 group/item">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover/item:bg-[#D4AF37]/10 group-hover/item:border-[#D4AF37]/20 transition-all duration-300">
                          <span className="text-xs font-extrabold text-[#D4AF37]/60 group-hover/item:text-[#D4AF37] transition-colors">{item.step}</span>
                        </div>
                        <div className="pt-1">
                          <p className="text-sm font-semibold text-white/90">{item.title}</p>
                          <p className="text-xs text-purple-300/40 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-white/[0.06] via-white/[0.10] to-white/[0.06]" />

                  {/* Trust badges */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: ShieldCheck, label: 'Secure', desc: 'Encrypted' },
                      { icon: Star, label: 'Trusted', desc: 'Verified' },
                      { icon: MapPin, label: 'Ghana &\nWorldwide', desc: 'Coverage' },
                    ].map((badge, i) => (
                      <div key={i} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <badge.icon className="w-5 h-5 text-[#D4AF37]/60 mx-auto mb-2" />
                        <p className="text-[11px] font-bold text-white/80 whitespace-pre-line leading-tight">{badge.label}</p>
                        <p className="text-[9px] text-purple-300/30 mt-0.5">{badge.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom brand mark */}
          <div className="mt-6 text-center">
            <p className="text-[11px] font-semibold text-purple-400/30 tracking-widest uppercase">
              ADIBEX PRESTIGE Enterprise
            </p>
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
