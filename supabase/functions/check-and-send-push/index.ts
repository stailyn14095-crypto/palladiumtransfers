import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import webpush from "npm:web-push@3.6.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:info@palladiumtransfers.com'

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("Missing VAPID keys in environment variables")
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const now = new Date()
    const lookaheadDate = new Date(now.getTime() + 70 * 60 * 1000)

    // Fetch confirmed bookings within the window
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select('*, driver:driver_id(*)')
      .eq('status', 'Confirmed')
      .lte('pickup_date', lookaheadDate.toISOString().split('T')[0])
      .not('driver_id', 'is', null)

    if (bookingsError) throw bookingsError

    const notificationsSent = []

    for (const booking of bookings || []) {
        const [hours, minutes] = booking.pickup_time.split(':').map(Number)
        const pickupDateTime = new Date(booking.pickup_date)
        pickupDateTime.setHours(hours, minutes, 0, 0)

        const diffMinutes = Math.floor((pickupDateTime.getTime() - now.getTime()) / 60000)
        
        // Define notification slots
        let slot = null
        let message = ''

        if (diffMinutes <= 60 && diffMinutes > 50) {
            slot = '60m'
            message = `Recordatorio: Tienes un servicio en 1 hora (${booking.pickup_time})`
        } else if (diffMinutes <= 30 && diffMinutes > 20) {
            slot = '30m'
            message = `¡Atención! Falta media hora (${booking.pickup_time}) y no has iniciado el trayecto.`
        } else if (diffMinutes <= 20 && diffMinutes > 10) {
            slot = '20m'
            message = `AVISO: Faltan 20 min para el traslado. Por favor, indica que vas "En Camino".`
        } else if (diffMinutes <= 10 && diffMinutes > 0) {
            slot = '10m'
            message = `URGENTE: El servicio empieza en 10 min. Confirmar estado "En Camino".`
        }

        if (!slot) continue

        // Check if already sent for this slot
        const sentSlots = booking.push_notifications_sent || {}
        if (sentSlots[slot]) continue

        // For slots < 60, only send if NOT "En Camino" (or similar started status)
        // Note: DriverAppView updates driver status, but we should check booking status or driver current status
        // Usually, when a driver is "En Camino", they change the booking specific state or their own shift state.
        // Assuming there is a field or we check the driver status
        if (slot !== '60m') {
            const { data: driver } = await supabaseClient
                .from('drivers')
                .select('current_status')
                .eq('id', booking.driver_id)
                .single()
            
            if (driver && driver.current_status === 'En Camino') {
                continue // Already on the way, skip notification
            }
        }

        // Get driver's subscription
        const { data: subData } = await supabaseClient
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', booking.driver?.user_id) // We need user_id from auth, which is linked to drivers
            .single()

        if (!subData) continue

        try {
            await webpush.sendNotification(
                subData.subscription,
                JSON.stringify({
                    title: 'Palladium Transfers - Aviso',
                    body: message,
                    url: '/driver-app' // Link to driver app
                })
            )

            // Mark as sent
            sentSlots[slot] = new Date().toISOString()
            await supabaseClient
                .from('bookings')
                .update({ push_notifications_sent: sentSlots })
                .eq('id', booking.id)

            notificationsSent.push({ bookingId: booking.id, slot, driver: booking.driver?.nombre })
        } catch (pushErr) {
            console.error(`Error sending push to ${booking.driver?.nombre}:`, pushErr)
        }
    }

    return new Response(JSON.stringify({ message: "Check complete", notificationsSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error("check-and-send-push error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
