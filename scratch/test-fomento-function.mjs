import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFomentoFunction() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pickupDate = tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });

    console.log(`Testing Fomento VTC function with date ${pickupDate}...`);

    const payload = {
        action: 'alta',
        payload: {
            idcomunica: 'TEST' + Date.now().toString().slice(-8),
            niftitular: 'B00000000', // Will be replaced by company NIF in function if needed, but ReservasView cleans it
            nombtitular: 'Palladium Transfers S.L.',
            nif: 'B12345678', // Company NIF for direct test
            nom: 'PALLADIUM TEST',
            matricula: '1234-ABC',
            fecinicio: pickupDate,
            horinicio: '12:00',
            fecfin: pickupDate,
            horfin: '23:59',
            fcontrato: new Date().toISOString()
        }
    };

    try {
        const { data, error } = await supabase.functions.invoke('fomento-vtc', {
            body: payload
        });

        if (error) {
            console.error("Error invoking function:", error);
        } else {
            console.log("Function response:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}
testFomentoFunction();
