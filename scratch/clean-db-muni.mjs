import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanMuni() {
    console.log("Searching for duplicate municipalities with null cod_mun...");
    try {
        // Find rows with null cod_mun
        const { data: nullMunis, error: findError } = await supabase
            .from('municipalities')
            .select('*')
            .is('cod_mun', null);

        if (findError) {
            console.error("Error finding null munis:", findError);
            return;
        }

        console.log(`Found ${nullMunis.length} municipalities with null cod_mun:`);
        nullMunis.forEach(m => {
            console.log(`ID: ${m.id} | Name: ${m.name} | Created At: ${m.created_at}`);
        });

        if (nullMunis.length > 0) {
            // Delete these rows since they are duplicates or incomplete
            const idsToDelete = nullMunis.map(m => m.id);
            console.log("Deleting null CMUN rows...");
            const { error: deleteError } = await supabase
                .from('municipalities')
                .delete()
                .in('id', idsToDelete);

            if (deleteError) {
                console.error("Error deleting:", deleteError);
            } else {
                console.log("Successfully deleted duplicate/incomplete municipality rows!");
            }
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}
cleanMuni();
