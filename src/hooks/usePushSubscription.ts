import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const VAPID_PUBLIC_KEY = 'BPkAQjU4i25Cis5ArpvIxo28GgqGS9kQD8Pki8qyZjQLMhV8lNJpudtt4jKL6Mn1RZVnQrPewaJYfVDGqqUovvA';

export const usePushSubscription = () => {
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
        if (!('serviceWorker' in navigator)) return;

        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            setIsSubscribed(true);
        } else {
            setIsSubscribed(false);
        }
    };

    const subscribe = async (userIdOverride?: string) => {
        const targetUserId = userIdOverride || user?.id;

        if (!targetUserId) {
            console.warn("Cannot subscribe without user ID");
            return;
        }

        try {
            setLoading(true);
            if (!('serviceWorker' in navigator)) {
                throw new Error('Service workers are not supported');
            }

            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Save to Supabase
            const { error } = await supabase.from('push_subscriptions').insert({
                user_id: targetUserId,
                subscription: sub.toJSON(),
                user_agent: navigator.userAgent
            });

            if (error) {
                console.error('Database error:', error);
                // If duplicate/error we might still consider them subscribed locally
            }

            setIsSubscribed(true);
            setPermission('granted');
            // toast({ title: "Subscribed!", description: "You will now receive notifications on this device." });
            // Commenting out toast to be less intrusive on auto-login

        } catch (error: any) {
            console.error('Subscription error:', error);
            // Detailed error for debugging
            toast({
                title: "Subscription Failed",
                description: error.message || "Failed to subscribe to notifications.",
                variant: "destructive",
                duration: 5000 // Last longer to read
            });
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        try {
            setLoading(true);
            if (!('serviceWorker' in navigator)) return;

            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await sub.unsubscribe();
                // Ideally remove from DB too
                setIsSubscribed(false);
                toast({ title: "Unsubscribed", description: "Notifications disabled for this device." });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return {
        isSubscribed,
        loading,
        permission,
        subscribe,
        unsubscribe,
        checkSubscription
    };
};
