import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { XCircle, MapPin, Clock, Activity, TrendingUp, Building2, Grid, Search, Users, Mail, Phone, Lock, Unlock } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { motion } from 'framer-motion';

import { SettingsMenu } from '@/components/SettingsMenu';
import { NotificationBell } from '@/components/NotificationBell';
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
import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BellRing } from 'lucide-react';

// --- Sub-components ---

// Sub-component for Pending Cards (Updated)
const VenueApprovalCard = ({ venue, onViewDetails }: { venue: any, onViewDetails: (e?: React.MouseEvent) => void }) => (
    <motion.div
        whileHover={{ y: -6, scale: 1.02 }}
        className="h-full cursor-pointer"
        onClick={onViewDetails}
    >
        <Card className="h-full overflow-hidden border-orange-200/50 dark:border-orange-900/30 shadow-lg hover:shadow-orange-500/20 transition-all duration-300 group bg-card/60 backdrop-blur-md relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="h-48 bg-muted relative overflow-hidden">
                {venue.photos && venue.photos[0] ? (
                    <img src={venue.photos[0]} alt={venue.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground bg-secondary/20">No Image</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />

                <Badge className="absolute top-3 right-3 bg-orange-500 hover:bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.5)] border-none px-3 py-1.5 backdrop-blur-md z-10 transition-colors">
                    Pending Approval
                </Badge>

                <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-xs font-semibold text-orange-200 mb-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Submitted {new Date(venue.created_at).toLocaleDateString()}
                    </p>
                    <h3 className="text-lg font-bold leading-tight truncate text-white drop-shadow-md">{venue.name}</h3>
                </div>

                {/* Hover Overlay Action */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <Button
                        variant="secondary"
                        className="rounded-full px-6 shadow-xl font-semibold transform scale-90 group-hover:scale-100 transition-transform duration-200"
                        onClick={(e) => { e.stopPropagation(); onViewDetails(e); }}
                    >
                        Review Details
                    </Button>
                </div>
            </div>

            <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                        {venue.category}
                    </Badge>
                    <div className="flex items-center text-muted-foreground text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="truncate max-w-[120px]">{venue.profiles?.full_name?.split(' ')[0] || 'Unknown'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{venue.address}</span>
                </div>
            </CardContent>
        </Card>
    </motion.div>
);

// Sub-component for All Venues
const VenueManageCard = ({ venue, onPause, onDelete, onEdit, onApprove }: {
    venue: any,
    onPause: (e: React.MouseEvent) => void,
    onDelete: (e: React.MouseEvent) => void,
    onEdit: (e?: React.MouseEvent) => void,
    onApprove: (e: React.MouseEvent) => void
}) => {
    const statusColors = {
        approved: "bg-green-500",
        rejected: "bg-red-500",
        paused: "bg-yellow-500",
        pending: "bg-orange-500"
    };

    return (
        <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            className="h-full cursor-pointer"
            onClick={onEdit}
        >
            <Card className="h-full overflow-hidden border-border/40 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-2xl hover:shadow-primary/5 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm group">
                <div className="h-44 bg-muted relative overflow-hidden">
                    {venue.photos && venue.photos[0] ? (
                        <img src={venue.photos[0]} alt={venue.name} className={`w-full h-full object-cover transition-all duration-700 ${venue.status === 'paused' || venue.status === 'rejected' ? 'grayscale opacity-70' : ''} group-hover:scale-105`} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground bg-secondary/10">No Image</div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60" />

                    <Badge className={`absolute top-3 right-3 ${statusColors[venue.status as keyof typeof statusColors]} shadow-lg border-none px-3 py-1 capitalize`}>
                        {venue.status}
                    </Badge>

                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                        <h3 className="text-lg font-bold leading-tight truncate drop-shadow-md mb-1">{venue.name}</h3>
                        <p className="text-xs text-white/80 flex items-center gap-1 font-medium">
                            <span className="capitalize">{venue.category}</span> • {venue.address}
                        </p>
                    </div>
                </div>

                <CardFooter className="p-3 bg-secondary/5 border-t border-border/10 grid grid-cols-3 gap-2">
                    {venue.status === 'rejected' ? (
                        <>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold border-green-200/50 text-green-600 hover:bg-green-500 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); onApprove(e); }}>
                                Approve
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-medium hover:border-primary/50 hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); onEdit(e); }}>
                                Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-muted-foreground hover:bg-destructive hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); onDelete(e); }}>
                                Delete
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold hover:border-primary/50 hover:bg-primary/5 transition-colors" onClick={(e) => { e.stopPropagation(); onPause(e); }}>
                                {venue.status === 'paused' ? 'Resume' : 'Pause'}
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-medium hover:border-primary/50 hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); onEdit(e); }}>
                                Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-muted-foreground hover:bg-destructive hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); onDelete(e); }}>
                                Delete
                            </Button>
                        </>
                    )}
                </CardFooter>
            </Card>
        </motion.div>
    );
};

