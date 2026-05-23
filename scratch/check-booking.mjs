import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBooking() {
    console.log("Checking booking 118...");
    try {
        // Query by id, or passenger, or just get last 5 bookings
        const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(5);
        if (error) {
            console.error("Error fetching bookings:", error);
        } else {
            console.log("Last 5 Bookings:");
            data.forEach(b => {
                console.log(`ID: ${b.id} | Passenger: ${b.passenger} | Status: ${b.status} | Fomento Status: ${b.fomento_status} | Fomento Err: ${b.fomento_error} | Org: ${b.origin} | Dest: ${b.destination} | Org Muni: ${b.origin_municipality} | Dest Muni: ${b.destination_municipality}`);
            });
        }
    } catch (e) {
        console.error("Exception thrown:", e);
    }
}
checkBooking();
