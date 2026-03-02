import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Always persist the session so a full-page refresh
    // keeps admins and voters signed in.
    persistSession: true,
    // Re-enable auto refresh now that we override the lock mechanism below.
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'electionhub-auth-token', // Use a unique key

    // CRITICAL: Override auth-js locking to avoid navigator.locks deadlocks and
    // AbortError: "Lock broken by another request with the 'steal' option."
    // This makes auth/session operations deterministic within a single tab.
    //
    // Signature: (name, acquireTimeout, fn) => Promise
    lock: async (_name, _acquireTimeout, fn) => await fn()
  }
});
