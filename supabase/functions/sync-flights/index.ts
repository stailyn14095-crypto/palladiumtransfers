import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Setup Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Setup AirLabs Key
    const airlabsKey = Deno.env.get('VITE_AIRLABS_API_KEY')
    if (!airlabsKey) {
      throw new Error("Missing VITE_AIRLABS_API_KEY")
    }

    // 3. Find target flights: flights that are not 'Landed' or 'Cancelled' and are registered for today or tomorrow (basic filtering)
    // We only want to sync flights that are actively pending to arrive
    const { data: activeFlights, error: fetchError } = await supabaseClient
      .from('flights')
      .select('*')
      .in('status', ['Scheduled', 'En Route', 'Delayed', 'Taxiing', 'Final Approach'])

    if (fetchError) throw fetchError;
    if (!activeFlights || activeFlights.length === 0) {
      return new Response(JSON.stringify({ message: "No active flights found to sync." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 4. Group flight numbers to minimize API calls (AirLabs allows multiple IATA codes if needed, or we just loop)
    // AirLabs flight_iata search is direct. We will loop them for simplicity and stability

    const results = [];
    for (const flight of activeFlights) {
      if (!flight.number) continue;

      // Clean flight number from spaces (e.g. "FR 2070" -> "FR2070")
      const flightIata = flight.number.replace(/\s+/g, '').toUpperCase();

      console.log(`Checking flight ${flightIata}...`);

      const airlabsRes = await fetch(`https://airlabs.co/api/v9/flights?api_key=${airlabsKey}&flight_iata=${flightIata}`);

      if (!airlabsRes.ok) {
        console.warn(`AirLabs API error for ${flightIata}: ${airlabsRes.statusText}`);
        continue; // Skip and try the next one
      }

      const data = await airlabsRes.json();

      if (data && data.response && data.response.length > 0) {
        // AirLabs status translation: 'en-route', 'scheduled', 'landed', 'cancelled', 'delayed'
        const flightData = data.response[0]; // Get the first match
        let newStatus = flight.status;

        switch (flightData.status) {
          case 'en-route':
          case 'active':
            newStatus = flightData.delayed ? 'Delayed' : 'En Route';
            break;
          case 'scheduled':
            newStatus = flightData.delayed ? 'Delayed' : 'Scheduled';
            break;
          case 'landed':
            newStatus = 'Landed';
            break;
          case 'cancelled':
            newStatus = 'Cancelled';
            break;
          default:
            // Keep previous status for unknown states
            newStatus = flight.status;
        }

        // Let's also guess if it's arriving soon by checking altitude or status speed if en-route, but 'En Route' or 'Delayed' is enough for Operation Hub.

        // Check if there is a change to avoid unnecessary DB writes
        if (newStatus !== flight.status) {
          console.log(`Flight ${flight.number} changed status from ${flight.status} to ${newStatus}`);

          const { error: updateError } = await supabaseClient
            .from('flights')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', flight.id);

          if (updateError) {
            console.error(`Error updating flight ${flight.number}:`, updateError);
          } else {
            results.push({ flight: flight.number, oldStatus: flight.status, newStatus });
          }
        }
      } else {
        console.log(`No live radar tracking found directly right now for ${flight.number}`);
      }
    }

    return new Response(JSON.stringify({ message: "Sync complete", updated: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error("Sync-flights error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
