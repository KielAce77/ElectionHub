import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = 'https://lqrvjomjctlcejmsqxzj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxcnZqb21qY3RsY2VqbXNxeHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODYxMDksImV4cCI6MjA4Nzg2MjEwOX0.0iD-qSJw67fN6aBJf0Kb1Kw0VmHHxSSPQ65P18-CMns';
const supabase = createClient(url, key);

async function checkColumns() {
    let out = '--- Database Diagnostics ---\n';

    try {
        const { data, error } = await supabase.from('votes').select('*').limit(1);
        if (error) {
            out += `Error in 'votes': ${error.message}\n`;
        } else if (data && data.length > 0) {
            out += `Columns in 'votes': ${Object.keys(data[0]).join(', ')}\n`;
        } else {
            out += 'No rows in votes. Probing for columns...\n';
            for (const col of ['voter_id', 'user_id', 'profile_id', 'voter']) {
                const { error: gErr } = await supabase.from('votes').select(col).limit(1);
                if (!gErr) out += `Column ${col} EXISTS in 'votes'!\n`;
                else out += `Col ${col} error: ${gErr.message}\n`;
            }
        }

        const { data: tData, error: tErr } = await supabase.from('voting_tokens').select('*').limit(1);
        if (tData && tData.length > 0) {
            out += `Columns in 'voting_tokens': ${Object.keys(tData[0]).join(', ')}\n`;
        } else if (tErr) {
            out += `Error in 'voting_tokens': ${tErr.message}\n`;
        } else {
            out += 'No rows in voting_tokens. Probing for columns...\n';
            for (const col of ['id', 'election_id', 'token', 'is_used', 'used_at']) {
                const { error: gErr } = await supabase.from('voting_tokens').select(col).limit(1);
                if (!gErr) out += `Column ${col} EXISTS in 'voting_tokens'!\n`;
                else out += `Col ${col} error: ${gErr.message}\n`;
            }
        }
    } catch (e) {
        out += `Script Error: ${e.message}\n`;
    }

    fs.writeFileSync('diag_output.txt', out);
    console.log('Results written to diag_output.txt');
}

checkColumns();
