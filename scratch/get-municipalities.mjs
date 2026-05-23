import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listMunicipalities() {
    console.log("Fetching municipalities from Supabase...");
    try {
        const { data, error } = await supabase
            .from('municipalities')
            .select('*')
            .eq('cod_prov', '03');
        if (error) {
            console.error("Error fetching municipalities:", error);
        } else {
            console.log(`Fetched ${data?.length} municipalities in Alicante:`);
            const benidorm = data?.find(m => m.name.toUpperCase().includes('BENIDORM'));
            console.log("Benidorm entry:", benidorm);
            
            const alicante = data?.find(m => m.name.toUpperCase().includes('ALICANTE'));
            console.log("Alicante entry:", alicante);
            
            console.log("\nSome other entries:");
            console.dir(data?.slice(0, 15), { depth: null });
        }
    } catch (e) {
        console.error("Exception thrown:", e);
    }
}
listMunicipalities();
