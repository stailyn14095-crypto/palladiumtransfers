import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log("Checking columns of 'clients'...");
    try {
        const { data, error } = await supabase.from('clients').select('*').limit(1);
        if (error) {
            console.error("Error from Supabase:", error);
        } else {
            console.log("Columns found:", Object.keys(data[0] || {}));
        }
    } catch (e) {
        console.error("Exception thrown:", e);
    }
}
checkColumns();
