import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface FavoritesContextType {
    favorites: string[];
    toggleFavorite: (venueId: string) => Promise<void>;
    isFavorite: (venueId: string) => boolean;
    loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch favorites on mount or user change
    useEffect(() => {
        if (!user) {
            setFavorites([]);
            setLoading(false);
            return;
        }

        const fetchFavorites = async () => {
            try {
                const { data, error } = await supabase
                    .from('user_favorites' as any)
                    .select('venue_id')
                    .eq('user_id', user.id);

                if (error) throw error;
                setFavorites(data.map((f: any) => f.venue_id));
            } catch (error) {
                console.error('Error fetching favorites:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [user]);

    const toggleFavorite = useCallback(async (venueId: string) => {
        if (!user) {
            toast.error('Please login to save favorites');
            return;
        }

        const isCurrentlyFavorite = favorites.includes(venueId);

        // Optimistic Update
        setFavorites(prev =>
            isCurrentlyFavorite
                ? prev.filter(id => id !== venueId)
                : [...prev, venueId]
        );

        try {
            if (isCurrentlyFavorite) {
                const { error } = await supabase
                    .from('user_favorites' as any)
                    .delete()
                    .eq('user_id', user.id)
                    .eq('venue_id', venueId);

                if (error) throw error;
                toast.success('Removed from favorites');
            } else {
                const { error } = await supabase
                    .from('user_favorites' as any)
                    .insert({ user_id: user.id, venue_id: venueId });

                if (error) throw error;
                toast.success('Added to favorites');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            // Revert optimistic update on error
            setFavorites(prev =>
                isCurrentlyFavorite
                    ? [...prev, venueId]
                    : prev.filter(id => id !== venueId)
            );
            toast.error('Failed to update favorite');
        }
    }, [user, favorites]);

    const isFavorite = useCallback((venueId: string) => {
        return favorites.includes(venueId);
    }, [favorites]);

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, loading }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (context === undefined) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
};
