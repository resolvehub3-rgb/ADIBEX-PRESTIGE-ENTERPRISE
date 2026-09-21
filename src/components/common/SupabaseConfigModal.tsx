import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials, testSupabaseConnection, clearCustomSupabaseCredentials } from '../../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConnectionSuccess,
}) => {
  const credentials = getSupabaseCredentials();
  const [url, setUrl] = useState(credentials.url);
  const [anonKey, setAnonKey] = useState(credentials.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tableCheck?: boolean } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [schemaText, setSchemaText] = useState<string>('');

  useEffect(() => {
    setUrl(credentials.url);
    setAnonKey(credentials.anonKey);
  }, [credentials.url, credentials.anonKey, isOpen]);

  useEffect(() => {
    // Pre-load schema text from root for 1-click copy
    fetch('/supabase-schema.sql')
      .then((res) => res.text())
      .then((text) => setSchemaText(text))
      .catch(() => {
        setSchemaText('-- Please copy the schema from supabase-schema.sql in the project root');
      });
  }, []);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection(url, anonKey);
    setTestResult(res);
    setIsTesting(false);

    if (res.success) {
      saveSupabaseCredentials(url, anonKey);
      if (onConnectionSuccess) {
        onConnectionSuccess();
      }
    }
  };

  const handleCopySql = async () => {
    try {
      if (schemaText) {
        await navigator.clipboard.writeText(schemaText);
      } else {
        const res = await fetch('/supabase-schema.sql');
        const text = await res.text();
        await navigator.clipboard.writeText(text);
      }
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch (err) {
      setCopiedSql(false);
    }
  };

  const handleReset = () => {
    clearCustomSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-purple-100 flex flex-col">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-[#2A0845] to-[#3D105E] text-white flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 border border-[#D4AF37]/40 text-[#D4AF37]">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Supabase Database Connection</h3>
              <p className="text-xs text-purple-200">
                ADIBEX PRESTIGE ENTERPRISE • Production PostgreSQL Setup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 text-slate-700">
          <div className="bg-purple-50/60 border border-purple-200/70 rounded-xl p-4 text-xs leading-relaxed space-y-2">
            <div className="font-semibold text-[#2A0845] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#D4AF37]" />
              Production SaaS Requirement
            </div>
            <p className="text-slate-600">
              Per system requirements, this platform uses real Supabase PostgreSQL, Authentication, Storage, and Realtime with Row Level Security (RLS). No mock data or fake users are created.
            </p>
          </div>

          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845] font-mono text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Found in your Supabase Dashboard &gt; Project Settings &gt; API
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Supabase Anonymous Key (anon / public)
              </label>
              <input
                type="text"
                required
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#2A0845]/20 focus:border-[#2A0845] font-mono text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Found in your Supabase Dashboard &gt; Project Settings &gt; API (Public anon key)
              </p>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
                  testResult.success
                    ? testResult.tableCheck
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">{testResult.message}</div>
                  {testResult.success && !testResult.tableCheck && (
                    <p className="mt-1 text-amber-700">
                      Click the "Copy SQL Schema" button below and run it in the Supabase SQL Editor to initialize all tables, RLS policies, and triggers!
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isTesting || !url || !anonKey}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A0845] text-white font-medium text-sm hover:bg-[#3B1259] transition-all disabled:opacity-50 shadow-md shadow-purple-900/10 cursor-pointer"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                    Save & Test Connection
                  </>
                )}
              </button>

              {credentials.isConfigured && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Reset Keys
                </button>
              )}
            </div>
          </form>

          {/* SQL Setup Helper */}
          <div className="border-t border-slate-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Database Schema (SQL Script)</h4>
                <p className="text-xs text-slate-500">
                  Includes all 12 tables, RLS policies, functions, and storage policies.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D4AF37]/15 text-[#2A0845] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/30 text-xs font-semibold transition-all cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied SQL!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#2A0845]" />
                    <span>Copy Full SQL Schema</span>
                  </>
                )}
              </button>
            </div>

            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <li>Log into your Supabase Project dashboard.</li>
              <li>Go to the <span className="font-semibold text-slate-800">SQL Editor</span> tab on the left sidebar.</li>
              <li>Click <span className="font-semibold text-slate-800">New Query</span>, paste the copied SQL schema, and click <span className="font-semibold text-slate-800">Run</span>.</li>
              <li>All tables, RLS security rules, triggers, and storage buckets will be instantly prepared!</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-2xl text-xs text-slate-500">
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[#2A0845] hover:underline font-medium"
          >
            Supabase Dashboard <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
