import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findBooking() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
    console.log(`Searching for bookings on ${today}...`);
    try {
        const { data, error } = await supabase.from('bookings')
            .select('*')
            .eq('pickup_date', today)
            .neq('status', 'Cancelled')
            .limit(1);
        if (error) {
            console.error("Error:", error.message);
        } else if (data && data.length > 0) {
            console.log("Found booking:", data[0].id, "Passenger:", data[0].passenger);
        } else {
            console.log("No bookings found for today.");
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}
findBooking();
