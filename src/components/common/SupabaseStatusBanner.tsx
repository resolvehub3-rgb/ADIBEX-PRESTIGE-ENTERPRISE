import React, { useState } from 'react';
import { Database, ShieldCheck, Settings } from 'lucide-react';
import { getSupabaseCredentials } from '../../lib/supabase';
import { SupabaseConfigModal } from './SupabaseConfigModal';

interface SupabaseStatusBannerProps {
  onRefreshNeeded?: () => void;
}

export const SupabaseStatusBanner: React.FC<SupabaseStatusBannerProps> = ({ onRefreshNeeded }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { isConfigured } = getSupabaseCredentials();

  return (
    <>
      <div className="bg-[#2A0845] text-white border-b border-[#3D105E] px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-[#D4AF37]">ADIBEX PRESTIGE ENTERPRISE</span>
            <span className="text-purple-300 hidden sm:inline">•</span>
            <span className="text-purple-200 text-[11px] italic hidden sm:inline">"Your Vision Our Mission"</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-purple-200">
              <Database className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-[11px]">
                {isConfigured ? 'Supabase PostgreSQL & Realtime Connected' : 'Supabase Config Ready'}
              </span>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[#D4AF37] border border-[#D4AF37]/30 text-[11px] font-medium transition-colors cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              <span>Database Connection & SQL</span>
            </button>
          </div>
        </div>
      </div>

      <SupabaseConfigModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnectionSuccess={() => {
          if (onRefreshNeeded) onRefreshNeeded();
        }}
      />
    </>
  );
};
