import React from 'react';
import { Phone, Mail, MapPin, MessageCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { CompanySettings } from '../../types';

interface FooterProps {
  settings: CompanySettings;
  onNavigate: (view: string, data?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate }) => {
  const whatsappUrl = `https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
    'Hello ADIBEX PRESTIGE PROPERTIES, I would like to inquire about your available properties.'
  )}`;

  return (
    <footer className="bg-[#1A042B] text-white border-t-4 border-[#D4AF37] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-purple-900/60">
          {/* Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2A0845] to-[#451368] flex items-center justify-center shadow-lg shadow-purple-950/30 ring-2 ring-[#D4AF37]/60 ring-offset-1 ring-offset-[#1A042B] p-1">
                <img src="/logo.png" alt="ADIBEX PRESTIGE Logo" className="w-full h-full object-contain rounded-md" />
              </div>
              <div>
                <h3 className="font-extrabold text-base tracking-wide text-white">ADIBEX PRESTIGE</h3>
                <p className="text-[10px] font-bold text-[#D4AF37] tracking-widest uppercase">PROPERTIES</p>
              </div>
            </div>
            <p className="text-xs italic text-[#D4AF37] font-semibold">"{settings.motto}"</p>
            <p className="text-xs text-purple-200/80 leading-relaxed">
              Ghana's premier real estate, housing, and property management enterprise. Discover verified rooms, luxury apartments, executive houses, stores, offices, commercial spaces, and registered lands.
            </p>
            <div className="pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white font-bold text-xs hover:bg-[#20bd5a] transition-all shadow-md shadow-emerald-950/20"
              >
                <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Property Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-4">
              Property Categories
            </h4>
            <ul className="space-y-2 text-xs text-purple-200">
              <li>
                <button
                  onClick={() => onNavigate('search', { property_type: 'single_room' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Single & Self-Contained Rooms
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('search', { property_type: 'apartment' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Flats & Apartments
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('search', { property_type: 'house' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Houses, Villas & Luxury Homes
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('search', { property_type: 'store_shop' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Stores & Commercial Shops
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('search', { property_type: 'office' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Executive Office Spaces
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('search', { category: 'land' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Residential & Commercial Land
                </button>
              </li>
            </ul>
          </div>

          {/* Quick Links & Portals */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-purple-200">
              <li>
                <button
                  onClick={() => onNavigate('search', { transaction_type: 'RENT' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Properties for Rent (Ghana & Worldwide)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('search', { transaction_type: 'SALE' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Properties for Outright Sale
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('search', { transaction_type: 'LEASE' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Long-Term Commercial Lease
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('how_it_works')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Booking & Reservation Guide
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('portal', { tab: 'payments' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Bank & Mobile Money Payments
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Banking Info */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-4">
              Headquarters & Contact
            </h4>
            <div className="space-y-3 text-xs text-purple-200">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>{settings.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <a href={`tel:${settings.phone}`} className="hover:text-white">
                  {settings.phone}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <a href={`mailto:${settings.email}`} className="hover:text-white">
                  {settings.email}
                </a>
              </div>
              <div className="pt-2">
                <div className="p-3 rounded-xl bg-purple-950/70 border border-purple-800/60 text-[11px] text-purple-200">
                  <div className="font-semibold text-white flex items-center gap-1 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                    Official Payment Channels
                  </div>
                  <p>Bank: {settings.bank_name}</p>
                  <p>MoMo: {settings.momo_network} ({settings.momo_number})</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-purple-300/80">
          <div>
            &copy; {new Date().getFullYear()} <span className="text-white font-semibold">{settings.company_name}</span>. Brand Identity <span className="text-[#D4AF37] font-semibold">{settings.brand_name}</span>. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>Motto: <strong className="text-white">Your Vision Our Mission</strong></span>
            <span>Accra, Ghana</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
