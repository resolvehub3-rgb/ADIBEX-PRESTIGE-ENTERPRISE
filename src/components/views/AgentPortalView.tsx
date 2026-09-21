import React, { useState } from 'react';
import {
  Briefcase,
  Building,
  Calendar,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  Plus,
  ExternalLink,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  Property,
  Reservation,
  ViewingAppointment,
  CurrencyCode,
  CompanySettings,
} from '../../types';
import { formatCurrency, updateViewingStatus } from '../../lib/db';
import { PropertyFormModal } from '../modals/PropertyFormModal';
import { DashboardTableSkeleton, PropertyListSkeleton } from '../common/Skeletons';

interface AgentPortalViewProps {
  properties: Property[];
  viewings: ViewingAppointment[];
  reservations: Reservation[];
  settings: CompanySettings;
  currency: CurrencyCode;
  isLoading?: boolean;
  onRefreshData: () => void;
  onSelectProperty: (property: Property) => void;
  onOpenAuth?: () => void;
}

export const AgentPortalView: React.FC<AgentPortalViewProps> = ({
  properties,
  viewings,
  reservations,
  settings,
  currency,
  isLoading = false,
  onRefreshData,
  onSelectProperty,
  onOpenAuth,
}) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'assigned_properties' | 'viewings' | 'reservations'>(
    'viewings'
  );
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);

  // If user is not agent or owner, show staff gate
  if (profile?.role !== 'agent' && profile?.role !== 'company_owner_admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-purple-100 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <Briefcase className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#2A0845]">Agent & Staff Portal Access</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            This portal is reserved for registered real estate agents and field staff of{' '}
            <strong>{settings.company_name}</strong>.
          </p>
          {profile && (
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-700">
              Signed in as: <strong>{profile.email}</strong> ({profile.role})
            </div>
          )}
          <button
            onClick={onOpenAuth}
            className="w-full py-3 rounded-xl bg-[#2A0845] text-white font-bold text-xs hover:bg-[#3D105E] transition-all cursor-pointer"
          >
            Sign In with Staff Account
          </button>
        </div>
      </div>
    );
  }

  // Filter items assigned to this agent (or show all if owner)
  const isOwner = profile.role === 'company_owner_admin';
  const myProperties = isOwner
    ? properties
    : properties.filter((p) => p.assigned_agent_id === profile.id);
  const myViewings = isOwner
    ? viewings
    : viewings.filter((v) => v.assigned_agent_id === profile.id || !v.assigned_agent_id);
  const myReservations = isOwner
    ? reservations
    : reservations.filter((r) => r.property?.assigned_agent_id === profile.id);

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2A0845] to-[#3D105E] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4AF37] bg-white/10 px-2 py-0.5 rounded-sm">
                Property Agent Desk
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {profile.full_name}
              </h1>
              <p className="text-xs text-purple-200">
                ADIBEX PRESTIGE ENTERPRISE • Field Agent & Property Specialist
              </p>
            </div>
          </div>

          <button
            onClick={() => setPropertyModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#2A0845] font-extrabold text-xs tracking-wider uppercase hover:bg-[#e0be4d] transition-all shadow-md shadow-black/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>List New Property</span>
          </button>
        </div>

        {/* Tab Nav */}
        <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('viewings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'viewings' ? 'bg-[#2A0845] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-[#D4AF37]" />
            <span>Tour Appointments ({myViewings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('assigned_properties')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'assigned_properties'
                ? 'bg-[#2A0845] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4 text-[#D4AF37]" />
            <span>My Listings ({myProperties.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reservations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'reservations'
                ? 'bg-[#2A0845] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4 text-[#D4AF37]" />
            <span>Reservations on My Listings ({myReservations.length})</span>
          </button>
        </div>

        {/* TAB: VIEWINGS */}
        {activeTab === 'viewings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-lg text-[#2A0845]">Viewing Tour Appointments</h2>
            {isLoading ? (
              <DashboardTableSkeleton columns={5} rows={4} />
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 text-left">Schedule</th>
                      <th className="py-3 px-4 text-left">Property</th>
                      <th className="py-3 px-4 text-left">Customer</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-right">Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myViewings.map((v) => (
                      <tr key={v.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{v.preferred_date}</span>
                          <span className="text-[10px] text-slate-500">{v.preferred_time}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-purple-900">{v.property?.title}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold block">{v.customer_name}</span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <a href={`tel:${v.customer_phone}`} className="text-purple-700 hover:underline">
                              {v.customer_phone}
                            </a>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              v.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select
                            value={v.status}
                            onChange={async (e) => {
                              await updateViewingStatus(v.id, e.target.value as any, profile.id);
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

                {myViewings.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No viewing appointments assigned yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: PROPERTIES */}
        {activeTab === 'assigned_properties' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-lg text-[#2A0845]">Assigned Properties</h2>
            {isLoading ? (
              <PropertyListSkeleton count={6} />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myProperties.map((prop) => (
                    <div
                      key={prop.id}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-[#D4AF37] transition-all bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {prop.reference_no}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          {prop.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{prop.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {prop.city}, {prop.region}
                      </p>
                      <div className="font-extrabold text-sm text-[#2A0845] mt-2">
                        {formatCurrency(prop.price, currency, prop.currency)}
                      </div>
                      <button
                        onClick={() => onSelectProperty(prop)}
                        className="mt-3 w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#2A0845] font-bold text-xs transition-colors cursor-pointer"
                      >
                        View Listing Details
                      </button>
                    </div>
                  ))}
                </div>

                {myProperties.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No properties assigned to your account yet.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB: RESERVATIONS */}
        {activeTab === 'reservations' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-lg text-[#2A0845]">Reservations on Assigned Listings</h2>
            {isLoading ? (
              <DashboardTableSkeleton columns={5} rows={4} />
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 text-left">Reservation Ref</th>
                      <th className="py-3 px-4 text-left">Property</th>
                      <th className="py-3 px-4 text-left">Customer</th>
                      <th className="py-3 px-4 text-left">Amount</th>
                      <th className="py-3 px-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {res.reference_no}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{res.property?.title}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold block">{res.customer_name}</span>
                          <span className="text-[10px] text-slate-400">{res.customer_phone}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-purple-900">
                          {formatCurrency(res.total_amount, currency, res.currency)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                            {res.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {myReservations.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No customer reservations recorded on your listings yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <PropertyFormModal
        isOpen={propertyModalOpen}
        onClose={() => setPropertyModalOpen(false)}
        onSuccess={onRefreshData}
      />
    </div>
  );
};
