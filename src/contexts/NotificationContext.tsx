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
const NOTIFICATION_SOUND = "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAADAAALMAAA//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAADAAALMAAA//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAADAAALMAAA//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAADAAALMAAA"; // Placeholder, will replace with better ding if needed, or user can add file. 
// Actually, let's use a real short beep data URI or just rely on a file if present.
// For now, I'll use a standard file path and fail gracefully.
const SOUND_FILE = "/notification.mp3";

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
                .order('created_at', { ascending: false })
                .limit(20);

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
                    setNotifications(prev => [newNotif, ...prev]);
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
        // Optimistic update: Update UI immediately
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );

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

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
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
