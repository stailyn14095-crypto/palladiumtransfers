import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import webpush from "npm:web-push@3.6.4";

const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

webpush.setVapidDetails(
   'mailto:admin@palladiumtransfers.com',
   Deno.env.get('VAPID_PUBLIC_KEY') || '',
   Deno.env.get('VAPID_PRIVATE_KEY') || ''
);

serve(async (req) => {
   if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
   }

   try {
      const supabase = createClient(
         Deno.env.get('SUPABASE_URL') ?? '',
         Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { driver_id, message, title = "Aviso de Operaciones" } = await req.json();

      if (!driver_id || !message) {
         throw new Error("Missing driver_id or message");
      }

      // 1. Get driver's user_id
      const { data: driver } = await supabase
         .from('drivers')
         .select('user_id')
         .eq('id', driver_id)
         .single();

      if (!driver || !driver.user_id) {
         return new Response(JSON.stringify({ success: true, message: "Driver not linked to user, no push sent." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
      }

      // 2. Get active push subscriptions for this user
      const { data: subs } = await supabase
         .from('push_subscriptions')
         .select('subscription')
         .eq('user_id', driver.user_id);

      if (!subs || subs.length === 0) {
         return new Response(JSON.stringify({ success: true, message: "No push subscriptions found for driver." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
      }

      // 3. Send Push
      const payload = JSON.stringify({
         title,
         body: message,
         icon: '/icon-192.png',
         url: '/app'
      });

      let sentCount = 0;
      for (const sub of subs) {
         try {
            await webpush.sendNotification(sub.subscription, payload);
            sentCount++;
         } catch (error: any) {
            console.error("Error sending push:", error);
            if (error.statusCode === 410 || error.statusCode === 404) {
               await supabase
                  .from('push_subscriptions')
                  .delete()
                  .eq('subscription->>endpoint', sub.subscription.endpoint);
            }
         }
      }

      return new Response(JSON.stringify({ success: true, sent: sentCount }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

   } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 400,
      });
   }
});
