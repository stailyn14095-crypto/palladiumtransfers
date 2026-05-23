import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testColumns() {
    console.log("Checking if 'origin_municipality' and 'destination_municipality' columns exist in 'bookings'...");
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select('origin_municipality, destination_municipality')
            .limit(1);
        if (error) {
            console.error("Columns DO NOT exist or error occurred:", error.message);
        } else {
            console.log("Success! Columns exist in 'bookings' table.");
        }
    } catch (e) {
        console.error("Exception thrown:", e);
    }
}
testColumns();
