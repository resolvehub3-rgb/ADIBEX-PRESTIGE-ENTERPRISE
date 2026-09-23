import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { HomeView } from './components/views/HomeView';
import { SearchFilterView } from './components/views/SearchFilterView';
import { PropertyDetailView } from './components/views/PropertyDetailView';
import { CustomerPortalView } from './components/views/CustomerPortalView';
import { AdminDashboardView } from './components/views/AdminDashboardView';
import { AgentPortalView } from './components/views/AgentPortalView';
import { HowItWorksView } from './components/views/HowItWorksView';
import { ReservationModal } from './components/modals/ReservationModal';
import { SEOManager } from './components/common/SEOManager';
import {
  Property,
  Reservation,
  Payment,
  ViewingAppointment,
  CompanySettings,
  CurrencyCode,
  UserRole,
  DEFAULT_COMPANY_SETTINGS,
} from './types';
import {
  fetchProperties,
  fetchCompanySettings,
  fetchAllReservations,
  fetchAllPayments,
  fetchAllViewings,
} from './lib/db';

const MainApplication: React.FC = () => {
  const { profile } = useAuth();
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [searchInitialFilters, setSearchInitialFilters] = useState<any>({});
  const [customerPortalTab, setCustomerPortalTab] = useState<any>('reservations');

  // Currency & Favorites
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('GHS');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('adibex_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Enterprise Data States
  const [properties, setProperties] = useState<Property[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [viewings, setViewings] = useState<ViewingAppointment[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [propertyToReserve, setPropertyToReserve] = useState<Property | null>(null);

  const loadAllData = async () => {
    try {
      const [props, sett] = await Promise.all([fetchProperties(), fetchCompanySettings()]);
      setProperties(props);
      if (sett) setSettings(sett);

      // If owner or agent, also fetch admin records
      if (profile?.role === 'company_owner_admin' || profile?.role === 'agent') {
        const [resList, payList, viewList] = await Promise.all([
          fetchAllReservations(),
          fetchAllPayments(),
          fetchAllViewings(),
        ]);
        setReservations(resList);
        setPayments(payList);
        setViewings(viewList);
      }
    } catch (err) {
      console.warn('Error loading initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [profile?.role]);

  // Track fresh sign-in to redirect owners to their dashboard
  const handleAuthSuccess = (role: UserRole) => {
    if (role === 'company_owner_admin') {
      setCurrentView('admin');
    } else if (role === 'agent') {
      setCurrentView('agent');
    }
  };

  // Detect owner/agent roles when a saved session is restored (page load or refresh)
  // and send them straight to their dashboard. Runs once per session; if the user
  // arrived via a deep link (property/view URL) that destination keeps priority.
  const handledSessionRole = useRef(false);
  useEffect(() => {
    if (handledSessionRole.current || !profile?.role) return;
    handledSessionRole.current = true;
    if (currentView !== 'home') return;
    if (profile.role === 'company_owner_admin') {
      setCurrentView('admin');
    } else if (profile.role === 'agent') {
      setCurrentView('agent');
    }
  }, [profile?.role, currentView]);

  // Handle initial URL path-based routing (supports /admin, /agent on page load / refresh)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    if (path === '/admin') {
      setCurrentView('admin');
    } else if (path === '/agent') {
      setCurrentView('agent');
    }
  }, []);

  // Handle deep-linking via URL query parameters for SEO and shared Open Graph links
  useEffect(() => {
    if (properties.length > 0 && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const propParam = params.get('property');
      const viewParam = params.get('view');
      const categoryParam = params.get('category');
      const typeParam = params.get('type');

      if (propParam) {
        const found = properties.find(
          (p) => p.slug === propParam || p.id === propParam || p.reference_no === propParam
        );
        if (found) {
          setSelectedProperty(found);
          setCurrentView('property_detail');
          return;
        }
      }

      if (viewParam) {
        if (viewParam === 'search') {
          setCurrentView('search');
          if (categoryParam || typeParam) {
            setSearchInitialFilters({
              category: categoryParam || 'all',
              propertyType: typeParam || 'all',
            });
          }
        } else if (['home', 'how-it-works', 'portal'].includes(viewParam)) {
          setCurrentView(viewParam);
        }
      }
    }
  }, [properties.length]);

  // Keep browser URL in sync with the current view/property for rich social sharing & search engine bots
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (currentView === 'property_detail' && selectedProperty) {
      const slug = selectedProperty.slug || selectedProperty.id;
      window.history.replaceState(null, '', `/?property=${encodeURIComponent(slug)}`);
    } else if (currentView === 'search') {
      const params = new URLSearchParams();
      params.set('view', 'search');
      if (searchInitialFilters?.category && searchInitialFilters.category !== 'all') {
        params.set('category', searchInitialFilters.category);
      }
      if (searchInitialFilters?.propertyType && searchInitialFilters.propertyType !== 'all') {
        params.set('type', searchInitialFilters.propertyType);
      }
      window.history.replaceState(null, '', `/?${params.toString()}`);
    } else if (currentView === 'how-it-works') {
      window.history.replaceState(null, '', '/?view=how-it-works');
    } else if (currentView === 'admin') {
      window.history.replaceState(null, '', '/admin');
    } else if (currentView === 'agent') {
      window.history.replaceState(null, '', '/agent');
    } else if (currentView === 'home') {
      window.history.replaceState(null, '', '/');
    }
  }, [currentView, selectedProperty, searchInitialFilters]);

  // Redirect admin away from customer portal
  useEffect(() => {
    if (currentView === 'portal' && profile?.role === 'company_owner_admin') {
      setCurrentView('admin');
    }
  }, [currentView, profile?.role]);

  const handleToggleFavorite = (propertyId: string) => {
    let updated: string[];
    if (favorites.includes(propertyId)) {
      updated = favorites.filter((id) => id !== propertyId);
    } else {
      updated = [...favorites, propertyId];
    }
    setFavorites(updated);
    try {
      localStorage.setItem('adibex_favorites', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  const handleNavigate = (view: string, data?: any) => {
    if (view === 'auth') {
      setAuthModalOpen(true);
      return;
    }
    if (view === 'property_detail' && data) {
      setSelectedProperty(data);
    }
    if (view === 'search') {
      setSearchInitialFilters(data || {});
    }
    if (view === 'portal') {
      if (data?.tab) {
        setCustomerPortalTab(data.tab);
      }
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    setCurrentView('property_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenReservation = (property: Property) => {
    setPropertyToReserve(property);
    setReservationModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans antialiased">
      {/* Dynamic SEO, Open Graph, and Structured Data Manager */}
      <SEOManager
        currentView={currentView}
        property={currentView === 'property_detail' ? selectedProperty : null}
        settings={settings}
        searchFilters={searchInitialFilters}
      />

      {/* Supabase Status Banner */}


      {/* Main Brand Navbar - Hidden for Admin Dashboard */}
      {currentView !== 'admin' && (
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          selectedCurrency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
          favoritesCount={favorites.length}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomeView
            properties={properties}
            currency={selectedCurrency}
            settings={settings}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectProperty={handleSelectProperty}
            onNavigate={handleNavigate}
            onOpenReservation={handleOpenReservation}
          />
        )}

        {currentView === 'search' && (
          <SearchFilterView
            properties={properties}
            currency={selectedCurrency}
            initialFilters={searchInitialFilters}
            onSelectProperty={handleSelectProperty}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onOpenReservation={handleOpenReservation}
          />
        )}

        {currentView === 'property_detail' && selectedProperty && (
          <PropertyDetailView
            property={selectedProperty}
            currency={selectedCurrency}
            settings={settings}
            userProfile={profile}
            isFavorited={favorites.includes(selectedProperty.id)}
            onToggleFavorite={handleToggleFavorite}
            onBack={() => setCurrentView('search')}
            onUnitReserved={loadAllData}
          />
        )}

        {currentView === 'portal' && profile?.role !== 'company_owner_admin' && (
          <CustomerPortalView
            initialTab={customerPortalTab}
            properties={properties}
            currency={selectedCurrency}
            settings={settings}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectProperty={handleSelectProperty}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboardView
            properties={properties}
            reservations={reservations}
            payments={payments}
            viewings={viewings}
            settings={settings}
            currency={selectedCurrency}
            isLoading={isLoading}
            onRefreshData={loadAllData}
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'agent' && (
          <AgentPortalView
            properties={properties}
            viewings={viewings}
            reservations={reservations}
            settings={settings}
            currency={selectedCurrency}
            isLoading={isLoading}
            onRefreshData={loadAllData}
            onSelectProperty={handleSelectProperty}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentView === 'how_it_works' && (
          <HowItWorksView settings={settings} onNavigate={handleNavigate} />
        )}
      </main>

      {/* Brand Footer - Hidden for Admin Dashboard */}
      {currentView !== 'admin' && (
        <Footer settings={settings} onNavigate={handleNavigate} />
      )}

      {/* Global Modals */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthSuccess={handleAuthSuccess} />

      {propertyToReserve && (
        <ReservationModal
          isOpen={reservationModalOpen}
          onClose={() => {
            setReservationModalOpen(false);
            setPropertyToReserve(null);
          }}
          property={propertyToReserve}
          userProfile={profile}
          settings={settings}
          currency={selectedCurrency}
          onSuccess={() => {
            loadAllData();
          }}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainApplication />
    </AuthProvider>
  );
}

export default App;
