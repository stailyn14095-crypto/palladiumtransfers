import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContractDate() {
    console.log("Checking if 'contract_date' column exists in 'clients'...");
    try {
        const { data, error } = await supabase.from('clients').select('contract_date').limit(1);
        if (error) {
            console.error("Column 'contract_date' NOT found or error:", error.message);
        } else {
            console.log("Column 'contract_date' exists!");
        }
    } catch (e) {
        console.error("Exception thrown:", e);
    }
}
checkContractDate();
