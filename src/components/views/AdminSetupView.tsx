import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Loader2, AlertTriangle, ArrowLeft, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSupabase, getSupabaseCredentials } from '../../lib/supabase';

interface AdminSetupViewProps {
  onOpenAuth: () => void;
  onNavigate: (view: string) => void;
}

type ClaimState =
  | { status: 'idle' }
  | { status: 'claiming' }
  | { status: 'error'; message: string }
  | { status: 'success' };

/**
 * First-owner bootstrap, reached by typing https://www.adibexprestige.com/admin/setup.
 *
 * It is deliberately linked from nowhere and marked noindex (see the
 * `admin_setup` branch of buildViewSEOMetadata). The page itself performs no
 * privileged write: it only calls the SECURITY DEFINER RPC
 * `public.claim_first_admin()`, which promotes the signed-in user while the
 * table holds zero owners and refuses every call afterwards. There is no
 * service-role key and no admin API involved — RLS stays authoritative.
 */
export const AdminSetupView: React.FC<AdminSetupViewProps> = ({ onOpenAuth, onNavigate }) => {
  const { user, profile, isLoading: isAuthLoading, isConfigured } = useAuth();
  const [claim, setClaim] = useState<ClaimState>({ status: 'idle' });

  const isOwner = profile?.role === 'company_owner_admin';

  const handleClaim = async () => {
    if (!isConfigured || !user) return;
    setClaim({ status: 'claiming' });
    try {
      const { error } = await getSupabase().rpc('claim_first_admin');

      if (error) {
        // The RPC raises a specific exception for each refusal; surface it
        // verbatim rather than inventing a friendlier-but-false explanation.
        setClaim({ status: 'error', message: error.message });
        return;
      }

      setClaim({ status: 'success' });
      // The in-memory profile still says "customer", so reload rather than
      // trying to patch state. On reload the session is restored, the role is
      // re-read from profiles, and the app sends the owner to the dashboard.
      window.history.replaceState(null, '', '/admin');
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setClaim({ status: 'error', message });
    }
  };

  const renderBody = () => {
    if (!isConfigured) {
      return (
        <SetupMessage
          icon={<AlertTriangle className="w-8 h-8 text-amber-300" />}
          title="Database not configured"
          description="This site has no Supabase credentials in its environment, so there are no accounts to promote."
        >
          <SetupButton onClick={() => onNavigate('home')}>Back to home</SetupButton>
        </SetupMessage>
      );
    }

    if (isAuthLoading) {
      return (
        <SetupMessage
          icon={<Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />}
          title="Checking your session"
          description="One moment while we confirm whether you are signed in."
        />
      );
    }

    if (!user) {
      return (
        <SetupMessage
          icon={<KeyRound className="w-8 h-8 text-[#D4AF37]" />}
          title="Sign in to continue"
          description="Owner setup runs against a real account. Register with the email address that should own this company, or sign in if you already registered."
        >
          <SetupButton onClick={onOpenAuth}>Sign in or register</SetupButton>
        </SetupMessage>
      );
    }

    if (!profile) {
      return (
        <SetupMessage
          icon={<Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />}
          title="Preparing your account"
          description="Your profile is still being created. Reload this page in a moment."
        >
          <SetupButton onClick={() => window.location.reload()}>Reload</SetupButton>
        </SetupMessage>
      );
    }

    if (isOwner) {
      return (
        <SetupMessage
          icon={<Crown className="w-8 h-8 text-[#D4AF37]" />}
          title="This account already owns the company"
          description={`${profile.email} is signed in as a Company Owner. Owner setup only works while no owner exists, so there is nothing left to claim.`}
        >
          <SetupButton onClick={() => onNavigate('admin')}>Go to the dashboard</SetupButton>
        </SetupMessage>
      );
    }

    return (
      <SetupMessage
        icon={<ShieldCheck className="w-8 h-8 text-[#D4AF37]" />}
        title="Claim company owner access"
        description={`You are signed in as ${profile.email} (${profile.role}). This promotes the account to Company Owner, giving you the listings, staff, payments and settings dashboard.`}
      >
        {claim.status === 'error' && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-left"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-300" />
            <div className="text-xs text-red-200 leading-relaxed">
              <p className="font-semibold">{claim.message}</p>
              {/already exists/i.test(claim.message) && (
                <p className="mt-1 text-red-200/70">
                  Ownership has been taken. Sign in with the owner account, or ask that person to add
                  you from the Staff tab.
                </p>
              )}
            </div>
          </div>
        )}

        {claim.status === 'error' && !/already exists/i.test(claim.message) && (
          <p className="mb-5 text-xs text-amber-200/70 leading-relaxed">
            If this account was registered before the database was hardened, its profile row may be
            missing or stale — sign out, register again, then return here.
          </p>
        )}

        <SetupButton onClick={handleClaim} disabled={claim.status === 'claiming'}>
          {claim.status === 'claiming' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Claiming…
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Claim owner access
            </>
          )}
        </SetupButton>
      </SetupMessage>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0118] via-[#1A042B] to-[#0D0015] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#2A0845]/30 blur-[120px] animate-pulse pointer-events-none" />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#D4AF37]/10 blur-[100px] animate-pulse pointer-events-none"
        style={{ animationDelay: '1s' }}
      />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 max-w-2xl w-full">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 text-purple-300/60 hover:text-[#D4AF37] transition-colors duration-300 mb-8 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center group-hover:bg-[#D4AF37]/10 group-hover:border-[#D4AF37]/20 transition-all duration-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </div>
          <span className="text-xs font-semibold tracking-wide">Back to Home</span>
        </button>

        <div className="relative bg-white/[0.04] backdrop-blur-2xl rounded-[2rem] border border-white/[0.08] shadow-2xl shadow-purple-950/50 overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
          <div className="p-8 sm:p-10 lg:p-12">{renderBody()}</div>
        </div>

        <p className="mt-6 text-[11px] text-purple-300/40 leading-relaxed text-center">
          Owner setup is a one-time action and is refused once any owner exists. Staff accounts are
          added later from the dashboard's Staff tab.
        </p>
      </div>
    </div>
  );
};

const SetupMessage: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <div className="flex flex-col items-center text-center space-y-5">
    <div className="relative w-fit">
      <div className="absolute inset-0 rounded-2xl bg-[#D4AF37]/20 blur-xl scale-150" />
      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/20 flex items-center justify-center">
        {icon}
      </div>
    </div>
    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{title}</h1>
    <p className="text-sm text-purple-200/70 leading-relaxed max-w-md">{description}</p>
    {children}
  </div>
);

const SetupButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }
> = ({ children, ...props }) => (
  <button
    type="button"
    {...props}
    className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-[#1A042B] font-extrabold text-xs tracking-wider uppercase hover:bg-[#E5C25A] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
      props.className || ''
    }`}
  >
    {children}
  </button>
);
