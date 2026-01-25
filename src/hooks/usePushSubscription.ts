import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const VAPID_PUBLIC_KEY = 'BPkAQjU4i25Cis5ArpvIxo28GgqGS9kQD8Pki8qyZjQLMhV8lNJpudtt4jKL6Mn1RZVnQrPewaJYfVDGqqUovvA';

export const usePushSubscription = () => {
    const { user } = useAuth();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    const checkSubscription = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            // Check database for existing subscription for this user on this platform
            const userAgent = Capacitor.isNativePlatform() ? 'Capacitor Native' : navigator.userAgent;
            const { data, error } = await supabase
                .from('push_subscriptions')
                .select('id')
                .eq('user_id', user.id)
                .eq('user_agent', userAgent)
                .maybeSingle();

            if (data) {
                setIsSubscribed(true);
                setPermission('granted');
            } else {
                setIsSubscribed(false);
                if (!Capacitor.isNativePlatform() && 'Notification' in window) {
                    setPermission(Notification.permission);
                }
            }
        } catch (err) {
            console.error("Error checking subscription status:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        checkSubscription();

        if (Capacitor.isNativePlatform()) {
            // Setup Native Listeners once
            const setupNativeListeners = async () => {
                await PushNotifications.addListener('registration', async (token: Token) => {
                    console.log('Push registration success, token: ' + token.value);
                    if (user) {
                        const { error } = await supabase.from('push_subscriptions').upsert({
                            user_id: user.id,
                            subscription: { native_token: token.value, platform: Capacitor.getPlatform() },
                            user_agent: 'Capacitor Native'
                        }, { onConflict: 'user_id, user_agent' });

                        if (!error) {
                            setIsSubscribed(true);
                            setPermission('granted');
                        }
                    }
                });

                await PushNotifications.addListener('registrationError', (error: any) => {
                    console.error('Error on registration: ' + JSON.stringify(error));
                    toast({
                        title: "Registration Failed",
                        description: "Failed to register for push notifications. Ensure Firebase is configured.",
                        variant: "destructive"
                    });
                });

                await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
                    console.log('Push action performed: ' + JSON.stringify(notification));
                });
            };

            setupNativeListeners();

            return () => {
                PushNotifications.removeAllListeners();
            };
        }
    }, [user, checkSubscription]);

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

    const subscribeNative = async () => {
        try {
            let perm = await PushNotifications.checkPermissions();
            if (perm.receive !== 'granted') {
                perm = await PushNotifications.requestPermissions();
            }

            if (perm.receive !== 'granted') {
                throw new Error("Push notification permission denied");
            }

            await PushNotifications.register().catch(err => {
                console.error("Native push registration failed", err);
                throw new Error("Push registration failed. Please ensure Firebase is configured.");
            });
        } catch (error: any) {
            console.error('Native subscription error:', error);
            toast({
                title: "Subscription Failed",
                description: error.message || "Failed to enable notifications.",
                variant: "destructive"
            });
            throw error;
        }
    };

    const subscribeWeb = async (userId: string) => {
        try {
            if (!('serviceWorker' in navigator)) {
                throw new Error('Service workers are not supported');
            }

            const reg = await navigator.serviceWorker.ready;
            if (!reg.pushManager) {
                throw new Error('Push notifications are not supported on this device/browser.');
            }

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            const { error } = await supabase.from('push_subscriptions').insert({
                user_id: userId,
                subscription: sub.toJSON(),
                user_agent: navigator.userAgent
            });

            if (error) console.error('Database error:', error);

            setIsSubscribed(true);
            setPermission('granted');
        } catch (error: any) {
            console.error('Web subscription error:', error);
            toast({
                title: "Subscription Failed",
                description: error.message || "Failed to subscribe to notifications.",
                variant: "destructive"
            });
            throw error;
        }
    };

    const subscribe = async (userIdOverride?: string) => {
        const targetUserId = userIdOverride || user?.id;
        if (!targetUserId) return;

        setLoading(true);
        try {
            if (Capacitor.isNativePlatform()) {
                await subscribeNative();
            } else {
                await subscribeWeb(targetUserId);
            }
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userAgent = Capacitor.isNativePlatform() ? 'Capacitor Native' : navigator.userAgent;
            await supabase.from('push_subscriptions')
                .delete()
                .eq('user_id', user.id)
                .eq('user_agent', userAgent);

            if (!Capacitor.isNativePlatform()) {
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager?.getSubscription();
                if (sub) await sub.unsubscribe();
            }

            setIsSubscribed(false);
            toast({ title: "Unsubscribed", description: "Notifications disabled." });
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


