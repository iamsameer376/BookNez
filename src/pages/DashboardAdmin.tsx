import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, XCircle, LogOut, MapPin, Clock, AlertTriangle, Eye, Calendar, User, Info, DollarSign } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
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
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Sub-component: Venue Detail Modal
const VenueDetailDialog = ({ venue, isOpen, onClose, onApprove, onReject }: { venue: any, isOpen: boolean, onClose: () => void, onApprove: () => void, onReject: () => void }) => {
    if (!venue) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <div className="flex justify-between items-center mr-8">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                {venue.name}
                                <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-600 border-orange-200">
                                    Pending Approval
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-2 mt-1">
                                <Clock className="h-3 w-3" /> Submitted on {new Date(venue.created_at).toLocaleString()}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-8">
                        {/* Photos Carousel */}
                        {venue.photos && venue.photos.length > 0 ? (
                            <Carousel className="w-full max-w-3xl mx-auto">
                                <CarouselContent>
                                    {venue.photos.map((photo: string, index: number) => (
                                        <CarouselItem key={index}>
                                            <div className="p-1">
                                                <div className="overflow-hidden rounded-xl aspect-video border bg-muted relative">
                                                    <img src={photo} alt={`${venue.name} ${index + 1}`} className="w-full h-full object-cover" />
                                                    <Badge className="absolute bottom-2 right-2 bg-black/60">{index + 1} / {venue.photos.length}</Badge>
                                                </div>
                                            </div>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <CarouselPrevious className="left-2" />
                                <CarouselNext className="right-2" />
                            </Carousel>
                        ) : (
                            <div className="w-full aspect-video bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                                No Photos Provided
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Left Column: Details */}
                            <div className="md:col-span-2 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                                        <Info className="h-4 w-4 text-primary" /> About Venue
                                    </h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {venue.description || "No description provided."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-secondary/10 border space-y-1">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Category</p>
                                        <p className="font-semibold capitalize">{venue.category}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-secondary/10 border space-y-1">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Price</p>
                                        <p className="font-semibold flex items-center">
                                            <DollarSign className="h-3 w-3 mr-1" /> {venue.pricing} <span className="text-xs text-muted-foreground ml-1 font-normal">/ hour</span>
                                        </p>
                                    </div>
                                    <div className="col-span-2 p-4 rounded-lg bg-secondary/10 border space-y-1">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Location</p>
                                        <p className="font-semibold flex items-center">
                                            <MapPin className="h-3 w-3 mr-1" /> {venue.address}
                                        </p>
                                    </div>
                                </div>

                                {venue.amenities && venue.amenities.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3">Amenities</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {venue.amenities.map((amenity: string) => (
                                                <Badge key={amenity} variant="secondary" className="px-3 py-1">
                                                    {amenity}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Owner & Meta */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader className="pb-3 text-center bg-muted/30">
                                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2 text-primary">
                                            <User className="h-6 w-6" />
                                        </div>
                                        <CardTitle className="text-base">Owner Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 text-sm space-y-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Full Name</p>
                                            <p className="font-medium">{venue.profiles?.full_name || 'N/A'}</p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Email</p>
                                            <p className="font-medium">{venue.profiles?.email || 'N/A'}</p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Phone</p>
                                            <p className="font-medium">{venue.profiles?.phone || 'N/A'}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t bg-muted/10 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="destructive" className="flex-1 sm:flex-none" onClick={onReject}>
                            <XCircle className="h-4 w-4 mr-2" /> Reject Venue
                        </Button>
                        <Button className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700" onClick={onApprove}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Approve Venue
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Sub-component for Pending Cards (Updated)
const VenueApprovalCard = ({ venue, onViewDetails }: { venue: any, onViewDetails: () => void }) => (
    <Card className="overflow-hidden border-orange-200 shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={onViewDetails}>
        <div className="h-40 bg-zinc-100 relative">
            {venue.photos && venue.photos[0] ? (
                <img src={venue.photos[0]} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No Image</div>
            )}
            <Badge className="absolute top-2 right-2 bg-orange-500 shadow-sm">Pending</Badge>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Badge variant="secondary" className="pointer-events-none">View Details</Badge>
            </div>
        </div>
        <CardHeader>
            <CardTitle className="flex justify-between items-start truncate">
                <span className="truncate">{venue.name}</span>
            </CardTitle>
            <CardDescription className="flex flex-col gap-1">
                <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /> {venue.address}</span>
            </CardDescription>
        </CardHeader>
        <CardFooter className="bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1 w-full justify-center">
                <Clock className="h-3 w-3" /> Submitted {new Date(venue.created_at).toLocaleDateString()}
            </div>
        </CardFooter>
    </Card>
);

// Sub-component for All Venues
const VenueManageCard = ({ venue, onPause, onDelete, onEdit }: { venue: any, onPause: () => void, onDelete: () => void, onEdit: () => void }) => {
    const statusColors = {
        approved: "bg-green-500",
        rejected: "bg-red-500",
        paused: "bg-yellow-500",
        pending: "bg-orange-500"
    };

    return (
        <Card className="overflow-hidden">
            <div className="h-40 bg-zinc-100 relative">
                {venue.photos && venue.photos[0] ? (
                    <img src={venue.photos[0]} alt={venue.name} className="w-full h-full object-cover grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all" />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No Image</div>
                )}
                <Badge className={`absolute top-2 right-2 ${statusColors[venue.status as keyof typeof statusColors]}`}>
                    {venue.status.toUpperCase()}
                </Badge>
            </div>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">{venue.name}</CardTitle>
                <CardDescription className="text-xs">{venue.category} • {venue.address}</CardDescription>
            </CardHeader>
            <CardFooter className="flex gap-2">
                {venue.status !== 'rejected' && (
                    <>
                        <Button variant="outline" size="sm" className="flex-1" onClick={onPause}>
                            {venue.status === 'paused' ? 'Resume' : 'Pause'}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
                            Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 text-destructive hover:bg-destructive/10" onClick={onDelete}>
                            Delete
                        </Button>
                    </>
                )}
            </CardFooter>
        </Card>
    );
};

const DashboardAdmin = () => {
    const { user, signOut, hasRole } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [pendingVenues, setPendingVenues] = useState<any[]>([]);
    const [allVenues, setAllVenues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("pending");
    const [venueToDelete, setVenueToDelete] = useState<string | null>(null);
    const [selectedVenue, setSelectedVenue] = useState<any>(null); // For detail view

    useEffect(() => {
        const checkAccess = async () => {
            // ... access check logic ...
            if (!user) { navigate('/login/admin'); return; }
            const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').single();
            if (!data) navigate('/login/admin');
        };
        checkAccess();
        fetchVenues();
    }, [user, navigate]);

    const fetchVenues = async () => {
        // ... fetch logic ...
        try {
            setLoading(true);
            const { data, error } = await supabase.from('venues').select('*, profiles:owner_id(full_name, email, phone)').order('created_at', { ascending: false });
            if (error) throw error;
            setAllVenues(data || []);
            setPendingVenues(data?.filter((v: any) => v.status === 'pending') || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const updateVenueStatus = async (venueId: string, status: 'approved' | 'rejected' | 'paused') => {
        try {
            const { data, error } = await supabase
                .from('venues')
                .update({ status })
                .eq('id', venueId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error("Permission denied: Unable to update venue status. Please check Database RLS policies.");
            }

            toast({ title: "Success", description: `Venue has been ${status}` });
            fetchVenues();
            if (selectedVenue?.id === venueId) setSelectedVenue(null); // Close modal if open
        } catch (error: any) {
            console.error('Update error:', error);
            const msg = error.message || "Failed to update status";
            toast({ title: "Error", description: msg, variant: "destructive" });
        }
    };

    const deleteVenue = async (venueId: string) => {
        // ... delete logic ...
        try {
            // ... cascade deletes ...
            const { error: bookingsError } = await supabase.from('bookings').delete().eq('venue_id', venueId);
            if (bookingsError) throw bookingsError;
            const { error: pricingError } = await supabase.from('venue_pricing').delete().eq('venue_id', venueId);
            if (pricingError) throw pricingError;

            const { data, error } = await supabase.from('venues').delete().eq('id', venueId).select();
            if (error) throw error;
            if (!data || data.length === 0) throw new Error("RLS Error");
            toast({ title: "Venue deleted", description: "Permanently removed." });
            fetchVenues();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not delete.", variant: "destructive" });
        } finally { setVenueToDelete(null); }
    };

    const handleSignOut = async () => { await signOut(); navigate('/login/admin'); };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

    return (
        <PageTransition>
            <div className="min-h-screen bg-background">
                <header className="border-b bg-card">
                    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-destructive">BookNex Admin</h1>
                            <Badge variant="outline" className="border-red-500 text-red-500">ADMIN MODE</Badge>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive"><LogOut className="h-4 w-4 mr-2" /> Sign Out</Button>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-8">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight">Venue Management</h2>
                                <p className="text-muted-foreground">Review and manage venue submissions</p>
                            </div>
                            <TabsList>
                                <TabsTrigger value="pending" className="relative">
                                    Pending Approval
                                    {pendingVenues.length > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">{pendingVenues.length}</span>}
                                </TabsTrigger>
                                <TabsTrigger value="all">All Venues</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="pending" className="space-y-4">
                            {pendingVenues.length === 0 ? (
                                <Card className="p-12 text-center text-muted-foreground">
                                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600"><CheckCircle className="h-6 w-6" /></div>
                                    <h3 className="text-lg font-semibold text-foreground">All Caught Up!</h3>
                                    <p>No pending venue submissions needing approval.</p>
                                </Card>
                            ) : (
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {pendingVenues.map((venue) => (
                                        <VenueApprovalCard
                                            key={venue.id}
                                            venue={venue}
                                            onViewDetails={() => setSelectedVenue(venue)}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="all">
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {allVenues.map((venue) => (
                                    <VenueManageCard
                                        key={venue.id}
                                        venue={venue}
                                        onPause={() => updateVenueStatus(venue.id, venue.status === 'paused' ? 'approved' : 'paused')}
                                        onDelete={() => setVenueToDelete(venue.id)}
                                        onEdit={() => navigate(`/owner/venues/${venue.id}`)}
                                    />
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>

            <AlertDialog open={!!venueToDelete} onOpenChange={(open) => !open && setVenueToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the venue and remove all associated data (bookings, pricing, etc.) from our servers.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => venueToDelete && deleteVenue(venueToDelete)}>Delete Venue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <VenueDetailDialog
                venue={selectedVenue}
                isOpen={!!selectedVenue}
                onClose={() => setSelectedVenue(null)}
                onApprove={() => selectedVenue && updateVenueStatus(selectedVenue.id, 'approved')}
                onReject={() => selectedVenue && updateVenueStatus(selectedVenue.id, 'rejected')}
            />
        </PageTransition>
    );
};

export default DashboardAdmin;