const DashboardSkeleton = () => (
    <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-primary/5 pb-20">
        <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
            </div>
        </header>
        <div className="container mx-auto px-6 py-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-card/50 border border-border/50 animate-pulse" />
                ))}
            </div>
            <div className="space-y-6">
                <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-64 rounded-xl bg-card/50 border border-border/50 animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// --- Sub-component for User Management ---
const UserManagementTab = ({ activeTab }: { activeTab: string }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'owner' | 'admin'>('all');

    useEffect(() => {
        if (activeTab === 'users' && user) {
            fetchUsers();
        }
    }, [activeTab, user]);

    const fetchUsers = async () => {
        if (!user) return;
        try {
            setLoading(true);
            // Fetch profiles with their roles
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesError) throw profilesError;

            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('*');

            if (rolesError) throw rolesError;

            // Fetch venues to identify owners (Fallback for RLS)
            const { data: venueOwners, error: venueError } = await supabase
                .from('venues')
                .select('owner_id');

            const ownerIds = new Set(venueOwners?.map(v => v.owner_id) || []);

            // Merge roles into profiles
            const mergedUsers = profiles.map(profile => {
                const userRole = roles.find(r => r.user_id === profile.id);
                let role = userRole?.role;

                // Force admin role for current user
                if (user && profile.id === user.id) {
                    role = 'admin';
                }
                // Fallback if role is missing (e.g. RLS hidden or new user)
                else if (!role) {
                    if (ownerIds.has(profile.id)) role = 'owner';
                    else role = 'user';
                }

                return { ...profile, role };
            });

            setUsers(mergedUsers);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const toggleBan = async (userId: string, currentStatus: boolean) => {
        try {
            // Optimistic update
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !currentStatus } : u));

            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            toast({
                title: currentStatus ? "User Unbanned" : "User Banned",
                description: `User access has been ${currentStatus ? 'restored' : 'revoked'}.`
            });
        } catch (error: any) {
            console.error('Error toggling ban:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to update ban status",
                variant: "destructive"
            });
            fetchUsers(); // Revert on error
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.phone && user.phone.includes(searchQuery));
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    if (loading) return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-card/50 animate-pulse rounded-xl" />)}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card/40 p-4 rounded-xl border border-border/40 backdrop-blur-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users by name, email, or phone..."
                        className="pl-9 bg-background/50 border-border/50 focus:ring-primary/20"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
                    <SelectTrigger className="w-full md:w-48 bg-background/50">
                        <SelectValue placeholder="Filter by Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="user">Users</SelectItem>
                        <SelectItem value="owner">Owners</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4">
                {filteredUsers.map((user) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={user.id}
                    >
                        <Card className={`overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 ${user.is_banned ? 'opacity-75 border-red-500/30 bg-red-500/5' : 'bg-card/60 backdrop-blur-sm'}`}>
                            <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold ${user.is_banned ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
                                        {user.full_name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-semibold truncate flex items-center gap-2">
                                            {user.full_name}
                                            <Badge variant="outline" className={`text-xs capitalize ${user.role === 'owner' ? 'border-primary/40 text-primary bg-primary/5' : ''} ${user.role === 'admin' ? 'border-purple-500/40 text-purple-600 bg-purple-500/5' : ''}`}>
                                                {user.role}
                                            </Badge>
                                            {user.is_banned && <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase">Banned</Badge>}
                                        </h4>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted-foreground mt-0.5">
                                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</span>
                                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {user.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {user.role !== 'admin' && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-muted-foreground hidden sm:inline">{user.is_banned ? 'Unban' : 'Ban'}</span>
                                                        <Switch
                                                            checked={user.is_banned || false}
                                                            onCheckedChange={() => toggleBan(user.id, user.is_banned || false)}
                                                            className="data-[state=checked]:bg-destructive"
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{user.is_banned ? "Restore access" : "Revoke access"}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No users found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const DashboardAdmin = () => {
    const { user, signOut, hasRole } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [allVenues, setAllVenues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'venues' | 'users'>('venues');

    // Venue related state
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [venueToDelete, setVenueToDelete] = useState<string | null>(null);

    // Broadcast State
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'owner' | 'user'>('all');
    const [isSending, setIsSending] = useState(false);

    const handleBroadcast = async () => {
        if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
            toast({ title: "Error", description: "Title and message are required", variant: "destructive" });
            return;
        }
        setIsSending(true);
        try {
            const { error } = await supabase.from('announcements').insert({
                title: broadcastTitle,
                message: broadcastMessage,
                target_role: broadcastTarget,
                created_by: user?.id
            });
            if (error) throw error;
            toast({ title: "Success", description: "Announcement sent successfully!" });
            setIsBroadcastOpen(false);
            setBroadcastTitle('');
            setBroadcastMessage('');
            setBroadcastTarget('all');
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message || "Failed to send", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    // Optimized: Calculate stats with useMemo to avoid re-calculation on every render
    const stats = useMemo(() => {
        return {
            total: allVenues.length,
            pending: allVenues.filter(v => v.status === 'pending').length,
            active: allVenues.filter(v => v.status === 'approved').length,
            rejected: allVenues.filter(v => v.status === 'rejected').length
        };
    }, [allVenues]);

    // Optimized: Memoize filtered list
    const filteredVenues = useMemo(() => {
        return allVenues.filter(v => filterStatus === 'all' || v.status === filterStatus);
    }, [allVenues, filterStatus]);

    useEffect(() => {
        const checkAccess = async () => {
            if (!user) { navigate('/login/admin'); return; }
            // Double check role from DB for security
            const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').single();
            if (!data) navigate('/login/admin');
        };
        checkAccess();
        fetchVenues();
    }, [user, navigate]);

    const fetchVenues = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('venues').select('*, profiles:owner_id(full_name, email, phone)').order('created_at', { ascending: false });
            if (error) throw error;
            setAllVenues(data || []);
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

            // Notify Owner
            const venue = allVenues.find(v => v.id === venueId);
            if (venue) {
                await supabase.from('notifications').insert({
                    recipient_id: venue.owner_id,
                    title: "Venue Status Update",
                    message: `Your venue "${venue.name}" has been ${status}.`,
                    type: "info",
                    link: `/owner/venues/${venueId}/edit` // Direct link to check
                });
            }

            toast({ title: "Success", description: `Venue has been ${status}` });
            fetchVenues();
        } catch (error: any) {
            console.error('Update error:', error);
            const msg = error.message || "Failed to update status";
            toast({ title: "Error", description: msg, variant: "destructive" });
        }
    };

    const deleteVenue = async (venueId: string) => {
        try {
            // Notify Owner before deletion (so we have the data)
            const venue = allVenues.find(v => v.id === venueId);
            if (venue) {
                await supabase.from('notifications').insert({
                    recipient_id: venue.owner_id,
                    title: "Venue Deleted",
                    message: `Your venue "${venue.name}" has been permanently deleted by the administrator.`,
                    type: "alert"
                });
            }

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

    if (loading && allVenues.length === 0) return <DashboardSkeleton />;

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-primary/5 pb-20">

                <header className="border-b bg-background/60 backdrop-blur-xl sticky top-0 z-30 transition-all duration-300 shadow-sm">
                    <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center justify-between w-full md:w-auto">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex flex-col"
                            >
                                <div className="flex items-center gap-2">
                                    <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-tight leading-none">
                                        BookNex
                                    </h1>
                                </div>
                                <span className="hidden md:inline text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] ml-0.5">
                                    Admin Portal
                                </span>
                            </motion.div>

                            {/* Mobile Header Actions */}
                            <div className="flex items-center gap-2 md:hidden">
                                <NotificationBell />
                                <SettingsMenu />
                            </div>
                        </div>

                        {/* Desktop Header Actions + Tabs Wrapper */}
                        <div className="flex flex-col-reverse md:flex-row items-center gap-4 w-full md:w-auto">

                            {/* Tabs */}
                            <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border/50 self-start md:self-auto w-full md:w-auto">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`rounded-md flex-1 md:w-28 transition-all ${activeTab === 'venues' ? 'bg-background shadow-sm text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setActiveTab('venues')}
                                >
                                    <Grid className="mr-2 h-4 w-4" /> Venues
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`rounded-md flex-1 md:w-28 transition-all ${activeTab === 'users' ? 'bg-background shadow-sm text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setActiveTab('users')}
                                >
                                    <Users className="mr-2 h-4 w-4" /> Users
                                </Button>
                            </div>

                            <div className="hidden md:flex items-center gap-2 md:gap-4">
                                <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="flex gap-2 px-2 md:px-4">
                                            <BellRing className="h-4 w-4" />
                                            <span className="hidden md:inline">Broadcast</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>Send Broadcast</DialogTitle>
                                            <DialogDescription>
                                                Send a notification to all users, owners, or everyone.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="target">Target Audience</Label>
                                                <Select value={broadcastTarget} onValueChange={(v: any) => setBroadcastTarget(v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select audience" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Everyone</SelectItem>
                                                        <SelectItem value="owner">Venue Owners</SelectItem>
                                                        <SelectItem value="user">Users</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="title">Title</Label>
                                                <Input
                                                    id="title"
                                                    value={broadcastTitle}
                                                    onChange={(e) => setBroadcastTitle(e.target.value)}
                                                    placeholder="Announcement Title"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="message">Message</Label>
                                                <Textarea
                                                    id="message"
                                                    value={broadcastMessage}
                                                    onChange={(e) => setBroadcastMessage(e.target.value)}
                                                    placeholder="Type your message here..."
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" onClick={handleBroadcast} disabled={isSending}>
                                                {isSending ? "Sending..." : "Send Announcement"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <NotificationBell />
                                <SettingsMenu />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-6 py-10 space-y-10">

                    {activeTab === 'venues' ? (
                        <>
                            {/* Stats Grid */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                            >
                                <Card
                                    onClick={() => { setFilterStatus('all'); }}
                                    className={`bg-card/40 backdrop-blur-xl border-border/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer relative overflow-hidden group ${filterStatus === 'all' ? 'ring-2 ring-primary/30 bg-primary/5' : ''}`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">Total Venues</CardTitle>
                                        <div className="p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                                            <Building2 className="h-4 w-4 text-primary" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="relative z-10">
                                        <div className="text-3xl font-extrabold text-foreground group-hover:scale-105 transition-transform origin-left">{stats.total}</div>
                                        <p className="text-xs text-muted-foreground mt-1 font-medium">Registered on platform</p>
                                    </CardContent>
                                </Card>
                                <Card
                                    onClick={() => { setFilterStatus('approved'); }}
                                    className={`bg-card/40 backdrop-blur-xl border-border/40 shadow-sm hover:shadow-xl hover:shadow-green-500/5 transition-all cursor-pointer relative overflow-hidden group ${filterStatus === 'approved' ? 'ring-2 ring-green-500/30 bg-green-500/5' : ''}`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider group-hover:text-green-600 transition-colors">Active Listings</CardTitle>
                                        <div className="p-2 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition-colors">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="relative z-10">
                                        <div className="text-3xl font-extrabold text-green-600 group-hover:scale-105 transition-transform origin-left">{stats.active}</div>
                                        <p className="text-xs text-muted-foreground mt-1 font-medium">Live and bookable</p>
                                    </CardContent>
                                </Card>
                                <Card
                                    onClick={() => { setFilterStatus('pending'); }}
                                    className={`bg-card/40 backdrop-blur-xl border-border/40 shadow-sm hover:shadow-xl hover:shadow-orange-500/5 transition-all cursor-pointer relative overflow-hidden group ${filterStatus === 'pending' ? 'ring-2 ring-orange-500/30 bg-orange-500/5' : ''}`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider group-hover:text-orange-600 transition-colors">Pending Review</CardTitle>
                                        <div className="p-2 bg-orange-500/10 rounded-full group-hover:bg-orange-500/20 transition-colors">
                                            <Activity className="h-4 w-4 text-orange-600" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="relative z-10">
                                        <div className="text-3xl font-extrabold text-orange-600 group-hover:scale-105 transition-transform origin-left">{stats.pending}</div>
                                        <p className="text-xs text-muted-foreground mt-1 font-medium">Awaiting approval</p>
                                    </CardContent>
                                </Card>
                                <Card
                                    onClick={() => { setFilterStatus('rejected'); }}
                                    className={`bg-card/40 backdrop-blur-xl border-border/40 shadow-sm hover:shadow-xl hover:shadow-red-500/5 transition-all cursor-pointer relative overflow-hidden group ${filterStatus === 'rejected' ? 'ring-2 ring-red-500/30 bg-red-500/5' : ''}`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider group-hover:text-red-600 transition-colors">Rejected</CardTitle>
                                        <div className="p-2 bg-red-500/10 rounded-full group-hover:bg-red-500/20 transition-colors">
                                            <XCircle className="h-4 w-4 text-red-600" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="relative z-10">
                                        <div className="text-3xl font-extrabold text-red-600 group-hover:scale-105 transition-transform origin-left">{stats.rejected}</div>
                                        <p className="text-xs text-muted-foreground mt-1 font-medium">Requires action</p>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Main Filtered Venue List */}
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 border-b border-border/40 pb-6">
                                    <div>
                                        <h2 className="text-3xl font-bold tracking-tight text-foreground">Venue Management</h2>
                                        <p className="text-muted-foreground mt-1">
                                            Viewing <span className="font-semibold text-primary capitalize">{filterStatus}</span> venues
                                        </p>
                                    </div>
                                </div>

                                {/* Unified Grid */}
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {filteredVenues.map((venue, index) => (
                                        <motion.div
                                            key={venue.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            {venue.status === 'pending' ? (
                                                <VenueApprovalCard
                                                    venue={venue}
                                                    onViewDetails={() => navigate(`/admin/venues/${venue.id}`)}
                                                />
                                            ) : (
                                                <VenueManageCard
                                                    venue={venue}
                                                    onPause={(e) => { e.stopPropagation(); updateVenueStatus(venue.id, venue.status === 'paused' ? 'approved' : 'paused'); }}
                                                    onDelete={(e) => { e.stopPropagation(); setVenueToDelete(venue.id); }}
                                                    onEdit={(e) => {
                                                        if (e) e.stopPropagation();
                                                        navigate(`/admin/venues/${venue.id}`);
                                                    }}
                                                    onApprove={(e) => { e.stopPropagation(); updateVenueStatus(venue.id, 'approved'); }}
                                                />
                                            )}
                                        </motion.div>
                                    ))}

                                    {filteredVenues.length === 0 && (
                                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-70">
                                            <div className="bg-secondary/20 p-6 rounded-full mb-4">
                                                <Grid className="h-10 w-10 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-xl font-semibold">No venues found</h3>
                                            <p className="text-muted-foreground">Try selecting a different status filter.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <UserManagementTab activeTab={activeTab} />
                    )}
                </main>
            </div >

            <AlertDialog open={!!venueToDelete} onOpenChange={(open) => !open && setVenueToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Venue Permanently?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently remove the venue and all associated bookings, pricing, and history from the database.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => venueToDelete && deleteVenue(venueToDelete)}>
                            Delete Venue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageTransition >
    );
};

export default DashboardAdmin;
