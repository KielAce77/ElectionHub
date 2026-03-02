import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Preserve the user session to maintain login status after page reloads.
    persistSession: true,
    // Automatically renew authentication tokens to keep the session active.
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'electionhub-auth-token', // Use a unique key

    // Securely manage concurrent authentication requests to ensure a smooth experience.
    //
    // Signature: (name, acquireTimeout, fn) => Promise
    lock: async (_name, _acquireTimeout, fn) => await fn()
  }
});
