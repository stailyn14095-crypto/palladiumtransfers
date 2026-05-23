import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPlates() {
    console.log("Checking vehicle plates...");
    try {
        const { data, error } = await supabase.from('vehicles').select('plate').limit(5);
        if (error) {
            console.error("Error:", error.message);
        } else {
            console.log("Plates found:", data.map(v => v.plate));
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}
checkPlates();
