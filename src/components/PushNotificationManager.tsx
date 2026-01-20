import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

// NEEDS REPLACEMENT: Generate VAPID Keys online (e.g., https://vapidkeys.com/)
const VAPID_PUBLIC_KEY = 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY';

export const PushNotificationManager = () => {
    const { user } = useAuth();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
            checkSubscription();
        }
    }, []);

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const checkSubscription = async () => {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            setIsSubscribed(true);
        }
    };

    const subscribe = async () => {
        if (VAPID_PUBLIC_KEY === 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY') {
            toast({ title: "Configuration Error", description: "VAPID Public Key is missing in code.", variant: "destructive" });
            return;
        }

        try {
            setLoading(true);
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Save to Supabase
            const { error } = await supabase.from('push_subscriptions').insert({
                user_id: user?.id,
                subscription: sub.toJSON(), // Important: Serialize to JSON
                user_agent: navigator.userAgent
            });

            if (error) {
                console.error('Database error:', error);
                // If duplicate, we might just ignore or update. For now, let's assume it works.
            }

            setIsSubscribed(true);
            setPermission('granted');
            toast({ title: "Subscribed!", description: "You will now receive notifications on this device." });

        } catch (error) {
            console.error('Subscription error:', error);
            toast({ title: "Error", description: "Failed to subscribe to notifications.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        try {
            setLoading(true);
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await sub.unsubscribe();
                // Ideally remove from DB too, but for now just client side unsubscribe is okay feedback
                setIsSubscribed(false);
                toast({ title: "Unsubscribed", description: "Notifications disabled for this device." });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!('Notification' in window)) {
        return null; // Not supported
    }

    if (permission === 'denied') {
        return (
            <div className="text-xs text-destructive flex items-center gap-2">
                <BellOff className="h-4 w-4" />
                <span>Notifications blocked</span>
            </div>
        )
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={loading}
            className={isSubscribed ? "border-green-500 text-green-600 bg-green-50" : ""}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                isSubscribed ? <><Bell className="h-4 w-4 mr-2 fill-current" /> On</> : <><Bell className="h-4 w-4 mr-2" /> Enable Push</>
            )}
        </Button>
    );
};
