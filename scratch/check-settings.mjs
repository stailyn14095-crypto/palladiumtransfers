import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
    console.log("Fetching all system_settings from database...");
    try {
        const { data, error } = await supabase.from('system_settings').select('*');
        if (error) {
            console.error("Error fetching system_settings:", error);
            return;
        }
        console.log(`Found ${data.length} settings:`);
        data.forEach(s => {
            console.log(`Key: ${s.key} | Value: ${s.value} | Description: ${s.description}`);
        });
    } catch (e) {
        console.error("Exception thrown:", e);
    }
}
checkSettings();
