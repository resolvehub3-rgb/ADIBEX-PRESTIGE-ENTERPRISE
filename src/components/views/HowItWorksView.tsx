import React from 'react';
import {
  ShieldCheck,
  Search,
  Calendar,
  CreditCard,
  Key,
  Globe,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Building2,
  FileCheck,
} from 'lucide-react';
import { CompanySettings } from '../../types';

interface HowItWorksViewProps {
  settings: CompanySettings;
  onNavigate: (view: string, data?: any) => void;
}

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({ settings, onNavigate }) => {
  const steps = [
    {
      number: '01',
      title: 'Search & Compare Verified Properties',
      description:
        'Browse our live catalog of single rooms, apartments, executive houses, stores, corporate offices, and litigation-free lands across Greater Accra, Ashanti, and other Ghana regions. Filter by exact budget, category, and furnishing status.',
      icon: Search,
    },
    {
      number: '02',
      title: 'Schedule an Agent-Guided In-Person Tour',
      description:
        'Select your preferred date and time slot. A licensed Adibex Prestige property agent will meet you at the site to conduct a thorough walkthrough and answer questions about facilities, water, and neighborhood.',
      icon: Calendar,
    },
    {
      number: '03',
      title: 'Lock Your Unit with Real-Time Reservation',
      description:
        'When you find the right property, select your specific room or unit. Our system locks the unit in real-time with an active reservation window to prevent double-booking while you complete payment.',
      icon: ShieldCheck,
    },
    {
      number: '04',
      title: 'Secure Online or Direct Bank Payment',
      description:
        'Pay with Ghana Mobile Money (MTN / Telecel), debit/credit card, or transfer directly to the official corporate bank account at GCB Bank. Upload your slip or MoMo transaction ID for instant verification.',
      icon: CreditCard,
    },
    {
      number: '05',
      title: 'Official Receipt & Tenancy Handover',
      description:
        'Receive an authenticated digital receipt and tenancy agreement contract. Meet with our company management for physical key handover or site demarcation inspection for lands.',
      icon: Key,
    },
  ];

  const faqs = [
    {
      q: 'Can I reserve and pay for a property if I live outside Ghana (Diaspora)?',
      a: 'Yes! International clients in the UK, USA, Canada, Europe, and worldwide can view 360° virtual tours, switch pricing to USD/GBP/EUR, reserve units online, and pay securely via card or direct international wire transfer.',
    },
    {
      q: 'Are all listed lands litigation-free and registered?',
      a: 'Yes. ADIBEX PRESTIGE ENTERPRISE performs comprehensive title search and cadastral site inspections with the Lands Commission before publishing any land listing.',
    },
    {
      q: 'How does the Double-Booking Guard work?',
      a: 'When you initiate a reservation on an available unit or room, our PostgreSQL database immediately locks the unit with an expiration countdown. No other customer can check out that specific unit during your reservation period.',
    },
    {
      q: 'What happens after I submit a manual bank deposit slip?',
      a: 'Our Company Owner/Admin accounting team reviews your deposit reference or screenshot in the management queue and approves it, immediately changing your reservation to CONFIRMED and issuing an official corporate receipt.',
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-12 space-y-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A0845] text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Process & Diaspora Guide</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2A0845] tracking-tight">
            How ADIBEX PRESTIGE PROPERTIES Works
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            From initial search to viewing, reservation lock, and final tenancy key handover — a secure, transparent, and hassle-free real estate experience.
          </p>
        </div>

        {/* 5-Step Process Cards */}
        <div className="space-y-4">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={s.number}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start gap-6 hover:border-[#D4AF37] transition-all"
              >
                <div className="flex items-center gap-4 sm:flex-col sm:items-center shrink-0">
                  <span className="text-3xl font-extrabold text-[#D4AF37] font-mono">{s.number}</span>
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#2A0845] flex items-center justify-center border border-purple-100">
                    <Icon className="w-6 h-6 text-[#2A0845]" />
                  </div>
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base sm:text-lg font-extrabold text-[#2A0845]">{s.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{s.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Diaspora Highlights */}
        <div className="bg-gradient-to-r from-[#2A0845] to-[#3D105E] rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 border border-[#D4AF37]/30">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
              <Globe className="w-4 h-4" />
              <span>International & Diaspora Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Securing Real Estate in Ghana from Abroad?
            </h2>
            <p className="text-xs sm:text-sm text-purple-200 leading-relaxed">
              We specialize in assisting Ghanaians in the diaspora and foreign investors. Enjoy live video tours, multi-currency pricing (USD, GBP, EUR, GHS), official company agreements, and transparent bank transfers.
            </p>
          </div>

          <button
            onClick={() => onNavigate('search')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-[#2A0845] font-extrabold text-xs tracking-wider uppercase hover:bg-[#e0be4d] transition-all shadow-md shadow-black/20 shrink-0 cursor-pointer"
          >
            <span>Explore Properties</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* FAQs */}
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl font-extrabold text-[#2A0845]">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500">Answers to common customer and tenant inquiries</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-2">
                <h4 className="font-bold text-sm text-[#2A0845] flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
