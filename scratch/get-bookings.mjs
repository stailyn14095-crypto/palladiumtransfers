import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    const tables = ['bookings', 'drivers', 'vehicles', 'clients', 'tariffs', 'municipalities'];
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            if (error) {
                console.log(`Table ${table}: error`, error.message);
            } else {
                console.log(`Table ${table}: count = ${count}`);
            }
        } catch (e) {
            console.log(`Table ${table}: exception`, e.message);
        }
    }
}
checkCounts();
