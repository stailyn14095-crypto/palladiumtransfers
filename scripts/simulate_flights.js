import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Simple .env parser to get Supabase credentials
const envPath = path.resolve(process.cwd(), '.env');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    for (const line of envConfig.split('\n')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        if (key && key.trim() === 'VITE_SUPABASE_URL') supabaseUrl = value;
        if (key && key.trim() === 'VITE_SUPABASE_ANON_KEY') supabaseKey = value;
    }
}

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase credentials not found in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const statuses = ['Scheduled', 'Final Approach', 'Taxiing', 'Landed'];

async function simulate() {
    console.log("🚀 Starting Flight simulation...");

    // Fetch some flights to simulate
    const { data: flights, error } = await supabase.from('flights').select('*').limit(5);

    if (error || !flights || flights.length === 0) {
        console.error("Could not fetch flights for simulation:", error);
        return;
    }

    console.log(`Tracking ${flights.length} flights:`);
    flights.forEach(f => console.log(` - ${f.number} (${f.status})`));

    // Simulation loop
    setInterval(async () => {
        const flight = flights[Math.floor(Math.random() * flights.length)];
        const currentIndex = statuses.indexOf(flight.status);
        const nextIndex = (currentIndex + 1) % statuses.length;
        const nextStatus = statuses[nextIndex];

        console.log(`Updating ${flight.number}: ${flight.status} -> ${nextStatus}`);

        const { error: updateError } = await supabase
            .from('flights')
            .update({ status: nextStatus })
            .eq('id', flight.id);

        if (updateError) {
            console.error(`Error updating flight ${flight.number}:`, updateError);
        } else {
            flight.status = nextStatus; // Update local state for next iteration
        }
    }, 5000); // Update every 5 seconds
}

simulate();
