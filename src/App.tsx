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
  getPropertyByIdOrSlug,
} from './lib/db';
import { getSupabase, getSupabaseCredentials } from './lib/supabase';
import { recordSiteVisit } from './lib/visitors';

const MainApplication: React.FC = () => {
  const { profile } = useAuth();
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [searchInitialFilters, setSearchInitialFilters] = useState<any>({});
  const [customerPortalTab, setCustomerPortalTab] = useState<any>('reservations');
  // True once the deep-link effect below has read the address bar. Until then
  // the history-sync effect must not write, or it would erase the very
  // ?view= / /property/ parameters it is supposed to be honouring.
  const [deepLinkReady, setDeepLinkReady] = useState(false);

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

  // Count this browser session toward the local site-visitor total, which the
  // admin dashboard surfaces on the Viewing Tours tab. Counted once per session.
  useEffect(() => {
    recordSiteVisit();
  }, []);

  // Realtime: when the super-admin saves a listing or uploads a photo/video,
  // every open tab picks the change up without a hard refresh. Best effort —
  // if the realtime publication is not enabled the channel simply never fires.
  const [listingRefreshKey, setListingRefreshKey] = useState(0);
  useEffect(() => {
    if (!getSupabaseCredentials().isConfigured) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const channel = getSupabase()
        .channel('public-listings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'property_media' }, () => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            loadAllData();
            setListingRefreshKey((key) => key + 1);
          }, 600);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            loadAllData();
            setListingRefreshKey((key) => key + 1);
          }, 600);
        })
        .subscribe();

      return () => {
        clearTimeout(timer);
        getSupabase().removeChannel(channel);
      };
    } catch {
      // Realtime unavailable → the listing still refreshes on navigation.
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Handle deep-linking via URL path and query parameters for SEO and shared
  // Open Graph links. Runs once the first data load settles: a /property/<slug>
  // (or legacy ?property=) key that resolves to nothing — deleted, unpublished
  // or archived listing — must land on an explicit not-found view marked noindex
  // instead of silently falling back to the home page, which is what search
  // engines call a soft 404.
  useEffect(() => {
    if (isLoading || typeof window === 'undefined') return;

    // The URL is now the source of truth for the view, so the history-sync
    // effect below may start writing. It is deliberately gated on state (not a
    // ref) so its first run happens in the commit *after* this one, when the
    // view set here is already committed — otherwise it would rewrite the URL
    // to "/" (its default for the initial 'home' view) before this effect ever
    // got to read ?view= or /property/ out of the address bar, silently
    // breaking every deep link.
    setDeepLinkReady(true);

    const params = new URLSearchParams(window.location.search);
    const propParam = params.get('property');
    // Primary public route is /property/<slug>; ?property= is kept as a
    // compatibility alias for links that were already shared.
    const pathMatch = /^\/property\/([^/]+)\/?$/.exec(window.location.pathname);
    const propertyKey = pathMatch ? decodeURIComponent(pathMatch[1]) : propParam;
    const viewParam = params.get('view');
    const categoryParam = params.get('category');
    const typeParam = params.get('type');
    const transactionParam = params.get('transaction_type');
    const queryParam = params.get('q');

    if (propertyKey) {
      const found = properties.find(
        (p) => p.slug === propertyKey || p.id === propertyKey || p.reference_no === propertyKey
      );
      if (found) {
        setSelectedProperty(found);
        setCurrentView('property_detail');
      } else {
        setCurrentView('property_not_found');
      }
      return;
    }

    if (viewParam === 'search') {
      // Filter keys must match what SearchFilterView reads (snake_case), so a
      // deep link like ?view=search&type=single_room really shows rooms —
      // otherwise the page content would contradict its own title.
      if (currentView !== 'search') {
        setSearchInitialFilters({
          ...(categoryParam ? { category: categoryParam } : {}),
          ...(typeParam ? { property_type: typeParam } : {}),
          ...(transactionParam ? { transaction_type: transactionParam } : {}),
          ...(queryParam ? { searchTerm: queryParam } : {}),
        });
      }
      setCurrentView('search');
      return;
    }

    if (viewParam === 'how-it-works') {
      setCurrentView('how_it_works');
      return;
    }

    if (viewParam && ['home', 'portal'].includes(viewParam)) {
      setCurrentView(viewParam);
    }
    // Deps deliberately exclude currentView: this effect interprets the URL, it
    // must not re-run because a view changed (navigation is state-based via
    // onNavigate, so the address bar is only updated afterwards). It re-runs on
    // isLoading/properties.length so a /property/<slug> deep link still resolves
    // once the listing rows have actually arrived.
  }, [isLoading, properties.length]);

  // List responses only carry each listing's cover photo, so pull the full
  // gallery (plus fresh status/units) whenever a property detail is opened.
  useEffect(() => {
    const propertyId = selectedProperty?.id;
    if (!propertyId) return;

    let cancelled = false;
    getPropertyByIdOrSlug(propertyId).then((full) => {
      if (cancelled || !full) return;
      setSelectedProperty((prev) => {
        if (!prev || prev.id !== full.id) return prev;
        const media = full.media && full.media.length > 0 ? full.media : prev.media;
        return { ...prev, ...full, media };
      });
    });

    return () => {
      cancelled = true;
    };
    // listingRefreshKey: re-pull the gallery when a realtime event tells us the
    // admin changed media on this property (video uploaded after the page load).
  }, [selectedProperty?.id, listingRefreshKey]);

  // Keep browser URL in sync with the current view/property for rich social sharing & search engine bots
  useEffect(() => {
    // Wait for the deep-link effect to have consumed the address bar first.
    if (!deepLinkReady || typeof window === 'undefined') return;

    if (currentView === 'property_detail' && selectedProperty) {
      const slug = selectedProperty.slug || selectedProperty.id;
      window.history.replaceState(null, '', `/property/${encodeURIComponent(slug)}`);
    } else if (currentView === 'search') {
      const params = new URLSearchParams();
      params.set('view', 'search');
      if (searchInitialFilters?.category && searchInitialFilters.category !== 'all') {
        params.set('category', searchInitialFilters.category);
      }
      if (
        searchInitialFilters?.property_type &&
        searchInitialFilters.property_type !== 'all'
      ) {
        params.set('type', searchInitialFilters.property_type);
      }
      if (searchInitialFilters?.transaction_type && searchInitialFilters.transaction_type !== 'all') {
        params.set('transaction_type', searchInitialFilters.transaction_type);
      }
      if (searchInitialFilters?.searchTerm) {
        params.set('q', searchInitialFilters.searchTerm);
      }
      window.history.replaceState(null, '', `/?${params.toString()}`);
    } else if (currentView === 'how_it_works') {
      // The public URL is hyphenated (?view=how-it-works); the internal view id
      // is underscored. They must stay in sync or the page is unreachable.
      window.history.replaceState(null, '', '/?view=how-it-works');
    } else if (currentView === 'admin') {
      window.history.replaceState(null, '', '/admin');
    } else if (currentView === 'agent') {
      window.history.replaceState(null, '', '/agent');
    } else if (currentView === 'home') {
      window.history.replaceState(null, '', '/');
    }
  }, [deepLinkReady, currentView, selectedProperty, searchInitialFilters]);

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

        {/* ?property=... resolved to nothing: an explicit, crawlable not-found
            state (server answers 404 + noindex for the same URL) instead of
            silently rendering the home page as a soft 404. */}
        {currentView === 'property_not_found' && (
          <section className="max-w-3xl mx-auto px-4 py-24 text-center space-y-6">
            <span className="inline-flex mx-auto h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-[#2A0845] text-3xl font-extrabold">
              ?
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0845] tracking-tight">
              This listing is no longer available
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              The property you were looking for has been sold, rented out, unpublished or removed.
              Browse the rooms, lands and properties that are currently on the market.
            </p>
            <button
              type="button"
              onClick={() => handleNavigate('search')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2A0845] text-white font-extrabold text-xs tracking-wider uppercase hover:bg-[#3D105E] transition-all cursor-pointer"
            >
              Browse available properties
            </button>
          </section>
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
