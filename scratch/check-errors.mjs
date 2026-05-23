import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkErrors() {
    console.log("Searching for bookings with Fomento error...");
    try {
        const { data, error } = await supabase.from('bookings').select('*').not('fomento_error', 'is', null).order('created_at', { ascending: false }).limit(10);
        if (error) {
            console.error("Error searching bookings:", error);
            return;
        }
        
        if (data && data.length > 0) {
            console.log(`Found ${data.length} bookings with Fomento errors:`);
            data.forEach(b => {
                console.log(`Passenger: ${b.passenger} | Status: ${b.status} | Fomento Status: ${b.fomento_status} | Error: ${b.fomento_error}`);
            });
        } else {
            console.log("No bookings found with Fomento error.");
        }
    } catch (e) {
        console.error("Exception thrown:", e);
    }
}
checkErrors();
