import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'adibex_supabase_url';
const STORAGE_KEY_KEY = 'adibex_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  const url = (envUrl || storedUrl).trim();
  const anonKey = (envKey || storedKey).trim();

  const isConfigured = Boolean(url && anonKey && url.startsWith('http') && !url.includes('example'));

  return { url, anonKey, isConfigured };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    // Reload client
    _supabaseClient = null;
  }
}

export function clearCustomSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    _supabaseClient = null;
  }
}

let _supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient;

  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    // Provide a fallback client structure to avoid hard crashes before configuration
    const fallbackUrl = 'https://placeholder-project.supabase.co';
    const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';
    _supabaseClient = createClient(fallbackUrl, fallbackKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return _supabaseClient;
  }

  _supabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return _supabaseClient;
}

export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{ success: boolean; message: string; tableCheck?: boolean }> {
  try {
    const creds = getSupabaseCredentials();
    const url = (customUrl || creds.url).trim();
    const key = (customKey || creds.anonKey).trim();

    if (!url || !key || !url.startsWith('http')) {
      return { success: false, message: 'Invalid URL or Anonymous Key format.' };
    }

    const testClient = createClient(url, key);
    const { error } = await testClient.from('properties').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        // relation "properties" does not exist
        return {
          success: true,
          tableCheck: false,
          message: 'Connected to Supabase! However, the database tables have not been created yet. Please execute the SQL migration script.',
        };
      }
      return {
        success: false,
        message: `Supabase returned error: ${error.message} (${error.code || 'API error'})`,
      };
    }

    return {
      success: true,
      tableCheck: true,
      message: 'Successfully connected to Supabase PostgreSQL database!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Supabase.',
    };
  }
}
