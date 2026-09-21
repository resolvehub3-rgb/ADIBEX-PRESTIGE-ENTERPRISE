import React, { useState } from 'react';
import { X, Calendar, Clock, Users, Phone, Mail, User, MessageSquare, CheckCircle2, Shield } from 'lucide-react';
import { Property, UserProfile } from '../../types';
import { createViewingAppointment } from '../../lib/db';

interface ViewingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  userProfile?: UserProfile | null;
  onSuccess?: () => void;
}

export const ViewingRequestModal: React.FC<ViewingRequestModalProps> = ({
  isOpen,
  onClose,
  property,
  userProfile,
  onSuccess,
}) => {
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('10:00 AM - 12:00 PM');
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [customerName, setCustomerName] = useState(userProfile?.full_name || '');
  const [customerEmail, setCustomerEmail] = useState(userProfile?.email || '');
  const [customerPhone, setCustomerPhone] = useState(userProfile?.phone || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!userProfile?.id) {
        setError('Please sign in or register an account to schedule an in-person viewing appointment.');
        setLoading(false);
        return;
      }

      const res = await createViewingAppointment({
        property_id: property.id,
        customer_id: userProfile.id,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        number_of_people: numberOfPeople,
        message: message || null,
        assigned_agent_id: property.assigned_agent_id || null,
      });

      if (!res.success) {
        setError(res.error || 'Failed to submit viewing request');
      } else {
        setSubmitted(true);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Error scheduling viewing appointment');
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-purple-100 flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#2A0845] to-[#3D105E] text-white flex items-center justify-between">
          <div>
            <span className="text-[#D4AF37] font-extrabold tracking-widest text-[10px] uppercase">
              Schedule An In-Person Tour
            </span>
            <h3 className="font-bold text-lg text-white mt-0.5">Request Property Viewing</h3>
            <p className="text-xs text-purple-200 line-clamp-1">{property.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-lg text-[#2A0845]">Viewing Appointment Requested!</h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Thank you, <strong className="text-slate-800">{customerName}</strong>. Our designated agent will review your requested viewing for{' '}
              <strong className="text-slate-800">{preferredDate}</strong> ({preferredTime}) and confirm via phone / email.
            </p>
            <div className="pt-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#2A0845] text-white font-semibold text-xs hover:bg-[#3D105E] transition-all cursor-pointer"
              >
                Close & Return
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-700 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    required
                    min={minDate}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Time Slot *
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                  >
                    <option>09:00 AM - 11:00 AM</option>
                    <option>11:00 AM - 01:00 PM</option>
                    <option>02:00 PM - 04:00 PM</option>
                    <option>04:00 PM - 06:00 PM</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Number of People Attending
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={numberOfPeople}
                  onChange={(e) => setNumberOfPeople(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Kwame Asante"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="+233 24 123 4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="kwame@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes or Specific Questions
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <textarea
                  rows={2}
                  placeholder="e.g. Inquiring about water pressure, parking, or tenancy contract terms..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845]"
                />
              </div>
            </div>

            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex items-start gap-2 text-[11px] text-[#2A0845]">
              <Shield className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <span>
                Adibex Prestige viewing policy: All tours are guided by a licensed agent. Please bring a valid ID. No viewing fees are charged.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#2A0845] text-white font-bold text-xs tracking-wider uppercase hover:bg-[#3D105E] transition-all shadow-md shadow-purple-900/20 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Submitting Request...' : 'Confirm Viewing Appointment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
