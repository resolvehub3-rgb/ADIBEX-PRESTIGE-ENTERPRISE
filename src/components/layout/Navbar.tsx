import React, { useState } from 'react';
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  LayoutDashboard,
  Calendar,
  CreditCard,
  Briefcase,
  Globe,
  Heart,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CurrencyCode, CURRENCY_SYMBOLS } from '../../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, data?: any) => void;
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  favoritesCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  selectedCurrency,
  onCurrencyChange,
  favoritesCount = 0,
}) => {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  const currencies: CurrencyCode[] = ['GHS', 'USD', 'GBP', 'EUR'];

  const handleNav = (view: string, data?: any) => {
    onNavigate(view, data);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Branding */}
          <div
            onClick={() => handleNav('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2A0845] to-[#451368] flex items-center justify-center shadow-lg shadow-purple-950/30 ring-2 ring-[#D4AF37]/50 ring-offset-1 ring-offset-white group-hover:scale-105 transition-transform p-1.5">
              <img src="/logo.png" alt="ADIBEX PRESTIGE Logo" className="w-full h-full object-contain rounded-md" />
            </div>
            <div className="flex flex-col justify-center leading-tight">
              <span className="font-extrabold text-lg tracking-tight text-[#2A0845] group-hover:text-[#3B1259] transition-colors">
                ADIBEX PRESTIGE
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#2A0845] px-1.5 py-0.5 rounded-sm w-fit">
                PROPERTIES
              </span>
              <p className="text-[10px] font-medium text-slate-500 tracking-wider">
                Your Vision Our Mission
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <button
              onClick={() => handleNav('home')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                currentView === 'home'
                  ? 'text-[#2A0845] bg-purple-50 font-bold'
                  : 'text-slate-600 hover:text-[#2A0845] hover:bg-slate-50'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNav('search', { transaction_type: 'all' })}
              className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                currentView === 'search'
                  ? 'text-[#2A0845] bg-purple-50 font-bold'
                  : 'text-slate-600 hover:text-[#2A0845] hover:bg-slate-50'
              }`}
            >
              All Properties
            </button>
            <button
              onClick={() => handleNav('search', { transaction_type: 'RENT' })}
              className="px-3 py-2 rounded-lg text-xs font-semibold tracking-wide text-slate-600 hover:text-[#2A0845] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              For Rent
            </button>
            <button
              onClick={() => handleNav('search', { transaction_type: 'SALE' })}
              className="px-3 py-2 rounded-lg text-xs font-semibold tracking-wide text-slate-600 hover:text-[#2A0845] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              For Sale
            </button>
            <button
              onClick={() => handleNav('search', { category: 'commercial' })}
              className="px-3 py-2 rounded-lg text-xs font-semibold tracking-wide text-slate-600 hover:text-[#2A0845] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Commercial
            </button>
            <button
              onClick={() => handleNav('search', { category: 'land' })}
              className="px-3 py-2 rounded-lg text-xs font-semibold tracking-wide text-slate-600 hover:text-[#2A0845] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Lands
            </button>
            <button
              onClick={() => handleNav('how_it_works')}
              className="px-3 py-2 rounded-lg text-xs font-semibold tracking-wide text-slate-600 hover:text-[#2A0845] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              How It Works
            </button>
          </nav>

          {/* Right Action Icons & Auth */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Currency Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:bg-purple-50/50 transition-all cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{selectedCurrency}</span>
                <span className="text-[10px] text-slate-400">({CURRENCY_SYMBOLS[selectedCurrency]})</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {currencyDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
                  {currencies.map((curr) => (
                    <button
                      key={curr}
                      onClick={() => {
                        onCurrencyChange(curr);
                        setCurrencyDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-purple-50 transition-colors ${
                        selectedCurrency === curr ? 'font-bold text-[#2A0845] bg-purple-50/70' : 'text-slate-700'
                      }`}
                    >
                      <span>{curr}</span>
                      <span className="text-slate-400 text-[11px]">{CURRENCY_SYMBOLS[curr]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Saved Favorites - hidden for admin */}
            {profile?.role !== 'company_owner_admin' && (
              <button
                onClick={() => handleNav('portal', { tab: 'favorites' })}
                title="Saved Properties"
                className="relative p-2 rounded-lg text-slate-600 hover:text-[#2A0845] hover:bg-purple-50 transition-colors cursor-pointer"
              >
                <Heart className="w-5 h-5" />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D4AF37] text-[#2A0845] text-[10px] font-bold flex items-center justify-center">
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}

            {/* Portal Switcher & Role Badges */}
            {profile ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 border border-purple-200/80 hover:bg-purple-100/70 transition-all text-left cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#2A0845] text-[#D4AF37] flex items-center justify-center font-bold text-xs">
                    {profile.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-[#2A0845] leading-tight">
                      {profile.full_name}
                    </div>
                    <div className="text-[10px] font-semibold text-[#D4AF37] flex items-center gap-1">
                      {profile.role === 'company_owner_admin' && '👑 Company Owner'}
                      {profile.role === 'agent' && '💼 Agent / Staff'}
                      {profile.role === 'customer' && '👤 Customer'}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#2A0845]" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-800">{profile.full_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{profile.email}</p>
                    </div>

                    {profile.role === 'company_owner_admin' && (
                      <button
                        onClick={() => handleNav('admin')}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#2A0845] hover:bg-purple-50 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#D4AF37]" />
                        <span>Owner Admin Dashboard</span>
                      </button>
                    )}

                    {profile.role === 'agent' && (
                      <button
                        onClick={() => handleNav('agent')}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#2A0845] hover:bg-purple-50 transition-colors"
                      >
                        <Briefcase className="w-4 h-4 text-[#D4AF37]" />
                        <span>Agent / Staff Portal</span>
                      </button>
                    )}

                    {profile.role !== 'company_owner_admin' && (
                      <>
                        <button
                          onClick={() => handleNav('portal', { tab: 'reservations' })}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 transition-colors"
                        >
                          <Calendar className="w-4 h-4 text-purple-600" />
                          <span>My Reservations</span>
                        </button>

                        <button
                          onClick={() => handleNav('portal', { tab: 'payments' })}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 transition-colors"
                        >
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <span>My Payments & Receipts</span>
                        </button>
                      </>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={async () => {
                        await signOut();
                        setUserDropdownOpen(false);
                        handleNav('home');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleNav('auth')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A0845] text-white font-semibold text-xs tracking-wide hover:bg-[#3D105E] transition-all shadow-md shadow-purple-950/15 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#2A0845] hover:bg-purple-50 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
            <button
              onClick={() => handleNav('home')}
              className="py-2.5 px-3 rounded-lg text-xs font-semibold text-left bg-slate-50 text-slate-800"
            >
              Home
            </button>
            <button
              onClick={() => handleNav('search', { transaction_type: 'all' })}
              className="py-2.5 px-3 rounded-lg text-xs font-semibold text-left bg-slate-50 text-slate-800"
            >
              All Properties
            </button>
            <button
              onClick={() => handleNav('search', { transaction_type: 'RENT' })}
              className="py-2.5 px-3 rounded-lg text-xs font-semibold text-left bg-slate-50 text-slate-800"
            >
              For Rent
            </button>
            <button
              onClick={() => handleNav('search', { transaction_type: 'SALE' })}
              className="py-2.5 px-3 rounded-lg text-xs font-semibold text-left bg-slate-50 text-slate-800"
            >
              For Sale
            </button>
            <button
              onClick={() => handleNav('search', { category: 'commercial' })}
              className="py-2.5 px-3 rounded-lg text-xs font-semibold text-left bg-slate-50 text-slate-800"
            >
              Commercial
            </button>
            <button
              onClick={() => handleNav('search', { category: 'land' })}
              className="py-2.5 px-3 rounded-lg text-xs font-semibold text-left bg-slate-50 text-slate-800"
            >
              Land
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-500">Currency</span>
            <div className="flex gap-1.5">
              {currencies.map((curr) => (
                <button
                  key={curr}
                  onClick={() => onCurrencyChange(curr)}
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    selectedCurrency === curr
                      ? 'bg-[#2A0845] text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          {profile ? (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-[#2A0845]">{profile.full_name} ({profile.role})</div>
              {profile.role === 'company_owner_admin' && (
                <button
                  onClick={() => handleNav('admin')}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#2A0845] text-white font-semibold text-xs text-center"
                >
                  Owner Dashboard
                </button>
              )}
              {profile.role === 'agent' && (
                <button
                  onClick={() => handleNav('agent')}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#2A0845] text-white font-semibold text-xs text-center"
                >
                  Agent Portal
                </button>
              )}
              <button
                onClick={() => handleNav('portal')}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs text-center"
              >
                Customer Portal
              </button>
              <button
                onClick={async () => {
                  await signOut();
                  handleNav('home');
                }}
                className="w-full py-2 text-rose-600 text-xs font-semibold text-center"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleNav('auth')}
              className="w-full py-3 rounded-xl bg-[#2A0845] text-white font-semibold text-xs tracking-wider"
            >
              Sign In / Register
            </button>
          )}
        </div>
      )}
    </header>
  );
};
