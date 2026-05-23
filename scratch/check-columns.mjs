import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log("Checking columns in driver_logs explicitly...");
    try {
        const { data, error } = await supabase.from('driver_logs').select('start_km, vehicle_condition, fuel_level, photo_url, incidence_notes').limit(1);
        if (error) {
            console.error("❌ Columns are missing or query failed:", error.message);
        } else {
            console.log("✅ Columns exist in driver_logs! Query returned:", data);
        }
    } catch (e) {
        console.error("Exception thrown:", e);
    }
}
checkColumns();
