import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Public (voter) client:
// - Must NOT share admin auth session storage
// - Must NOT auto-refresh tokens or touch auth state
// This prevents opening /vote in a new tab from disrupting the admin session.
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'electionhub-public',
    lock: async (_name, _acquireTimeout, fn) => await fn(),
  },
});

