import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMuni() {
    console.log("Fetching municipalities for Benidorm...");
    try {
        const { data, error } = await supabase.from('municipalities').select('*').ilike('name', '%benidorm%');
        if (error) {
            console.error("Error:", error);
        } else {
            console.log("Results for Benidorm:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}
checkMuni();
