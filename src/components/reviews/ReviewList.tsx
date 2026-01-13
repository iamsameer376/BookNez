import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

interface Review {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    reply?: string;
    reply_at?: string;
    profiles: {
        full_name: string;
    };
}

interface ReviewListProps {
    venueId: string;
    refreshTrigger?: number;
}

export const ReviewList = ({ venueId, refreshTrigger = 0 }: ReviewListProps) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ average: 0, total: 0, distinct: [0, 0, 0, 0, 0] });

    const fetchReviews = async () => {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
          *,
          profiles (
            full_name
          )
        `)
                .eq('venue_id', venueId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error fetching reviews:', error);
                throw error;
            }
            setReviews(data as any);
            calculateStats(data as any);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: Review[]) => {
        if (!data.length) {
            setStats({ average: 0, total: 0, distinct: [0, 0, 0, 0, 0] });
            return;
        }
        const total = data.length;
        const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
        const distinct = [0, 0, 0, 0, 0];
        data.forEach(r => {
            if (r.rating >= 1 && r.rating <= 5) distinct[5 - r.rating]++;
        });

        setStats({
            average: Number((sum / total).toFixed(1)),
            total,
            distinct
        });
    };

    useEffect(() => {
        fetchReviews();

        // Realtime subscription
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reviews',
                    filter: `venue_id=eq.${venueId}`
                },
                () => {
                    fetchReviews();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [venueId, refreshTrigger]);

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading reviews...</div>;

    return (
        <div className="space-y-8">
            {/* Detailed Stats / Breakdown - Kept here for expanded view detail */}
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl border flex flex-col md:flex-row gap-8 items-center justify-between">
                <div className="text-center md:text-left">
                    <div className="text-5xl font-bold mb-2 text-primary">{stats.average}</div>
                    <div className="flex items-center gap-1 justify-center md:justify-start mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-5 h-5 ${star <= Math.round(stats.average) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            />
                        ))}
                    </div>
                    <p className="text-muted-foreground text-sm">{stats.total} Reviews</p>
                </div>

                <div className="flex-1 w-full space-y-2 max-w-sm">
                    {[5, 4, 3, 2, 1].map((rating, i) => (
                        <div key={rating} className="flex items-center gap-3 text-xs">
                            <span className="w-3">{rating}</span>
                            <Star className="w-3 h-3 text-gray-400" />
                            <Progress value={stats.total ? (stats.distinct[i] / stats.total) * 100 : 0} className="h-2" />
                            <span className="w-8 text-right text-muted-foreground">{stats.distinct[i]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                <AnimatePresence>
                    {reviews.map((review, index) => (
                        <motion.div
                            key={review.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-card/30 backdrop-blur-sm border p-6 rounded-2xl shadow-sm"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarFallback>{review.profiles?.full_name?.substring(0, 2)?.toUpperCase() || 'GU'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="font-semibold text-sm">{review.profiles?.full_name || 'Guest User'}</h4>
                                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-secondary/10 px-2 py-1 rounded-full">
                                    <span className="font-bold text-sm">{review.rating}</span>
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                </div>
                            </div>

                            <p className="text-sm leading-relaxed text-foreground/90 mb-4 pl-12">
                                {review.comment}
                            </p>

                            {/* Owner Reply */}
                            {review.reply && (
                                <div className="ml-12 mt-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                                    <div className="flex items-center gap-2 mb-2 text-primary text-xs font-bold uppercase tracking-wider">
                                        <MessageCircle className="w-3 h-3" />
                                        Response from Owner
                                    </div>
                                    <p className="text-sm italic text-muted-foreground">{review.reply}</p>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {reviews.length === 0 && (
                    <div className="text-center p-12 bg-card/20 rounded-2xl border border-dashed">
                        <h3 className="text-lg font-medium mb-1">No reviews yet</h3>
                        <p className="text-muted-foreground text-sm">Be the first to share your experience!</p>
                    </div>
                )}
            </div>
        </div>
    );
};
