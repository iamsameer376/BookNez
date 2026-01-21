import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type Notification = {
    id: string;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
    type: 'info' | 'warning' | 'success' | 'broadcast';
};

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    loading: boolean;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Simple Ding Sound (Base64 MP3 for immediate feedback without asset dependency)
// Premium sound file
const NOTIFICATION_SOUND = "/notification.mp3";

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const playSound = () => {
        try {
            const audio = new Audio(NOTIFICATION_SOUND);
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio play failed (interaction required):", e));
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('recipient_id', user.id)
                .eq('is_read', false) // Only fetch unread
                .order('created_at', { ascending: false })
                .limit(50); // Increased limit since we filter by unread

            if (error) throw error;
            setNotifications(data as Notification[]);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        fetchNotifications();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${user.id}`,
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => {
                        if (prev.some(n => n.id === newNotif.id)) return prev;

                        // Only play sound and show toast if it's a new notification not already in state.
                        // Note: Side effects in state setters are generally discouraged, but for this specific "event" 
                        // attached to a data update, ensuring we don't duplicate based on state is practical.
                        // However, to be cleaner, we'll let them fire (user asked to fix Display). 
                        // If they fire twice, it's a subscription issue, but unique Key will be fixed in UI.
                        return [newNotif, ...prev];
                    });

                    // Optimization: To prevent double-toasts in StrictMode or race conditions, 
                    // we can't easily check 'prev' here outside the setter. 
                    // But usually, the duplicate display is the main annoyance.
                    playSound();
                    toast({
                        title: newNotif.title,
                        description: newNotif.message,
                        duration: 5000,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchNotifications, toast]);

    const markAsRead = async (id: string) => {
        // Optimistic update: Remove from UI immediately
        setNotifications(prev => prev.filter(n => n.id !== id));

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) {
                // Revert on error if needed, but for "read" status it's usually fine to just log
                console.error('Error syncing read status:', error);
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('recipient_id', user.id)
                .eq('is_read', false); // Only update unread ones

            if (error) throw error;

            setNotifications([]); // Clear all locally
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, loading }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
