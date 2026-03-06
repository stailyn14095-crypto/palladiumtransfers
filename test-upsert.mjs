import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpsert() {
    const { data: existing } = await supabase.from('tariffs').select('*').limit(1);
    if (!existing || existing.length === 0) return;
    const testItem = { ...existing[0], base_price: existing[0].base_price + 1 };
    delete testItem.created_at; // don't send readonly fields just in case

    // Attempt upsert
    console.log('Original items count: ', (await supabase.from('tariffs').select('id', { count: 'exact' })).count);
    const { data, error } = await supabase.from('tariffs').upsert([testItem], { onConflict: 'id' }).select();
    if (error) {
        console.error('Upsert failed', error);
    } else {
        console.log('Upsert succeeded', data);
        console.log('New items count: ', (await supabase.from('tariffs').select('id', { count: 'exact' })).count);
    }
}
testUpsert();
