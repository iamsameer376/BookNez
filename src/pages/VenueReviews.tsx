
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Star, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReviewList } from '@/components/reviews/ReviewList';
import { AddReviewDialog } from '@/components/reviews/AddReviewDialog';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';

type Venue = Tables<'venues'>;

const VenueReviews = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [venue, setVenue] = useState<Venue | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const fetchVenue = useCallback(async () => {
        if (!id) return;
        const { data } = await supabase
            .from('venues')
            .select('*')
            .eq('id', id)
            .single();

        if (data) setVenue(data as Venue);
    }, [id]);

    useEffect(() => {
        fetchVenue();
    }, [fetchVenue]);

    if (!venue) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Venue
                    </Button>
                    <h1 className="font-semibold text-lg hidden md:block">{venue.name} Reviews</h1>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="space-y-8">
                    {/* Venue Summary Card */}
                    <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">{venue.name}</h2>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4 text-red-500" />
                                <span className="text-sm">{venue.address}</span>
                            </div>
                        </div>

                        {user && (
                            <AddReviewDialog
                                venueId={venue.id}
                                userId={user.id}
                                onReviewAdded={() => setRefreshTrigger(prev => prev + 1)}
                            />
                        )}
                    </div>

                    {/* Review List */}
                    <ReviewList venueId={venue.id} refreshTrigger={refreshTrigger} />
                </div>
            </main>
        </div>
    );
};

export default VenueReviews;
