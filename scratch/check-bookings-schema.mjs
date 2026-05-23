import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking bookings columns...");
    try {
        // Since we can't run raw SQL directly without service_role easily unless we have execute_sql,
        // let's try to query the REST API for a single booking to see all keys, or query PostgREST OpenAPI.
        // Actually, we can fetch the OpenAPI spec of the supabase project to see all columns!
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
                'apikey': supabaseKey
            }
        });
        const openApiSpec = await res.json();
        const bookingDef = openApiSpec.definitions?.bookings;
        if (bookingDef) {
            console.log("Bookings columns:", Object.keys(bookingDef.properties));
            console.log("\norigin_municipality property details:", bookingDef.properties.origin_municipality);
            console.log("destination_municipality property details:", bookingDef.properties.destination_municipality);
        } else {
            console.log("Could not find bookings definition in OpenAPI spec.");
        }
    } catch (e) {
        console.error("Exception thrown:", e);
    }
}
checkSchema();
