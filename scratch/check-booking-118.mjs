import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBooking118() {
    console.log("Searching booking #118 in database by passenger 'TEST - 14'...");
    try {
        const { data, error } = await supabase.from('bookings').select('*').ilike('passenger', '%TEST - 14%');
        if (error) {
            console.error("Error searching passenger:", error);
            return;
        }
        
        if (data && data.length > 0) {
            console.log(`Found ${data.length} bookings for TEST - 14:`);
            data.forEach(b => {
                console.log(JSON.stringify(b, null, 2));
            });
            return;
        }

        console.log("Not found by passenger. Trying to search by column 'booking_number' or 'number' equal to 118...");
        // Let's get the list of columns first or query with a generic search
        const { data: data2, error: error2 } = await supabase.from('bookings').select('*').limit(10);
        if (error2) {
            console.error("Error fetching bookings:", error2);
        } else {
            const matches = data2.filter(b => b.number === 118 || b.booking_number === 118 || b.id_num === 118 || String(b.number) === '118');
            if (matches.length > 0) {
                console.log("Found by custom number filtering:");
                console.log(JSON.stringify(matches[0], null, 2));
            } else {
                console.log("Sample bookings in DB to inspect fields:");
                data2.forEach(b => {
                    console.log(`ID: ${b.id} | Passenger: ${b.passenger} | Status: ${b.status} | Fomento Status: ${b.fomento_status} | Number: ${b.number || b.booking_number || b.id_num}`);
                });
            }
        }
    } catch (e) {
        console.error("Exception thrown:", e);
    }
}
checkBooking118();
