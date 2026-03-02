import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function inspect() {
    console.log('--- Inspecting submit_ballot definition ---');
    const { data, error } = await supabase.rpc('get_function_definition', { function_name: 'submit_ballot' });
    if (error) {
        // In the event the specialized retrieval tool is inaccessible, alternative diagnostic
        // measures may be employed to audit function specifications.
        console.error('Failed to get function definition:', error);
    } else {
        console.log(data);
    }
}

inspect();
