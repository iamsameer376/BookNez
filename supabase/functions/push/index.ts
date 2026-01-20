// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from "npm:web-push@3.6.7"
import { createClient } from "npm:@supabase/supabase-js@2"

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

        if (!record || !record.recipient_id) {
            console.log("No recipient_id in record or invalid payload");
            return new Response(JSON.stringify({ message: "No recipient_id in record" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: subs, error } = await supabase
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', record.recipient_id)

        if (error || !subs || subs.length === 0) {
            console.log(`No subscriptions found for user ${record.recipient_id}`)
            return new Response(JSON.stringify({ message: "No subscriptions found" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const vapidKeys = {
            publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
            privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
            subject: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@booknex.com'
        }

        webpush.setVapidDetails(
            vapidKeys.subject,
            vapidKeys.publicKey,
            vapidKeys.privateKey
        )

        const notificationPayload = JSON.stringify({
            title: record.title || 'New Notification',
            body: record.message || 'You have a new update.',
            url: record.link || '/'
        })

        const promises = subs.map(sub => {
            return webpush.sendNotification(sub.subscription, notificationPayload)
                .catch(err => {
                    if (err.statusCode === 410) {
                        console.log('Subscription expired/gone')
                    } else {
                        console.error('Push error', err)
                    }
                })
        })

        await Promise.all(promises)

        return new Response(JSON.stringify({ message: `Sent ${promises.length} notifications` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Edge Function Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
