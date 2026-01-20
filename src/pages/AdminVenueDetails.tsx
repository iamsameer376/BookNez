import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
    Clock, MapPin, User, Info, DollarSign, CheckCircle, XCircle,
    ArrowLeft, ShieldAlert, Building2, Calendar, Star, Phone, Mail, MessageSquare
} from 'lucide-react';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageTransition from '@/components/PageTransition';
import { motion } from 'framer-motion';

const AdminVenueDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [venue, setVenue] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Notification State
    const [isNotifyOpen, setIsNotifyOpen] = useState(false);
    const [notifyMessage, setNotifyMessage] = useState('');
    const [isSendingNotification, setIsSendingNotification] = useState(false);

    const handleNotifyOwner = async () => {
        if (!notifyMessage.trim()) return;
        setIsSendingNotification(true);
        try {
            const { error } = await supabase.from('notifications').insert({
                recipient_id: venue.owner_id,
                title: 'Message from Admin',
                message: notifyMessage,
                type: 'info'
            });
            if (error) throw error;
            toast({ title: "Sent", description: "Message sent to owner." });
            setIsNotifyOpen(false);
            setNotifyMessage('');
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSendingNotification(false);
        }
    };

    useEffect(() => {
        const fetchVenue = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('venues')
                    .select('*, profiles:owner_id(full_name, email, phone)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setVenue(data);
            } catch (error) {
                console.error('Error fetching venue:', error);
                toast({
                    title: "Error",
                    description: "Could not load venue details.",
                    variant: "destructive"
                });
                navigate('/dashboard/admin');
            } finally {
                setLoading(false);
            }
        };

        fetchVenue();
    }, [id, navigate, toast]);

    const updateStatus = async (status: 'approved' | 'rejected' | 'paused') => {
        if (!venue) return;
        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('venues')
                .update({ status })
                .eq('id', venue.id);

            if (error) throw error;

            toast({
                title: "Status Updated",
                description: `Venue has been ${status}.`,
            });
            setVenue({ ...venue, status });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setActionLoading(false);
        }
    };

    const deleteVenue = async () => {
        if (!venue) return;
        setActionLoading(true);
        try {
            // Delete related data first (though cascade might handle it, safer to be explicit or rely on RLS/Cascade)
            const { error: bookingsError } = await supabase.from('bookings').delete().eq('venue_id', venue.id);
            if (bookingsError) console.error("Bookings delete error", bookingsError); // Log but continue

            const { error } = await supabase.from('venues').delete().eq('id', venue.id);
            if (error) throw error;

            toast({ title: "Venue Deleted", description: "Permanently removed from listing." });
            navigate('/dashboard/admin');
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
            setActionLoading(false);
            setShowDeleteDialog(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!venue) return null;

    const statusColors = {
        approved: "bg-green-500 text-white",
        rejected: "bg-red-500 text-white",
        paused: "bg-yellow-500 text-white",
        pending: "bg-orange-500 text-white"
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-primary/5 pb-20">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
                    <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/admin')} className="rounded-full hover:bg-secondary/20">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold flex items-center gap-3">
                                    {venue.name}
                                    <Badge className={`${statusColors[venue.status as keyof typeof statusColors]} hover:${statusColors[venue.status as keyof typeof statusColors]} uppercase tracking-wider text-[10px] px-2 py-0.5 border-none shadow-sm`}>
                                        {venue.status}
                                    </Badge>
                                </h1>
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                    <Building2 className="h-3 w-3" /> {venue.category}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="hidden sm:flex gap-2 border-primary/20 text-primary hover:bg-primary/5 mr-2"
                                onClick={() => setIsNotifyOpen(true)}
                            >
                                <MessageSquare className="h-4 w-4" /> Message Owner
                            </Button>
                            {venue.status === 'rejected' ? (
                                <>
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
                                        disabled={actionLoading}
                                        onClick={() => updateStatus('approved')}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" /> Approve
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => navigate(`/owner/venues/${venue.id}`)}>
                                        Edit
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                                        Delete
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {venue.status === 'pending' ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                className="border-red-200 text-red-600 hover:bg-red-50"
                                                disabled={actionLoading}
                                                onClick={() => updateStatus('rejected')}
                                            >
                                                <XCircle className="h-4 w-4 mr-2" /> Reject
                                            </Button>
                                            <Button
                                                className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
                                                disabled={actionLoading}
                                                onClick={() => updateStatus('approved')}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-2" /> Approve
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                variant="outline"
                                                onClick={() => updateStatus(venue.status === 'paused' ? 'approved' : 'paused')}
                                                disabled={actionLoading}
                                            >
                                                {venue.status === 'paused' ? 'Resume Listing' : 'Pause Listing'}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => navigate(`/owner/venues/${venue.id}`)}>
                                                Edit
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                                                Delete
                                            </Button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-6 py-8 space-y-8">
                    {/* Hero Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: Photos */}
                        <div className="lg:col-span-2 space-y-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/20 bg-card"
                            >
                                {venue.photos && venue.photos.length > 0 ? (
                                    <Carousel className="w-full">
                                        <CarouselContent>
                                            {venue.photos.map((photo: string, index: number) => (
                                                <CarouselItem key={index}>
                                                    <div className="aspect-video relative">
                                                        <img src={photo} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-30" />
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        <CarouselPrevious className="left-4 bg-black/50 text-white border-none hover:bg-black/70" />
                                        <CarouselNext className="right-4 bg-black/50 text-white border-none hover:bg-black/70" />
                                    </Carousel>
                                ) : (
                                    <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground">
                                        No Photos Available
                                    </div>
                                )}
                            </motion.div>

                            <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <Info className="h-5 w-5 text-primary" /> About Venue
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <p className="text-muted-foreground leading-relaxed">
                                        {venue.description || "No description provided."}
                                    </p>

                                    {venue.amenities && venue.amenities.length > 0 && (
                                        <div className="pt-4 border-t border-border/50">
                                            <h3 className="text-sm font-semibold mb-3 text-foreground/80 uppercase tracking-widest">Amenities</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {venue.amenities.map((amenity: string) => (
                                                    <Badge key={amenity} variant="secondary" className="px-3 py-1.5 bg-secondary/30 hover:bg-secondary/50 transition-colors">
                                                        {amenity}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right: Meta Info */}
                        <div className="space-y-6">
                            {/* Key Stats */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="grid gap-4"
                            >
                                <Card className="bg-primary/5 border-primary/10 shadow-sm">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Pricing</p>
                                            <p className="text-2xl font-bold text-primary flex items-baseline">
                                                <DollarSign className="h-4 w-4" />{venue.pricing}
                                                <span className="text-sm font-normal text-muted-foreground ml-1">/ hour</span>
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>


                            {/* Owner Details */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Card className="overflow-hidden border-border/50 shadow-md">
                                    <div className="h-24 bg-gradient-to-br from-secondary/50 to-primary/20" />
                                    <div className="px-6 relative">
                                        <div className="absolute -top-12 left-6 h-24 w-24 rounded-full bg-background p-2 shadow-xl ring-1 ring-border/10">
                                            <div className="h-full w-full rounded-full bg-secondary/20 flex items-center justify-center text-primary">
                                                <User className="h-10 w-10" />
                                            </div>
                                        </div>
                                    </div>
                                    <CardHeader className="pt-16 pb-2 flex flex-row items-center justify-between">
                                        <CardTitle className="text-lg">Owner Information</CardTitle>
                                        <Button size="sm" variant="outline" className="h-8" onClick={() => setIsNotifyOpen(true)}>Message</Button>
                                    </CardHeader>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Message Owner</DialogTitle>
                                            <DialogDescription>
                                                Send a direct notification to {venue.profiles?.full_name || 'the owner'}.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="msg">Message</Label>
                                                <Textarea
                                                    id="msg"
                                                    value={notifyMessage}
                                                    onChange={(e) => setNotifyMessage(e.target.value)}
                                                    placeholder="Type your message..."
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleNotifyOwner} disabled={isSendingNotification}>
                                                {isSendingNotification ? "Sending..." : "Send Message"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10">
                                    <User className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{venue.profiles?.full_name || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10">
                                    <Mail className="h-4 w-4 text-primary" />
                                    <span className="truncate">{venue.profiles?.email || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10">
                                    <Phone className="h-4 w-4 text-primary" />
                                    <span>{venue.profiles?.phone || 'N/A'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Location */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="border-border/50 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-primary" /> Location
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{venue.address}</p>
                                <div className="mt-4 h-32 bg-muted rounded-xl flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border">
                                    Map Preview Unavailable
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <div className="text-center text-xs text-muted-foreground">
                        <p>Submitted: {new Date(venue.created_at).toLocaleString()}</p>
                        <p className="mt-1">ID: {venue.id}</p>
                    </div>

            </div>
        </div>
                </main >

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Venue Permanently?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently remove <span className="font-semibold text-foreground">{venue.name}</span> and all its data.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={deleteVenue}>
                    Yes, Delete Venue
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

{/* Notification Dialog */ }
<Dialog open={isNotifyOpen} onOpenChange={setIsNotifyOpen}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Message Owner</DialogTitle>
            <DialogDescription>
                Send a direct notification to {venue.profiles?.full_name || 'the owner'}.
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="msg">Message</Label>
                <Textarea
                    id="msg"
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    placeholder="Type your message..."
                />
            </div>
        </div>
        <DialogFooter>
            <Button onClick={handleNotifyOwner} disabled={isSendingNotification}>
                {isSendingNotification ? "Sending..." : "Send Message"}
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
            </div >
        </PageTransition >
    );
};

export default AdminVenueDetails;
