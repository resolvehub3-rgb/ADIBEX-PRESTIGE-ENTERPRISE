import React, { useState, useEffect } from 'react';
import {
  Building2,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  Settings,
  ShieldAlert,
  Plus,
  Edit,
  Trash2,
  Eye,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  Property,
  Reservation,
  Payment,
  ViewingAppointment,
  CompanySettings,
  UserProfile,
  AuditLog,
  CurrencyCode,
} from '../../types';
import {
  formatCurrency,
  updatePropertyStatus,
  deleteProperty,
  updatePaymentStatus,
  updateReservationStatus,
  updateViewingStatus,
  fetchAuditLogs,
  updateCompanySettings,
  fetchStaffProfiles,
  updateUserRole,
} from '../../lib/db';
import { PropertyFormModal } from '../modals/PropertyFormModal';
import {
  DashboardStatsSkeleton,
  DashboardTableSkeleton,
  StaffTableSkeleton,
} from '../common/Skeletons';

interface AdminDashboardViewProps {
  properties: Property[];
  reservations: Reservation[];
  payments: Payment[];
  viewings: ViewingAppointment[];
  settings: CompanySettings;
  currency: CurrencyCode;
  onRefreshData: () => void;
  isLoading?: boolean;
  onOpenAuth?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  properties,
  reservations,
  payments,
  viewings,
  settings,
  currency,
  onRefreshData,
  isLoading = false,
  onOpenAuth,
}) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'properties' | 'payments' | 'reservations' | 'viewings' | 'staff' | 'settings' | 'audit'
  >('overview');

  // Modals & form state
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Settings edit state
  const [settingsForm, setSettingsForm] = useState<CompanySettings>(settings);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState<string | null>(null);

  // Audit logs & staff state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  useEffect(() => {
    if (activeTab === 'audit') {
      setLoadingAudit(true);
      fetchAuditLogs(50)
        .then((logs: AuditLog[]) => setAuditLogs(logs))
        .finally(() => setLoadingAudit(false));
    } else if (activeTab === 'staff') {
      setLoadingStaff(true);
      fetchStaffProfiles()
        .then((list: UserProfile[]) => setStaffList(list))
        .finally(() => setLoadingStaff(false));
    }
  }, [activeTab]);

  // If user is not company owner, show authorization security screen
  if (profile?.role !== 'company_owner_admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-purple-100 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#2A0845]">Restricted: Company Owner / Admin Only</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Per company security governance, this enterprise management dashboard is strictly accessible to authenticated <strong>Company Owner / Admin</strong> accounts.
          </p>
          {profile && (
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-700">
              Signed in as: <strong>{profile.email}</strong> ({profile.role})
            </div>
          )}
          <button
            onClick={onOpenAuth}
            className="w-full py-3 rounded-xl bg-[#2A0845] text-white font-bold text-xs hover:bg-[#3D105E] transition-all shadow-md shadow-purple-950/20 cursor-pointer"
          >
            Sign In with Owner Account
          </button>
        </div>
      </div>
    );
  }

  // Calculations for overview
  const totalProperties = properties.length;
  const availableCount = properties.filter((p) => p.status === 'AVAILABLE').length;
  const reservedCount = properties.filter((p) => p.status === 'RESERVED').length;
  const rentedCount = properties.filter((p) => p.status === 'RENTED').length;
  const soldCount = properties.filter((p) => p.status === 'SOLD').length;

  const totalVerifiedRevenue = payments
    .filter((p) => p.status === 'SUCCESSFUL')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const pendingPaymentsCount = payments.filter((p) => p.status === 'PENDING' || p.status === 'VERIFYING').length;
  const pendingViewingsCount = viewings.filter((v) => v.status === 'REQUESTED').length;

  // Actions
  const handleApprovePayment = async (paymentId: string) => {
    const res = await updatePaymentStatus(paymentId, 'SUCCESSFUL', profile.id);
    if (res.success) {
      onRefreshData();
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const res = await updatePaymentStatus(paymentId, 'FAILED', profile.id);
    if (res.success) {
      onRefreshData();
    }
  };

  const handleChangePropertyStatus = async (propId: string, newStatus: any) => {
    await updatePropertyStatus(propId, newStatus, profile.id);
    onRefreshData();
  };

  const handleDeleteProperty = async (propId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this property listing?')) {
      await deleteProperty(propId, profile.id);
      onRefreshData();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSavedMessage(null);
    const res = await updateCompanySettings(settingsForm, profile.id);
    if (res.success) {
      setSettingsSavedMessage('Enterprise company settings successfully updated.');
      onRefreshData();
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#2A0845] to-[#3D105E] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 shadow-lg ring-2 ring-[#D4AF37]/50 ring-offset-2 ring-offset-[#2A0845] flex items-center justify-center p-1.5">
              <img src="/logo.png" alt="ADIBEX PRESTIGE Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2A0845] bg-[#D4AF37] px-2 py-0.5 rounded-sm">
                  Executive Portal
                </span>
                <span className="text-xs text-purple-200">Company Owner / Admin Authority</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {settings.company_name} Management
              </h1>
              <p className="text-xs text-purple-200 italic">"{settings.motto}"</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefreshData}
              title="Refresh Data"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setEditingProperty(null);
                setPropertyModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#2A0845] font-extrabold text-xs tracking-wider uppercase hover:bg-[#e0be4d] transition-all shadow-md shadow-black/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Property</span>
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs gap-1 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'properties', label: `Properties (${totalProperties})`, icon: Building2 },
            { id: 'payments', label: `Payment Approvals (${pendingPaymentsCount})`, icon: DollarSign },
            { id: 'reservations', label: `Reservations (${reservations.length})`, icon: Calendar },
            { id: 'viewings', label: `Viewing Tours (${pendingViewingsCount})`, icon: Eye },
            { id: 'staff', label: 'Agents & Staff', icon: Users },
            { id: 'settings', label: 'Company Settings', icon: Settings },
            { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#2A0845] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            {isLoading ? (
              <DashboardStatsSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Total Verified Revenue
                  </span>
                  <div className="text-2xl font-extrabold text-[#2A0845] mt-1">
                    {formatCurrency(totalVerifiedRevenue, currency, 'GHS')}
                  </div>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    From {payments.filter((p) => p.status === 'SUCCESSFUL').length} completed transactions
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Total Portfolio
                  </span>
                  <div className="text-2xl font-extrabold text-[#2A0845] mt-1">
                    {totalProperties} Listings
                  </div>
                  <div className="flex gap-2 text-[10px] text-slate-500 font-medium mt-1">
                    <span className="text-emerald-700">{availableCount} Available</span> •{' '}
                    <span className="text-amber-700">{reservedCount} Reserved</span> •{' '}
                    <span className="text-purple-700">{rentedCount} Rented</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Pending Payment Approvals
                  </span>
                  <div className="text-2xl font-extrabold text-amber-600 mt-1">
                    {pendingPaymentsCount} Pending
                  </div>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="text-[11px] text-[#2A0845] font-bold hover:underline mt-1 block"
                  >
                    Review Proofs &rarr;
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Viewing Requests
                  </span>
                  <div className="text-2xl font-extrabold text-purple-900 mt-1">
                    {pendingViewingsCount} Tours
                  </div>
                  <button
                    onClick={() => setActiveTab('viewings')}
                    className="text-[11px] text-[#2A0845] font-bold hover:underline mt-1 block"
                  >
                    Assign Agents &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Quick Action Hub */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <h3 className="font-extrabold text-base text-[#2A0845] mb-4">Enterprise Action Hub</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    setEditingProperty(null);
                    setPropertyModalOpen(true);
                  }}
                  className="p-4 rounded-2xl bg-purple-50 hover:bg-purple-100/70 border border-purple-200 text-left transition-all cursor-pointer"
                >
                  <Building2 className="w-6 h-6 text-[#2A0845] mb-2" />
                  <h4 className="font-bold text-xs text-slate-800">Publish New Listing</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rooms, apartments, houses, shops, offices, lands
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('payments')}
                  className="p-4 rounded-2xl bg-amber-50 hover:bg-amber-100/70 border border-amber-200 text-left transition-all cursor-pointer"
                >
                  <DollarSign className="w-6 h-6 text-amber-700 mb-2" />
                  <h4 className="font-bold text-xs text-slate-800">Verify Bank & MoMo Transfers</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Verify client transaction slips & unlock bookings
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all cursor-pointer"
                >
                  <Settings className="w-6 h-6 text-[#2A0845] mb-2" />
                  <h4 className="font-bold text-xs text-slate-800">Company Banking & Terms</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Configure official GCB Bank and MoMo numbers
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROPERTY MANAGEMENT */}
        {activeTab === 'properties' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-extrabold text-lg text-[#2A0845]">Property Portfolio Management</h2>
                <p className="text-xs text-slate-500">
                  Total published properties across all categories in Ghana
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingProperty(null);
                  setPropertyModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2A0845] text-white text-xs font-bold hover:bg-[#3D105E] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span>Add Property</span>
              </button>
            </div>

            {isLoading ? (
              <DashboardTableSkeleton columns={6} rows={6} />
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 text-left">Property Details</th>
                      <th className="py-3 px-4 text-left">Type & Category</th>
                      <th className="py-3 px-4 text-left">Location</th>
                      <th className="py-3 px-4 text-left">Price</th>
                      <th className="py-3 px-4 text-left">Live Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {properties.map((prop) => (
                      <tr key={prop.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 line-clamp-1">{prop.title}</div>
                          <span className="font-mono text-[10px] text-purple-800 font-semibold">
                            REF: {prop.reference_no}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-semibold text-slate-700 block">
                            {prop.property_type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase">
                            For {prop.transaction_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {prop.city}, {prop.region}
                        </td>
                        <td className="py-3 px-4 font-bold text-purple-900">
                          {formatCurrency(prop.price, currency, prop.currency)}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={prop.status}
                            onChange={(e) => handleChangePropertyStatus(prop.id, e.target.value)}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-800"
                          >
                            <option value="AVAILABLE">AVAILABLE</option>
                            <option value="RESERVED">RESERVED</option>
                            <option value="RENTED">RENTED</option>
                            <option value="SOLD">SOLD</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingProperty(prop);
                              setPropertyModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-200 transition-colors cursor-pointer"
                            title="Edit Listing"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProperty(prop.id)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {properties.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No properties in database yet. Click "Publish Property" above to create your first listing!
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PAYMENT APPROVALS */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-lg text-[#2A0845]">
              Online & Manual Payment Verification Queue
            </h2>
            <p className="text-xs text-slate-500">
              Verify customer bank deposit slips or Mobile Money merchant transfers before permanently confirming reservations.
            </p>

            {isLoading ? (
              <DashboardTableSkeleton columns={7} rows={5} />
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 text-left">Txn Ref</th>
                      <th className="py-3 px-4 text-left">Property / Reservation</th>
                      <th className="py-3 px-4 text-left">Customer</th>
                      <th className="py-3 px-4 text-left">Amount</th>
                      <th className="py-3 px-4 text-left">Payment Proof</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {pay.transaction_ref}
                          <span className="text-[10px] text-slate-400 font-sans block capitalize">
                            {pay.payment_method.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 block line-clamp-1">
                            {pay.reservation?.property?.title || 'Property Reservation'}
                          </span>
                          <span className="text-[10px] text-purple-800 font-mono">
                            {pay.reservation?.reference_no}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {pay.reservation?.customer_name || 'Client'}
                          </span>
                          <span className="text-[10px] text-slate-400">{pay.reservation?.customer_phone}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-purple-900">
                          {formatCurrency(pay.amount, currency, pay.currency)}
                        </td>
                        <td className="py-3 px-4">
                          {pay.payment_proof_url ? (
                            <a
                              href={pay.payment_proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-purple-700 hover:underline font-semibold"
                            >
                              <span>View Proof</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : pay.bank_transaction_id ? (
                            <span className="font-mono text-[10px] text-slate-600">
                              Ref: {pay.bank_transaction_id}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">No attachment</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              pay.status === 'SUCCESSFUL'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pay.status === 'PENDING' || pay.status === 'VERIFYING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {pay.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {pay.status === 'PENDING' || pay.status === 'VERIFYING' ? (
                            <>
                              <button
                                onClick={() => handleApprovePayment(pay.id)}
                                className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectPayment(pay.id)}
                                className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-medium">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {payments.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No payment transactions submitted yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RESERVATIONS */}
        {activeTab === 'reservations' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-lg text-[#2A0845]">All Customer Reservations</h2>
            {isLoading ? (
              <DashboardTableSkeleton columns={7} rows={5} />
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 text-left">Reservation Ref</th>
                      <th className="py-3 px-4 text-left">Property & Unit</th>
                      <th className="py-3 px-4 text-left">Customer</th>
                      <th className="py-3 px-4 text-left">Duration</th>
                      <th className="py-3 px-4 text-left">Total</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-right">Status Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reservations.map((res) => (
                      <tr key={res.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{res.reference_no}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block line-clamp-1">
                            {res.property?.title}
                          </span>
                          {res.unit?.unit_name && (
                            <span className="text-[10px] text-purple-700">Unit: {res.unit.unit_name}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">{res.customer_name}</span>
                          <span className="text-[10px] text-slate-400">{res.customer_phone}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {res.start_date ? `${res.start_date} to ${res.end_date || 'Open'}` : 'Not specified'}
                        </td>
                        <td className="py-3 px-4 font-bold text-purple-900">
                          {formatCurrency(res.total_amount, currency, res.currency)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              res.status === 'CONFIRMED' || res.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : res.status === 'PENDING_PAYMENT' || res.status === 'PAYMENT_PROCESSING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {res.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select
                            value={res.status}
                            onChange={(e) => {
                              updateReservationStatus(res.id, e.target.value as any, profile.id);
                              onRefreshData();
                            }}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-[11px]"
                          >
                            <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                            <option value="PAYMENT_PROCESSING">PAYMENT_PROCESSING</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="CANCELLED">CANCELLED</option>
                            <option value="EXPIRED">EXPIRED</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {reservations.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No reservations recorded yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: VIEWING TOURS */}
        {activeTab === 'viewings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-lg text-[#2A0845]">Viewing Tour Appointments</h2>
            {isLoading ? (
              <DashboardTableSkeleton columns={6} rows={5} />
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 text-left">Preferred Schedule</th>
                      <th className="py-3 px-4 text-left">Property</th>
                      <th className="py-3 px-4 text-left">Customer Contact</th>
                      <th className="py-3 px-4 text-left">Assigned Agent</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-right">Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewings.map((viewing) => (
                      <tr key={viewing.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{viewing.preferred_date}</span>
                          <span className="text-[10px] text-slate-500">{viewing.preferred_time}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-purple-900">
                          {viewing.property?.title}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold block">{viewing.customer_name}</span>
                          <span className="text-[10px] text-slate-400">
                            {viewing.customer_phone} • {viewing.customer_email}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {viewing.agent?.full_name || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              viewing.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {viewing.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select
                            value={viewing.status}
                            onChange={(e) => {
                              updateViewingStatus(viewing.id, e.target.value as any, profile.id);
                              onRefreshData();
                            }}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-[11px]"
                          >
                            <option value="REQUESTED">REQUESTED</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {viewings.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No viewing appointments scheduled yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: STAFF & AGENTS */}
        {activeTab === 'staff' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-lg text-[#2A0845]">Agents & Staff Roster</h2>
            <p className="text-xs text-slate-500">
              Company Owner / Admin has highest authority to promote or reassign agent privileges.
            </p>

            {loadingStaff ? (
              <StaffTableSkeleton rows={4} />
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 text-left">Staff Member</th>
                      <th className="py-3 px-4 text-left">Role</th>
                      <th className="py-3 px-4 text-left">Email</th>
                      <th className="py-3 px-4 text-left">Phone</th>
                      <th className="py-3 px-4 text-right">Change Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map((member) => (
                      <tr key={member.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{member.full_name}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              member.role === 'company_owner_admin'
                                ? 'bg-purple-100 text-[#2A0845]'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {member.role === 'company_owner_admin' ? 'Company Owner' : 'Agent / Staff'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{member.email}</td>
                        <td className="py-3 px-4 text-slate-600">{member.phone || 'N/A'}</td>
                        <td className="py-3 px-4 text-right">
                          <select
                            value={member.role}
                            onChange={async (e) => {
                              await updateUserRole(member.id, e.target.value as any, profile.id);
                              fetchStaffProfiles().then((list) => setStaffList(list));
                            }}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-[11px]"
                          >
                            <option value="agent">Agent / Staff</option>
                            <option value="company_owner_admin">Company Owner</option>
                            <option value="customer">Customer (Demote)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {staffList.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No staff members found.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: COMPANY SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-2xl space-y-6">
            <div>
              <h2 className="font-extrabold text-lg text-[#2A0845]">Enterprise Company Settings</h2>
              <p className="text-xs text-slate-500">
                Configure corporate identity, motto, contact channels, and official payment accounts.
              </p>
            </div>

            {settingsSavedMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                {settingsSavedMessage}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Registered Name</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.company_name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.brand_name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, brand_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0845]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Motto</label>
                <input
                  type="text"
                  required
                  value={settingsForm.motto}
                  onChange={(e) => setSettingsForm({ ...settingsForm, motto: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs italic font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Head Office Address</label>
                <input
                  type="text"
                  required
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={settingsForm.whatsapp}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={settingsForm.email}
                    onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-3">
                <h4 className="font-bold text-[#2A0845] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                  Corporate Bank Account (For Direct Wire / Cheque / Cash Deposits)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={settingsForm.bank_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bank_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={settingsForm.bank_account_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bank_account_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={settingsForm.bank_account_number}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bank_account_number: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Branch</label>
                    <input
                      type="text"
                      value={settingsForm.bank_branch}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bank_branch: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800">Mobile Money Merchant Settings</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">MoMo Network</label>
                    <input
                      type="text"
                      value={settingsForm.momo_network}
                      onChange={(e) => setSettingsForm({ ...settingsForm, momo_network: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">MoMo Merchant Number</label>
                    <input
                      type="text"
                      value={settingsForm.momo_number}
                      onChange={(e) => setSettingsForm({ ...settingsForm, momo_number: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={settingsForm.momo_account_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, momo_account_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reservation Expiry Time (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={settingsForm.reservation_expiry_minutes}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      reservation_expiry_minutes: Number(e.target.value),
                    })
                  }
                  className="w-48 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#2A0845] text-white font-bold text-xs hover:bg-[#3D105E] transition-all shadow-md shadow-purple-950/15 cursor-pointer"
              >
                Save Company Settings
              </button>
            </form>
          </div>
        )}

        {/* TAB 8: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-lg text-[#2A0845]">System Security & Audit Trail</h2>
            <p className="text-xs text-slate-500">
              Immutable PostgreSQL audit records tracking all critical enterprise actions, logins, property modifications, and payment approvals.
            </p>

            {loadingAudit ? (
              <DashboardTableSkeleton columns={5} rows={6} />
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 text-left">Timestamp</th>
                      <th className="py-3 px-4 text-left">Action</th>
                      <th className="py-3 px-4 text-left">Actor Role</th>
                      <th className="py-3 px-4 text-left">User Email</th>
                      <th className="py-3 px-4 text-left">Entity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-purple-900">{log.action}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-700 capitalize">{log.user_role}</td>
                        <td className="py-2.5 px-4 text-slate-600">{log.user_email || 'System'}</td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[10px]">
                          {log.entity_type} {log.entity_id ? `(${log.entity_id.substring(0, 8)})` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {auditLogs.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No audit log entries recorded yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Property Create/Edit Form Modal */}
      <PropertyFormModal
        isOpen={propertyModalOpen}
        onClose={() => setPropertyModalOpen(false)}
        propertyToEdit={editingProperty}
        onSuccess={() => {
          onRefreshData();
        }}
      />
    </div>
  );
};
