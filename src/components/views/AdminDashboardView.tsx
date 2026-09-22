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
  LayoutDashboard,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  Phone,
  Mail,
  MessageCircle,
  CreditCard,
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
  onNavigate?: (view: string, data?: any) => void;
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
  onNavigate,
}) => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'properties' | 'payments' | 'reservations' | 'viewings' | 'staff' | 'settings' | 'audit'
  >('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
      <div className="min-h-screen bg-gradient-to-br from-[#0F0118] via-[#1A042B] to-[#0D0015] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#2A0845]/30 blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#D4AF37]/10 blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

        {/* Floating grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />

        <div className="relative z-10 max-w-5xl w-full">
          {/* Back to Home */}
          <button
            onClick={() => onNavigate ? onNavigate('home') : (window.location.href = '/')}
            className="flex items-center gap-2 text-purple-300/60 hover:text-[#D4AF37] transition-colors duration-300 mb-8 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center group-hover:bg-[#D4AF37]/10 group-hover:border-[#D4AF37]/20 transition-all duration-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </div>
            <span className="text-xs font-semibold tracking-wide">Back to Home</span>
          </button>

          {/* Main two-column card */}
          <div className="relative bg-white/[0.04] backdrop-blur-2xl rounded-[2rem] border border-white/[0.08] shadow-2xl shadow-purple-950/50 overflow-hidden">
            {/* Top accent line */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[480px]">
              {/* Left Column — Security Content */}
              <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center space-y-7 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
                {/* Shield icon with glow */}
                <div className="relative w-fit">
                  <div className="absolute inset-0 rounded-2xl bg-[#D4AF37]/20 blur-xl scale-150" />
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/20 flex items-center justify-center">
                    <ShieldAlert className="w-9 h-9 text-[#D4AF37]" />
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                      Access Restricted
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                    Company Owner<br />/ Admin Only
                  </h2>
                </div>

                {/* Description */}
                <p className="text-sm text-purple-200/60 leading-relaxed">
                  Per company security governance, this enterprise management dashboard is strictly accessible to authenticated{' '}
                  <span className="font-semibold text-white/80">Company Owner</span> / <span className="font-semibold text-white/80">Admin</span> accounts.
                </p>

                {/* CTA Button */}
                <button
                  onClick={onOpenAuth}
                  className="group relative w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E8C547] to-[#D4AF37] text-[#1A042B] font-extrabold text-sm tracking-wide transition-all duration-300 hover:shadow-lg hover:shadow-[#D4AF37]/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Sign In with Owner Account
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                </button>
              </div>

              {/* Right Column — Visual Info Panel */}
              <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center relative">
                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#D4AF37]/10 to-transparent rounded-bl-[4rem]" />

                <div className="space-y-8 relative z-10">
                  {/* Security features list */}
                  <div className="space-y-5">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37]/80">
                      Dashboard Permissions
                    </h3>

                    {[
                      { icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605', label: 'Property Portfolio Management', desc: 'Full CRUD access to all listings' },
                      { icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z', label: 'Payment Verification', desc: 'Approve or reject bank & MoMo transfers' },
                      { icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5', label: 'Reservation Control', desc: 'Confirm, cancel, or reject bookings' },
                      { icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z', label: 'Staff & Role Management', desc: 'Promote or reassign agent privileges' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-4 group/item">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover/item:bg-[#D4AF37]/10 group-hover/item:border-[#D4AF37]/20 transition-all duration-300">
                          <svg className="w-5 h-5 text-purple-300/60 group-hover/item:text-[#D4AF37] transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                          </svg>
                        </div>
                        <div className="pt-1">
                          <p className="text-sm font-semibold text-white/90">{item.label}</p>
                          <p className="text-xs text-purple-300/40 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-white/[0.06] via-white/[0.10] to-white/[0.06]" />

                  {/* Security badge */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white/70">Enterprise Secured</p>
                      <p className="text-[10px] text-purple-300/40">Row-level security & audit logging enabled</p>
                    </div>
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

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, count: null },
    { id: 'properties', label: 'Properties', icon: Building2, count: totalProperties },
    { id: 'payments', label: 'Payment Approvals', icon: DollarSign, count: pendingPaymentsCount },
    { id: 'reservations', label: 'Reservations', icon: Calendar, count: reservations.length },
    { id: 'viewings', label: 'Viewing Tours', icon: Eye, count: pendingViewingsCount },
    { id: 'staff', label: 'Agents & Staff', icon: Users, count: null },
    { id: 'settings', label: 'Company Settings', icon: Settings, count: null },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck, count: null },
  ];

  const handleNavTab = (tabId: string) => {
    setActiveTab(tabId as any);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-gradient-to-b from-[#1A042B] via-[#2A0845] to-[#1A042B] text-white transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`p-5 border-b border-white/10 ${sidebarCollapsed ? 'px-3' : ''}`}>
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-white/10 ring-2 ring-[#D4AF37]/50 flex items-center justify-center shrink-0 p-1">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h2 className="font-extrabold text-sm tracking-tight text-white leading-tight truncate">
                  {settings.company_name}
                </h2>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]">
                  Admin Portal
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavTab(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer group ${
                  sidebarCollapsed ? 'justify-center px-2 py-3' : 'px-3.5 py-3'
                } ${
                  isActive
                    ? 'bg-[#D4AF37] text-[#1A042B] shadow-lg shadow-[#D4AF37]/20'
                    : 'text-purple-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-[#1A042B]' : 'text-purple-400 group-hover:text-white'
                  }`}
                />
                {!sidebarCollapsed && (
                  <>
                    <span className={`text-sm font-semibold flex-1 text-left ${isActive ? 'text-[#1A0845]' : ''}`}>
                      {item.label}
                    </span>
                    {item.count !== null && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center ${
                          isActive
                            ? 'bg-[#1A042B]/20 text-[#1A042B]'
                            : 'bg-white/10 text-purple-300'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </>
                )}
                {sidebarCollapsed && item.count !== null && item.count > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D4AF37]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className={`p-3 border-t border-white/10 ${sidebarCollapsed ? 'px-2' : ''}`}>
          {/* Home Link */}
          <button
            onClick={() => onNavigate ? onNavigate('home') : (window.location.href = '/')}
            title={sidebarCollapsed ? 'Back to Home' : undefined}
            className={`w-full flex items-center gap-3 rounded-xl text-purple-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer mb-2 ${
              sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3.5 py-2.5'
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span className="text-sm font-semibold">Back to Home</span>}
          </button>

          {/* User Info & Sign Out */}
          <div
            className={`flex items-center gap-3 rounded-xl bg-white/5 p-3 ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#D4AF37] text-[#1A042B] flex items-center justify-center font-bold text-sm shrink-0">
              {profile.full_name?.charAt(0) || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{profile.full_name}</p>
                <p className="text-[10px] text-purple-300 truncate">{profile.email}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={signOut}
                title="Sign Out"
                className="p-1.5 rounded-lg text-purple-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-24 -right-3 w-6 h-6 rounded-full bg-[#2A0845] border-2 border-slate-100 text-white flex items-center justify-center hover:bg-[#3D105E] transition-colors cursor-pointer z-50 hidden lg:flex"
        >
          {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-[#1A042B] via-[#2A0845] to-[#1A042B] text-white flex flex-col animate-in slide-in-from-left duration-300">
            {/* Mobile Sidebar Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 ring-2 ring-[#D4AF37]/50 flex items-center justify-center p-1">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain rounded-lg" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm tracking-tight text-white leading-tight">
                    {settings.company_name}
                  </h2>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]">
                    Admin Portal
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 rounded-lg text-purple-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Sidebar Nav */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 cursor-pointer group ${
                      isActive
                        ? 'bg-[#D4AF37] text-[#1A042B] shadow-lg shadow-[#D4AF37]/20'
                        : 'text-purple-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        isActive ? 'text-[#1A042B]' : 'text-purple-400 group-hover:text-white'
                      }`}
                    />
                    <span className={`text-sm font-semibold flex-1 text-left ${isActive ? 'text-[#1A0845]' : ''}`}>
                      {item.label}
                    </span>
                    {item.count !== null && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center ${
                          isActive
                            ? 'bg-[#1A042B]/20 text-[#1A042B]'
                            : 'bg-white/10 text-purple-300'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Mobile Sidebar Footer */}
            <div className="p-3 border-t border-white/10 space-y-2">
              <button
                onClick={() => onNavigate ? onNavigate('home') : (window.location.href = '/')}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-purple-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              >
                <Home className="w-5 h-5 shrink-0" />
                <span className="text-sm font-semibold">Back to Home</span>
              </button>
              <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                <div className="w-9 h-9 rounded-full bg-[#D4AF37] text-[#1A042B] flex items-center justify-center font-bold text-sm shrink-0">
                  {profile.full_name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{profile.full_name}</p>
                  <p className="text-[10px] text-purple-300 truncate">{profile.email}</p>
                </div>
                <button
                  onClick={signOut}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-purple-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#2A0845] hover:bg-purple-50 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-[#2A0845] capitalize">
                {activeTab === 'overview' && 'Dashboard Overview'}
                {activeTab === 'properties' && 'Property Portfolio'}
                {activeTab === 'payments' && 'Payment Approvals'}
                {activeTab === 'reservations' && 'Reservations'}
                {activeTab === 'viewings' && 'Viewing Tours'}
                {activeTab === 'staff' && 'Agents & Staff'}
                {activeTab === 'settings' && 'Company Settings'}
                {activeTab === 'audit' && 'Audit Trail'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshData}
              title="Refresh Data"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-[#2A0845] hover:border-purple-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setEditingProperty(null);
                setPropertyModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2A0845] text-white font-bold text-xs hover:bg-[#3D105E] transition-all shadow-md shadow-purple-950/15 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span className="hidden sm:inline">Publish Property</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-[#2A0845] via-[#350B57] to-[#1A042B] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#4A1474]/30 blur-3xl pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-white/10 px-2.5 py-1 rounded-full">
                      Executive Dashboard
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                    Welcome back, {profile.full_name?.split(' ')[0] || 'Admin'}
                  </h2>
                  <p className="text-sm text-purple-200 mt-1">
                    Here's what's happening with {settings.company_name} today.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] font-medium text-purple-100">{totalProperties} Properties Live</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[11px] font-medium text-purple-100">{pendingPaymentsCount} Awaiting Review</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                      <span className="text-[11px] font-medium text-purple-100">{reservations.length} Reservations</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI Stats Cards */}
              {isLoading ? (
                <DashboardStatsSkeleton />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Revenue Card */}
                  <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          +Verified
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                      <p className="text-2xl font-extrabold text-[#2A0845] mt-1">{formatCurrency(totalVerifiedRevenue, currency, 'GHS')}</p>
                      <p className="text-[11px] text-slate-500 mt-2">
                        From {payments.filter((p) => p.status === 'SUCCESSFUL').length} completed transactions
                      </p>
                    </div>
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                      <button onClick={() => handleNavTab('payments')} className="text-[11px] font-bold text-[#2A0845] hover:text-[#3D105E] transition-colors cursor-pointer">
                        View Payment History &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Properties Card */}
                  <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#2A0845] flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Portfolio</span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Listings</p>
                      <p className="text-2xl font-extrabold text-[#2A0845] mt-1">{totalProperties}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{availableCount} Available
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{reservedCount} Reserved
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />{rentedCount} Rented
                        </span>
                      </div>
                    </div>
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                      <button onClick={() => handleNavTab('properties')} className="text-[11px] font-bold text-[#2A0845] hover:text-[#3D105E] transition-colors cursor-pointer">
                        Manage Portfolio &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Pending Payments Card */}
                  <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Clock className="w-5 h-5" />
                        </div>
                        {pendingPaymentsCount > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                            <AlertTriangle className="w-3 h-3" />Action
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Approvals</p>
                      <p className="text-2xl font-extrabold text-amber-600 mt-1">{pendingPaymentsCount}</p>
                      <p className="text-[11px] text-slate-500 mt-2">Payment proofs awaiting verification</p>
                    </div>
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                      <button onClick={() => handleNavTab('payments')} className="text-[11px] font-bold text-[#2A0845] hover:text-[#3D105E] transition-colors cursor-pointer">
                        Review Payment Proofs &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Viewing Tours Card */}
                  <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Eye className="w-5 h-5" />
                        </div>
                        {pendingViewingsCount > 0 && (
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                            {pendingViewingsCount} New
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Viewing Tours</p>
                      <p className="text-2xl font-extrabold text-sky-700 mt-1">{pendingViewingsCount}</p>
                      <p className="text-[11px] text-slate-500 mt-2">Scheduled property viewing requests</p>
                    </div>
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                      <button onClick={() => handleNavTab('viewings')} className="text-[11px] font-bold text-[#2A0845] hover:text-[#3D105E] transition-colors cursor-pointer">
                        Assign Agents &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Grid: Quick Actions + Property Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Action Hub */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-[#2A0845]">Quick Actions</h3>
                    <span className="text-[10px] text-slate-400 font-medium">Manage your enterprise</span>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => { setEditingProperty(null); setPropertyModalOpen(true); }}
                      className="group p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/60 hover:border-purple-300 hover:shadow-md text-left transition-all duration-200 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#2A0845] text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800">Publish Listing</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Add new property to portfolio</p>
                    </button>

                    <button
                      onClick={() => handleNavTab('payments')}
                      className="group p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 hover:border-amber-300 hover:shadow-md text-left transition-all duration-200 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800">Verify Payments</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Approve bank & MoMo transfers</p>
                    </button>

                    <button
                      onClick={() => handleNavTab('settings')}
                      className="group p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 hover:border-slate-300 hover:shadow-md text-left transition-all duration-200 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Settings className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800">Company Settings</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Banking & contact configuration</p>
                    </button>
                  </div>
                </div>

                {/* Property Status Distribution */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-extrabold text-sm text-[#2A0845]">Portfolio Status</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Status Bar */}
                    {totalProperties > 0 ? (
                      <>
                        <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                          <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(availableCount / totalProperties) * 100}%` }} />
                          <div className="bg-amber-500 transition-all duration-500" style={{ width: `${(reservedCount / totalProperties) * 100}%` }} />
                          <div className="bg-purple-500 transition-all duration-500" style={{ width: `${(rentedCount / totalProperties) * 100}%` }} />
                          <div className="bg-rose-400 transition-all duration-500" style={{ width: `${(soldCount / totalProperties) * 100}%` }} />
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: 'Available', count: availableCount, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
                            { label: 'Reserved', count: reservedCount, color: 'bg-amber-500', textColor: 'text-amber-700' },
                            { label: 'Rented', count: rentedCount, color: 'bg-purple-500', textColor: 'text-purple-700' },
                            { label: 'Sold', count: soldCount, color: 'bg-rose-400', textColor: 'text-rose-700' },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                                <span className="text-xs font-medium text-slate-600">{item.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-extrabold ${item.textColor}`}>{item.count}</span>
                                <span className="text-[10px] text-slate-400">
                                  ({totalProperties > 0 ? Math.round((item.count / totalProperties) * 100) : 0}%)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="py-6 text-center">
                        <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">No properties yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#2A0845]">Recent Reservations</h3>
                  <button onClick={() => handleNavTab('reservations')} className="text-[11px] font-bold text-[#2A0845] hover:text-[#3D105E] transition-colors cursor-pointer">
                    View All &rarr;
                  </button>
                </div>
                {reservations.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {reservations.slice(0, 5).map((res) => (
                      <div key={res.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            res.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600' :
                            res.status === 'PENDING_PAYMENT' ? 'bg-amber-50 text-amber-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{res.property?.title || 'Property'}</p>
                            <p className="text-[10px] text-slate-400">{res.customer_name} · {res.reference_no}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-xs font-bold text-[#2A0845]">{formatCurrency(res.total_amount, currency, res.currency)}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            res.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' :
                            res.status === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{res.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No reservations yet</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">Customer bookings will appear here</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROPERTY MANAGEMENT */}
          {activeTab === 'properties' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-lg text-[#2A0845]">Property Portfolio</h2>
                  <p className="text-xs text-slate-500">Manage all your property listings across Ghana</p>
                </div>
                <button
                  onClick={() => { setEditingProperty(null); setPropertyModalOpen(true); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A0845] text-white text-xs font-bold hover:bg-[#3D105E] transition-all shadow-md shadow-purple-950/15 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#D4AF37]" />
                  <span>Add Property</span>
                </button>
              </div>

              {/* Property Stats Bar */}
              {isLoading ? (
                <DashboardStatsSkeleton />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'Total', count: totalProperties, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' },
                    { label: 'Available', count: availableCount, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
                    { label: 'Reserved', count: reservedCount, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
                    { label: 'Rented', count: rentedCount, bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
                    { label: 'Sold', count: soldCount, bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
                  ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} ${stat.border} border rounded-xl p-3 text-center`}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${stat.dot}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</span>
                      </div>
                      <p className={`text-xl font-extrabold ${stat.text}`}>{stat.count}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Property Table */}
              {isLoading ? (
                <DashboardTableSkeleton columns={6} rows={6} />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  {/* Table Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#2A0845]" />
                      <h3 className="font-bold text-sm text-[#2A0845]">All Properties</h3>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{totalProperties}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-5 text-left">Property</th>
                          <th className="py-3.5 px-5 text-left">Type</th>
                          <th className="py-3.5 px-5 text-left">Location</th>
                          <th className="py-3.5 px-5 text-left">Price</th>
                          <th className="py-3.5 px-5 text-left">Status</th>
                          <th className="py-3.5 px-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80">
                        {properties.map((prop, idx) => (
                          <tr key={prop.id} className="hover:bg-purple-50/30 transition-colors group">
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-[10px] ${
                                  idx % 4 === 0 ? 'bg-gradient-to-br from-purple-500 to-purple-700' :
                                  idx % 4 === 1 ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                                  idx % 4 === 2 ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' :
                                  'bg-gradient-to-br from-sky-500 to-sky-700'
                                }`}>
                                  {(prop.property_type === 'luxury_home' || prop.property_type === 'townhouse' || prop.property_type === 'villa') ? '🏠' :
                                   (prop.property_type === 'flat' || prop.property_type === 'commercial_building') ? '🏢' :
                                   (prop.property_type.includes('land')) ? '🌍' :
                                   prop.property_type === 'office' ? '💼' :
                                   prop.property_type === 'store_shop' ? '🏪' :
                                   prop.property_type === 'warehouse' ? '🏭' :
                                   '🛏️'}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate max-w-[200px]">{prop.title}</div>
                                  <span className="font-mono text-[10px] text-purple-600 font-semibold">REF: {prop.reference_no}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold capitalize">
                                {prop.property_type.replace('_', ' ')}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-1 uppercase font-medium">For {prop.transaction_type}</div>
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                <span className="truncate max-w-[140px]">{prop.city}, {prop.region}</span>
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-extrabold text-sm text-[#2A0845]">
                                {formatCurrency(prop.price, currency, prop.currency)}
                              </span>
                            </td>
                            <td className="py-4 px-5">
                              <select
                                value={prop.status}
                                onChange={(e) => handleChangePropertyStatus(prop.id, e.target.value)}
                                className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                                  prop.status === 'AVAILABLE' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' :
                                  prop.status === 'RESERVED' ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' :
                                  prop.status === 'RENTED' ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' :
                                  'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                }`}
                              >
                                <option value="AVAILABLE">Available</option>
                                <option value="RESERVED">Reserved</option>
                                <option value="RENTED">Rented</option>
                                <option value="SOLD">Sold</option>
                              </select>
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => { setEditingProperty(prop); setPropertyModalOpen(true); }}
                                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-purple-50 hover:border-purple-200 hover:text-[#2A0845] transition-all cursor-pointer"
                                  title="Edit Listing"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProperty(prop.id)}
                                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all cursor-pointer"
                                  title="Delete Listing"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {properties.length === 0 && (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#2A0845] flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-base text-[#2A0845] mb-1">No Properties Yet</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Start building your portfolio by publishing your first property listing.
                      </p>
                      <button
                        onClick={() => { setEditingProperty(null); setPropertyModalOpen(true); }}
                        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A0845] text-white text-xs font-bold hover:bg-[#3D105E] transition-all shadow-md cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-[#D4AF37]" />
                        Publish First Property
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENT APPROVALS */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-lg text-[#2A0845]">Payment Approvals</h2>
                  <p className="text-xs text-slate-500">Verify bank deposits and Mobile Money transfers before confirming reservations.</p>
                </div>
              </div>

              {/* Stats Row */}
              {isLoading ? (
                <DashboardStatsSkeleton />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Pending Review', count: payments.filter((p) => p.status === 'PENDING' || p.status === 'VERIFYING').length, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
                    { label: 'Approved', count: payments.filter((p) => p.status === 'SUCCESSFUL').length, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
                    { label: 'Rejected', count: payments.filter((p) => p.status === 'FAILED').length, color: 'from-rose-500 to-pink-500', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: AlertTriangle },
                  ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} ${stat.border} border rounded-2xl p-5 flex items-center gap-4`}>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shrink-0 shadow-lg`}>
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                        <p className={`text-2xl font-extrabold ${stat.text}`}>{stat.count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isLoading ? (
                <DashboardTableSkeleton columns={7} rows={5} />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#2A0845]" />
                    <h3 className="font-bold text-sm text-[#2A0845]">Payment Queue</h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{payments.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-5 text-left">Transaction</th>
                          <th className="py-3.5 px-5 text-left">Property</th>
                          <th className="py-3.5 px-5 text-left">Customer</th>
                          <th className="py-3.5 px-5 text-left">Amount</th>
                          <th className="py-3.5 px-5 text-left">Proof</th>
                          <th className="py-3.5 px-5 text-left">Status</th>
                          <th className="py-3.5 px-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80">
                        {payments.map((pay) => (
                          <tr key={pay.id} className="hover:bg-purple-50/30 transition-colors group">
                            <td className="py-4 px-5">
                              <span className="font-mono font-bold text-slate-800 block">{pay.transaction_ref}</span>
                              <span className="text-[10px] text-slate-400 capitalize">{pay.payment_method.replace('_', ' ')}</span>
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-bold text-slate-800 block line-clamp-1 max-w-[160px]">
                                {pay.reservation?.property?.title || 'Reservation'}
                              </span>
                              <span className="text-[10px] text-purple-600 font-mono">{pay.reservation?.reference_no}</span>
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-semibold text-slate-800 block">{pay.reservation?.customer_name || 'Client'}</span>
                              <span className="text-[10px] text-slate-400">{pay.reservation?.customer_phone}</span>
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-extrabold text-sm text-[#2A0845]">{formatCurrency(pay.amount, currency, pay.currency)}</span>
                            </td>
                            <td className="py-4 px-5">
                              {pay.payment_proof_url ? (
                                <a
                                  href={pay.payment_proof_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-[11px] font-semibold transition-colors"
                                >
                                  <Eye className="w-3 h-3" />
                                  View Proof
                                </a>
                              ) : pay.bank_transaction_id ? (
                                <span className="font-mono text-[10px] text-slate-600 bg-slate-50 px-2 py-1 rounded-md">Ref: {pay.bank_transaction_id}</span>
                              ) : (
                                <span className="text-slate-300 text-[10px]">—</span>
                              )}
                            </td>
                            <td className="py-4 px-5">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                                pay.status === 'SUCCESSFUL' ? 'bg-emerald-100 text-emerald-700' :
                                pay.status === 'PENDING' || pay.status === 'VERIFYING' ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  pay.status === 'SUCCESSFUL' ? 'bg-emerald-500' :
                                  pay.status === 'PENDING' || pay.status === 'VERIFYING' ? 'bg-amber-500' :
                                  'bg-rose-500'
                                }`} />
                                {pay.status}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right">
                              {pay.status === 'PENDING' || pay.status === 'VERIFYING' ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleApprovePayment(pay.id)}
                                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectPayment(pay.id)}
                                    className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 font-bold text-[11px] hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Done
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {payments.length === 0 && (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-base text-slate-800 mb-1">No Payments Yet</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">Payment proofs from customers will appear here for your review.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RESERVATIONS */}
          {activeTab === 'reservations' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-lg text-[#2A0845]">Reservations</h2>
                  <p className="text-xs text-slate-500">Track and manage all customer property reservations.</p>
                </div>
              </div>

              {/* Stats Row */}
              {isLoading ? (
                <DashboardStatsSkeleton />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total', count: reservations.length, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' },
                    { label: 'Confirmed', count: reservations.filter((r) => r.status === 'CONFIRMED' || r.status === 'COMPLETED').length, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
                    { label: 'Pending', count: reservations.filter((r) => r.status === 'PENDING_PAYMENT' || r.status === 'PAYMENT_PROCESSING').length, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
                    { label: 'Cancelled', count: reservations.filter((r) => r.status === 'CANCELLED' || r.status === 'REJECTED' || r.status === 'EXPIRED').length, bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
                  ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} ${stat.border} border rounded-2xl p-4 text-center`}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${stat.dot}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</span>
                      </div>
                      <p className={`text-2xl font-extrabold ${stat.text}`}>{stat.count}</p>
                    </div>
                  ))}
                </div>
              )}

              {isLoading ? (
                <DashboardTableSkeleton columns={7} rows={5} />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#2A0845]" />
                    <h3 className="font-bold text-sm text-[#2A0845]">All Reservations</h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{reservations.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-5 text-left">Reference</th>
                          <th className="py-3.5 px-5 text-left">Property & Unit</th>
                          <th className="py-3.5 px-5 text-left">Customer</th>
                          <th className="py-3.5 px-5 text-left">Duration</th>
                          <th className="py-3.5 px-5 text-left">Total</th>
                          <th className="py-3.5 px-5 text-left">Status</th>
                          <th className="py-3.5 px-5 text-right">Manage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80">
                        {reservations.map((res) => (
                          <tr key={res.id} className="hover:bg-purple-50/30 transition-colors group">
                            <td className="py-4 px-5">
                              <span className="font-mono font-bold text-slate-800">{res.reference_no}</span>
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-bold text-slate-800 block line-clamp-1 max-w-[160px]">{res.property?.title}</span>
                              {res.unit?.unit_name && (
                                <span className="text-[10px] text-purple-600">Unit: {res.unit.unit_name}</span>
                              )}
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-semibold text-slate-800 block">{res.customer_name}</span>
                              <span className="text-[10px] text-slate-400">{res.customer_phone}</span>
                            </td>
                            <td className="py-4 px-5 text-slate-600">
                              {res.start_date ? (
                                <div>
                                  <span className="block font-medium">{res.start_date}</span>
                                  <span className="text-[10px] text-slate-400">to {res.end_date || 'Open'}</span>
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-extrabold text-sm text-[#2A0845]">{formatCurrency(res.total_amount, currency, res.currency)}</span>
                            </td>
                            <td className="py-4 px-5">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                                res.status === 'CONFIRMED' || res.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                res.status === 'PENDING_PAYMENT' || res.status === 'PAYMENT_PROCESSING' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  res.status === 'CONFIRMED' || res.status === 'COMPLETED' ? 'bg-emerald-500' :
                                  res.status === 'PENDING_PAYMENT' || res.status === 'PAYMENT_PROCESSING' ? 'bg-amber-500' :
                                  'bg-slate-400'
                                }`} />
                                {res.status}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <select
                                value={res.status}
                                onChange={(e) => {
                                  updateReservationStatus(res.id, e.target.value as any, profile.id);
                                  onRefreshData();
                                }}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white hover:border-purple-300 focus:ring-2 focus:ring-[#2A0845]/10 focus:border-[#2A0845] transition-all cursor-pointer"
                              >
                                <option value="PENDING_PAYMENT">Pending Payment</option>
                                <option value="PAYMENT_PROCESSING">Payment Processing</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="EXPIRED">Expired</option>
                                <option value="REJECTED">Rejected</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {reservations.length === 0 && (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-base text-slate-800 mb-1">No Reservations Yet</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">Customer reservations will appear here once they start booking properties.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VIEWING TOURS */}
          {activeTab === 'viewings' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-lg text-[#2A0845]">Viewing Tours</h2>
                  <p className="text-xs text-slate-500">Manage property viewing appointments and assign agents.</p>
                </div>
              </div>

              {/* Stats Row */}
              {isLoading ? (
                <DashboardStatsSkeleton />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Requested', count: viewings.filter((v) => v.status === 'REQUESTED').length, bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
                    { label: 'Confirmed', count: viewings.filter((v) => v.status === 'CONFIRMED').length, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
                    { label: 'Completed', count: viewings.filter((v) => v.status === 'COMPLETED').length, bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', dot: 'bg-sky-500' },
                  ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} ${stat.border} border rounded-2xl p-4 text-center`}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${stat.dot}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</span>
                      </div>
                      <p className={`text-2xl font-extrabold ${stat.text}`}>{stat.count}</p>
                    </div>
                  ))}
                </div>
              )}

              {isLoading ? (
                <DashboardTableSkeleton columns={6} rows={5} />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#2A0845]" />
                    <h3 className="font-bold text-sm text-[#2A0845]">Viewing Appointments</h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{viewings.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-5 text-left">Schedule</th>
                          <th className="py-3.5 px-5 text-left">Property</th>
                          <th className="py-3.5 px-5 text-left">Customer</th>
                          <th className="py-3.5 px-5 text-left">Agent</th>
                          <th className="py-3.5 px-5 text-left">Status</th>
                          <th className="py-3.5 px-5 text-right">Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80">
                        {viewings.map((viewing) => (
                          <tr key={viewing.id} className="hover:bg-purple-50/30 transition-colors group">
                            <td className="py-4 px-5">
                              <span className="font-bold text-slate-800 block">{viewing.preferred_date}</span>
                              <span className="text-[10px] text-slate-400">{viewing.preferred_time}</span>
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-bold text-[#2A0845] block line-clamp-1 max-w-[150px]">{viewing.property?.title}</span>
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-semibold text-slate-800 block">{viewing.customer_name}</span>
                              <span className="text-[10px] text-slate-400">{viewing.customer_phone}</span>
                            </td>
                            <td className="py-4 px-5">
                              {viewing.agent?.full_name ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-[#2A0845] text-[#D4AF37] flex items-center justify-center font-bold text-[10px] shrink-0">
                                    {viewing.agent.full_name.charAt(0)}
                                  </div>
                                  <span className="text-slate-700 font-medium">{viewing.agent.full_name}</span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 text-[10px] font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                  Unassigned
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-5">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                                viewing.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' :
                                viewing.status === 'COMPLETED' ? 'bg-sky-100 text-sky-700' :
                                viewing.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  viewing.status === 'CONFIRMED' ? 'bg-emerald-500' :
                                  viewing.status === 'COMPLETED' ? 'bg-sky-500' :
                                  viewing.status === 'CANCELLED' ? 'bg-rose-500' :
                                  'bg-purple-500'
                                }`} />
                                {viewing.status}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <select
                                value={viewing.status}
                                onChange={(e) => {
                                  updateViewingStatus(viewing.id, e.target.value as any, profile.id);
                                  onRefreshData();
                                }}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white hover:border-purple-300 focus:ring-2 focus:ring-[#2A0845]/10 focus:border-[#2A0845] transition-all cursor-pointer"
                              >
                                <option value="REQUESTED">Requested</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {viewings.length === 0 && (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4">
                        <Eye className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-base text-slate-800 mb-1">No Viewing Tours</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">Scheduled property viewing requests from customers will appear here.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: STAFF & AGENTS */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-lg text-[#2A0845]">Agents & Staff</h2>
                  <p className="text-xs text-slate-500">Manage team members and their access roles.</p>
                </div>
              </div>

              {/* Stats Row */}
              {loadingStaff ? (
                <DashboardStatsSkeleton />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Staff', count: staffList.length, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' },
                    { label: 'Company Owners', count: staffList.filter((s) => s.role === 'company_owner_admin').length, bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
                    { label: 'Agents', count: staffList.filter((s) => s.role === 'agent').length, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
                  ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} ${stat.border} border rounded-2xl p-4 text-center`}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${stat.dot}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</span>
                      </div>
                      <p className={`text-2xl font-extrabold ${stat.text}`}>{stat.count}</p>
                    </div>
                  ))}
                </div>
              )}

              {loadingStaff ? (
                <StaffTableSkeleton rows={4} />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2A0845]" />
                    <h3 className="font-bold text-sm text-[#2A0845]">Team Roster</h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{staffList.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-5 text-left">Member</th>
                          <th className="py-3.5 px-5 text-left">Role</th>
                          <th className="py-3.5 px-5 text-left">Contact</th>
                          <th className="py-3.5 px-5 text-left">Phone</th>
                          <th className="py-3.5 px-5 text-right">Change Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80">
                        {staffList.map((member) => (
                          <tr key={member.id} className="hover:bg-purple-50/30 transition-colors group">
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  member.role === 'company_owner_admin'
                                    ? 'bg-gradient-to-br from-[#2A0845] to-[#3D105E] text-[#D4AF37]'
                                    : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                                }`}>
                                  {member.full_name?.charAt(0) || 'U'}
                                </div>
                                <span className="font-bold text-slate-800">{member.full_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                                member.role === 'company_owner_admin'
                                  ? 'bg-purple-100 text-[#2A0845]'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  member.role === 'company_owner_admin' ? 'bg-purple-500' : 'bg-amber-500'
                                }`} />
                                {member.role === 'company_owner_admin' ? 'Company Owner' : 'Agent / Staff'}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-slate-600">{member.email}</td>
                            <td className="py-4 px-5 text-slate-600">{member.phone || '—'}</td>
                            <td className="py-4 px-5 text-right">
                              <select
                                value={member.role}
                                onChange={async (e) => {
                                  await updateUserRole(member.id, e.target.value as any, profile.id);
                                  fetchStaffProfiles().then((list) => setStaffList(list));
                                }}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white hover:border-purple-300 focus:ring-2 focus:ring-[#2A0845]/10 focus:border-[#2A0845] transition-all cursor-pointer"
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
                  </div>

                  {staffList.length === 0 && (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-base text-slate-800 mb-1">No Staff Members</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">Team members and agents will appear here once added.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: COMPANY SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-lg text-[#2A0845]">Enterprise Company Settings</h2>
                  <p className="text-xs text-slate-500">
                    Configure corporate identity, contact channels, and official payment accounts.
                  </p>
                </div>
                {settingsSavedMessage && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold animate-in fade-in slide-in-from-right-2 duration-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{settingsSavedMessage}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Company Identity Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-50/50 border-b border-purple-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#2A0845] text-[#D4AF37] flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#2A0845]">Company Identity</h3>
                      <p className="text-[11px] text-slate-500">Registered name, brand, and tagline</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Company Registered Name
                        </label>
                        <input
                          type="text"
                          required
                          value={settingsForm.company_name}
                          onChange={(e) => setSettingsForm({ ...settingsForm, company_name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845] transition-all"
                          placeholder="e.g. Adibex Prestige Enterprise"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Brand Name
                        </label>
                        <input
                          type="text"
                          required
                          value={settingsForm.brand_name}
                          onChange={(e) => setSettingsForm({ ...settingsForm, brand_name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-[#2A0845] focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845] transition-all"
                          placeholder="e.g. Adibex Prestige"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Official Motto
                        </label>
                        <input
                          type="text"
                          required
                          value={settingsForm.motto}
                          onChange={(e) => setSettingsForm({ ...settingsForm, motto: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm italic text-slate-700 focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845] transition-all"
                          placeholder="e.g. Your Vision Our Mission"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Head Office Address
                        </label>
                        <input
                          type="text"
                          required
                          value={settingsForm.address}
                          onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845] transition-all"
                          placeholder="e.g. 123 Oxford Street, Osu, Accra"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Channels Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-amber-50/50 border-b border-amber-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">Contact Channels</h3>
                      <p className="text-[11px] text-slate-500">Phone, WhatsApp, and email for client outreach</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            value={settingsForm.phone}
                            onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                            placeholder="+233 24 000 0000"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          WhatsApp
                        </label>
                        <div className="relative">
                          <MessageCircle className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            value={settingsForm.whatsapp}
                            onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                            placeholder="+233 24 000 0000"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            value={settingsForm.email}
                            onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                            placeholder="info@adibex.com"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Account Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-emerald-50/50 border-b border-emerald-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">Corporate Bank Account</h3>
                      <p className="text-[11px] text-slate-500">For direct wire, cheque, and cash deposit payments</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={settingsForm.bank_name}
                          onChange={(e) => setSettingsForm({ ...settingsForm, bank_name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          placeholder="e.g. GCB Bank PLC"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Account Name
                        </label>
                        <input
                          type="text"
                          value={settingsForm.bank_account_name}
                          onChange={(e) => setSettingsForm({ ...settingsForm, bank_account_name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          placeholder="e.g. Adibex Prestige Enterprise"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={settingsForm.bank_account_number}
                          onChange={(e) => setSettingsForm({ ...settingsForm, bank_account_number: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          placeholder="000 000 000 000 000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Branch
                        </label>
                        <input
                          type="text"
                          value={settingsForm.bank_branch}
                          onChange={(e) => setSettingsForm({ ...settingsForm, bank_branch: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          placeholder="e.g. Osu Branch"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Money Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-sky-50 to-sky-50/50 border-b border-sky-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">Mobile Money Merchant</h3>
                      <p className="text-[11px] text-slate-500">MTN, Telecel, or AirtelTigo MoMo merchant account</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          MoMo Network
                        </label>
                        <select
                          value={settingsForm.momo_network}
                          onChange={(e) => setSettingsForm({ ...settingsForm, momo_network: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white"
                        >
                          <option value="">Select Network</option>
                          <option value="MTN">MTN Mobile Money</option>
                          <option value="Telecel">Telecel (Vodafone) MoMo</option>
                          <option value="AirtelTigo">AirtelTigo Money</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Merchant Number
                        </label>
                        <input
                          type="text"
                          value={settingsForm.momo_number}
                          onChange={(e) => setSettingsForm({ ...settingsForm, momo_number: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                          placeholder="024 000 0000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Account Name
                        </label>
                        <input
                          type="text"
                          value={settingsForm.momo_account_name}
                          onChange={(e) => setSettingsForm({ ...settingsForm, momo_account_name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                          placeholder="e.g. Adibex Prestige"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reservation Settings Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-rose-50 to-rose-50/50 border-b border-rose-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">Reservation Policy</h3>
                      <p className="text-[11px] text-slate-500">Auto-expire unconfirmed reservations after timeout</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Expiry Time (Minutes)
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
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-end">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Reservations will automatically expire if payment is not confirmed within this timeframe. Recommended: 30–60 minutes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSettingsForm(settings)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Reset Changes
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2A0845] text-white font-bold text-xs hover:bg-[#3D105E] transition-all shadow-md shadow-purple-950/15 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                    <span>Save Company Settings</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 8: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-lg text-[#2A0845]">Audit Trail</h2>
                  <p className="text-xs text-slate-500">Immutable security logs tracking all critical enterprise actions.</p>
                </div>
              </div>

              {/* Info Banner */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#2A0845]/5 to-purple-50/50 border border-[#2A0845]/10">
                <div className="w-9 h-9 rounded-xl bg-[#2A0845] text-[#D4AF37] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#2A0845]">Enterprise Security Logging</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">All records are immutable and stored in PostgreSQL. Tracks logins, property changes, payment approvals, and role modifications.</p>
                </div>
              </div>

              {loadingAudit ? (
                <DashboardTableSkeleton columns={5} rows={6} />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#2A0845]" />
                    <h3 className="font-bold text-sm text-[#2A0845]">System Logs</h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{auditLogs.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-5 text-left">Timestamp</th>
                          <th className="py-3.5 px-5 text-left">Action</th>
                          <th className="py-3.5 px-5 text-left">Actor</th>
                          <th className="py-3.5 px-5 text-left">User</th>
                          <th className="py-3.5 px-5 text-left">Entity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-purple-50/30 transition-colors group">
                            <td className="py-3.5 px-5 text-slate-500 font-mono text-[11px]">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                log.action.includes('LOGIN') ? 'bg-emerald-100 text-emerald-700' :
                                log.action.includes('LOGOUT') ? 'bg-slate-100 text-slate-600' :
                                log.action.includes('DELETE') || log.action.includes('REJECT') ? 'bg-rose-100 text-rose-700' :
                                log.action.includes('APPROVE') || log.action.includes('CONFIRM') ? 'bg-blue-100 text-blue-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                log.user_role === 'company_owner_admin' ? 'bg-purple-50 text-purple-700' :
                                log.user_role === 'agent' ? 'bg-amber-50 text-amber-700' :
                                'bg-slate-50 text-slate-600'
                              }`}>
                                {log.user_role}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-slate-600">{log.user_email || 'System'}</td>
                            <td className="py-3.5 px-5">
                              <span className="text-slate-500 font-medium">{log.entity_type}</span>
                              {log.entity_id && (
                                <span className="text-[10px] text-slate-300 font-mono ml-1">({log.entity_id.substring(0, 8)})</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {auditLogs.length === 0 && (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-base text-slate-800 mb-1">No Audit Logs</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">System activity logs will appear here as actions are performed.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
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
