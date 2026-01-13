import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Star, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Review {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    reply?: string;
    profiles: { full_name: string };
    venues: { name: string };
}

const OwnerReviews = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    const fetchReviews = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch venues owned by user first
            const { data: venues } = await supabase
                .from('venues')
                .select('id')
                .eq('owner_id', user.id);

            if (venues && venues.length > 0) {
                const venueIds = venues.map(v => v.id);
                const { data, error } = await supabase
                    .from('reviews')
                    .select(`
            *,
            profiles(full_name),
            venues(name)
          `)
                    .in('venue_id', venueIds)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setReviews(data as any);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReplySubmit = async (reviewId: string) => {
        try {
            if (!replyText[reviewId]?.trim()) return;

            const { error } = await supabase
                .from('reviews')
                .update({
                    reply: replyText[reviewId],
                    reply_at: new Date().toISOString()
                })
                .eq('id', reviewId);

            if (error) throw error;

            toast({
                title: "Reply posted",
                description: "Your response is now visible to the customer.",
            });

            setReplyingTo(null);
            fetchReviews();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        fetchReviews();

        // Realtime subscription for ALL venues owned by user would be complex here
        // simpler to just poll or refresh on action properly for now
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <header className="bg-white dark:bg-slate-900 border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/owner')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Customer Reviews</h1>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {loading ? (
                    <p className="text-center text-muted-foreground p-8">Loading feedback...</p>
                ) : (
                    <div className="space-y-6">
                        <AnimatePresence>
                            {reviews.map((review) => (
                                <motion.div
                                    key={review.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm"
                                >
                                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-lg">{review.venues?.name}</span>
                                                <span className="text-muted-foreground">•</span>
                                                <span className="text-sm text-slate-500">{formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={`w-4 h-4 ${star <= review.rating ? 'fill-yellow-400 text-yellow-500' : 'text-gray-200'}`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">by {review.profiles?.full_name || 'Guest User'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-slate-700 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                        "{review.comment}"
                                    </p>

                                    <div className="border-t pt-4">
                                        {review.reply ? (
                                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                                                <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wide flex items-center gap-1">
                                                    <MessageSquare className="w-3 h-3" />
                                                    Your Reply
                                                </p>
                                                <p className="text-sm text-slate-700 dark:text-slate-300">{review.reply}</p>
                                            </div>
                                        ) : (
                                            <div>
                                                {replyingTo === review.id ? (
                                                    <div className="space-y-3">
                                                        <Textarea
                                                            placeholder="Type your response here..."
                                                            value={replyText[review.id] || ''}
                                                            onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })}
                                                            className="w-full"
                                                        />
                                                        <div className="flex gap-2">
                                                            <Button size="sm" onClick={() => handleReplySubmit(review.id)}>Post Reply</Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>Cancel</Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Button variant="outline" size="sm" onClick={() => setReplyingTo(review.id)}>
                                                        Reply to this review
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {reviews.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No reviews found for your venues yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default OwnerReviews;
