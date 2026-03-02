import { createClient } from '@supabase/supabase-js';

const url = "VITE_SUPABASE_URL_HERE"; // Need to replace
const key = "VITE_SUPABASE_ANON_KEY_HERE"; // Need to replace

// This script will be run via node directly from the command line after I fill the keys.
const supabase = createClient(url, key);

async function run() {
    console.log('--- Checking Public Profile Data ---');
    const { data, error } = await supabase.from('profiles').select('*, organizations(*)');
    if (error) {
        console.error(error);
    } else {
        console.table(data.map(p => ({
            Email: p.email,
            Role: p.role,
            Organization: p.organizations?.name || 'NULL',
            UserID: p.id
        })));
    }
}

run();
