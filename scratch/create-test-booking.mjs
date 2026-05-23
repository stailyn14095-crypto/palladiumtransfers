import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgunphooezjmradjqpuq.supabase.co';
const supabaseKey = 'sb_publishable_y384RV30jv2fyHEO4XVqAA_pml1z32m';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestBooking() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pickupDate = tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
    
    console.log(`Creating test booking for ${pickupDate}...`);
    
    const testData = {
        passenger: "TEST FOMENTO RVTC",
        email: "test@palladiumtransfers.com",
        origin: "Alicante",
        origin_address: "Aeropuerto de Alicante-Elche (ALC)",
        destination: "Benidorm",
        destination_address: "Avenida de los Hoteles, 1",
        pickup_date: pickupDate,
        pickup_time: "12:00",
        client_name: 'Directo', // This will test the company NIF fallback
        status: "Pending",
        price: 80,
        vehicle_class: "Standard",
        created_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabase.from('bookings').insert([testData]).select();
        if (error) {
            console.error("Error creating booking:", error.message);
        } else {
            console.log("Test booking created successfully:", data[0].id);
            return data[0].id;
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}
createTestBooking();
