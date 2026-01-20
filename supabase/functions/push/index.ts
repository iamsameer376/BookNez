// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from "https://esm.sh/web-push@3.6.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { record } = await req.json()
        // record is the new row from 'notifications' table

        // In a real scenario, we should look up the recipient's subscription from 'push_subscriptions' table
        // using record.recipient_id.
        // For this example, we need Supabase Admin Client to fetch subscription.

        // Initialize Supabase Client (requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars)
        // import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
        // const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

        // const { data: subs } = await supabase.from('push_subscriptions').select('subscription').eq('user_id', record.recipient_id)

        // Prepare Web Push
        // const vapidKeys = {
        //   publicKey: Deno.env.get('VAPID_PUBLIC_KEY'),
        //   privateKey: Deno.env.get('VAPID_PRIVATE_KEY')
        // }
        // webpush.setVapidDetails(
        //   'mailto:admin@booknex.com',
        //   vapidKeys.publicKey,
        //   vapidKeys.privateKey
        // )

        // Send to all subscriptions
        // const promises = subs.map(sub => 
        //   webpush.sendNotification(sub.subscription, JSON.stringify({
        //     title: 'New Notification',
        //     body: record.message,
        //     url: record.link || '/'
        //   }))
        // )
        // await Promise.all(promises)

        return new Response(JSON.stringify({ message: "Notification processed" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
