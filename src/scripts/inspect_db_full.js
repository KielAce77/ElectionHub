import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function inspectDb() {
    console.log('--- Inspecting Database Structure ---');

    // We can't query information_schema directly via PostgREST usually,
    // but we can try to get hints from the error messages of selecting from each table.
    const tables = ['organizations', 'profiles', 'elections', 'positions', 'candidates', 'votes', 'voting_tokens'];

    for (const table of tables) {
        console.log(`\nChecking table: ${table}`);
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`Error in table ${table}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Columns in ${table}:`, Object.keys(data[0]));
        } else {
            // Try to select an imaginary column to get the list of valid columns in the error message
            const { error: colError } = await supabase.from(table).select('non_existent_column_for_inspection_only');
            if (colError && colError.message && colError.message.includes('Columns are')) {
                console.log(`Column hints for ${table}:`, colError.message);
            } else if (colError && colError.message) {
                // Postgres usually says "column X does not exist" but might give hints in some setups.
                // Otherwise we just know it's empty.
                console.log(`Table ${table} is empty and couldn't get column hints.`);
            }
        }
    }
}

inspectDb();
