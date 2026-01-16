import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Heart } from 'lucide-react';
import { VenueCard } from '@/components/VenueCard';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateDistance } from '@/utils/distance';
import { useGeoLocation } from '@/hooks/useGeoLocation';

const FavoriteVenues = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { favorites, loading: loadingFavorites } = useFavorites();
    const [favoriteVenues, setFavoriteVenues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { location } = useGeoLocation();

    useEffect(() => {
        const fetchFavoriteVenues = async () => {
            if (favorites.length === 0) {
                setFavoriteVenues([]);
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('venue_with_stats' as any)
                    .select('*')
                    .in('id', favorites)
                    .eq('is_active', true);

                if (error) throw error;
                setFavoriteVenues(data || []);
            } catch (error) {
                console.error('Error fetching favorite venues:', error);
            } finally {
                setLoading(false);
            }
        };

        if (!loadingFavorites) {
            fetchFavoriteVenues();
        }
    }, [favorites, loadingFavorites]);

    if (loading || loadingFavorites) {
        return (
            <div className="min-h-screen grid place-items-center">
                <div className="animate-pulse flex flex-col items-center">
                    <Heart className="h-12 w-12 text-muted-foreground animate-bounce" />
                    <p className="mt-4 text-muted-foreground">Loading your favorites...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 pb-20">
            <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/dashboard/user')}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <h1 className="text-xl font-bold">My Favorites</h1>
                    <div className="w-20" /> {/* Spacer for centering */}
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {favoriteVenues.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                        <div className="bg-muted/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Heart className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold">No Favorites Yet</h2>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            Start exploring and heart the venues you love to keep them handy here!
                        </p>
                        <Button
                            onClick={() => navigate('/dashboard/user')}
                            className="mt-4"
                            size="lg"
                        >
                            Explore Venues
                        </Button>
                    </div>
                ) : (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <AnimatePresence>
                            {favoriteVenues.map((venue, index) => (
                                <motion.div
                                    key={venue.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.1 }}
                                    layout
                                >
                                    <VenueCard
                                        id={venue.id}
                                        name={venue.name}
                                        image={venue.photos[0] || '/placeholder.svg'}
                                        rating={venue.average_rating || 0}
                                        price={Number(venue.pricing)}
                                        distance={
                                            location.loaded && location.coordinates
                                                ? calculateDistance(
                                                    location.coordinates.lat,
                                                    location.coordinates.lng,
                                                    venue.latitude || 0,
                                                    venue.longitude || 0
                                                )
                                                : null
                                        }
                                        category={venue.category}
                                        amenities={venue.amenities.slice(0, 3)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>
        </div>
    );
};

export default FavoriteVenues;
