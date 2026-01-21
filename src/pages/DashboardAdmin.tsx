import { useEffect, useState, useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { XCircle, MapPin, Clock, Activity, TrendingUp, Building2, Grid, Search, Users, Mail, Phone, Lock, Unlock, Calendar, User, Star } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { motion } from 'framer-motion';

import { SettingsMenu } from '@/components/SettingsMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { BannerManager } from '@/components/BannerManager';
import { AnalyticsOverview } from '@/components/AnalyticsOverview';
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
const VenueManageCard = memo(({ venue, onPause, onDelete, onEdit, onApprove, onToggleFeatured }: {
    venue: any,
    onPause: (e: React.MouseEvent) => void,
    onDelete: (e: React.MouseEvent) => void,
    onEdit: (e?: React.MouseEvent) => void,
    onApprove: (e: React.MouseEvent) => void,
    onToggleFeatured: (val: boolean) => void
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

                    {/* Featured Toggle Overlay */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-2 py-1" onClick={(e) => e.stopPropagation()}>
                        <Switch
                            checked={venue.is_featured || false}
                            onCheckedChange={(checked) => onToggleFeatured(checked)}
                            className="scale-75 data-[state=checked]:bg-yellow-500"
                        />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${venue.is_featured ? 'text-yellow-400' : 'text-white/70'}`}>
                            {venue.is_featured ? 'Featured' : 'Standard'}
                        </span>
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
        </motion.div >
    );
}, (prev, next) => {
    return prev.venue.id === next.venue.id &&
        prev.venue.status === next.venue.status &&
        prev.venue.is_featured === next.venue.is_featured &&
        prev.venue.name === next.venue.name;
});

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
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
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

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch =
                user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.phone && user.phone.includes(searchQuery));

            const matchesRole = roleFilter === 'all' || user.role === roleFilter;

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'banned' ? user.is_banned : !user.is_banned);

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchQuery, roleFilter, statusFilter]);

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
                <div className="flex gap-2 w-full md:w-auto">
                    <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
                        <SelectTrigger className="w-full md:w-40 bg-background/50">
                            <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                        <SelectTrigger className="w-full md:w-40 bg-background/50">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="banned">Banned</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
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

// --- Sub-component for Booking Management ---
const BookingManagementTab = ({ activeTab }: { activeTab: string }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'>('all');
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    useEffect(() => {
        if (activeTab === 'bookings' && user) {
            fetchBookings();
        }
    }, [activeTab, user]);

    const fetchBookings = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    venues:venue_id (name, address),
                    profiles:user_id (full_name, email, phone)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (error: any) {
            console.error('Error fetching bookings:', error);
            toast({ title: "Error", description: "Failed to load bookings", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async () => {
        if (!cancellingId || !cancelReason.trim()) return;

        try {
            // Optimistic update
            setBookings(prev => prev.map(b => b.id === cancellingId ? { ...b, status: 'cancelled' } : b));

            const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', cancellingId);

            if (error) throw error;

            // Notify User
            const booking = bookings.find(b => b.id === cancellingId);
            if (booking) {
                const notificationPayload = {
                    recipient_id: booking.user_id,
                    title: "Booking Cancelled by Admin",
                    message: `Your booking for ${booking.venues?.name} on ${booking.booking_date} has been cancelled. Reason: ${cancelReason}`,
                    type: "alert"
                };

                // Notify Owner too
                /* Note: We'd need owner_id from venue, but we only selected name/address. 
                   Ideally we fetch it, but for now we notify the user which is most critical. */

                await supabase.from('notifications').insert(notificationPayload);
            }

            toast({ title: "Booking Cancelled", description: "User has been notified." });
            setCancellingId(null);
            setCancelReason('');
        } catch (error: any) {
            console.error('Error cancelling booking:', error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
            fetchBookings(); // Revert
        }
    };

    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                booking.id.toLowerCase().includes(searchLower) ||
                booking.venues?.name?.toLowerCase().includes(searchLower) ||
                booking.profiles?.full_name?.toLowerCase().includes(searchLower) ||
                booking.profiles?.email?.toLowerCase().includes(searchLower);

            const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [bookings, searchQuery, statusFilter]);

    const statusBadgeColors: Record<string, string> = {
        confirmed: "bg-green-500/10 text-green-600 border-green-200",
        pending: "bg-orange-500/10 text-orange-600 border-orange-200",
        cancelled: "bg-red-500/10 text-red-600 border-red-200",
        completed: "bg-blue-500/10 text-blue-600 border-blue-200"
    };

    if (loading) return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-card/50 animate-pulse rounded-xl" />)}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card/40 p-4 rounded-xl border border-border/40 backdrop-blur-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search bookings by venue, user, or ID..."
                        className="pl-9 bg-background/50 border-border/50"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-full md:w-40 bg-background/50">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-4">
                {filteredBookings.map((booking) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={booking.id}
                    >
                        <Card className="overflow-hidden hover:shadow-md transition-shadow bg-card/60 backdrop-blur-sm border-border/50">
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row">
                                    {/* Date & Time Column */}
                                    <div className="bg-secondary/10 p-4 md:w-48 flex flex-col justify-center items-center text-center border-b md:border-b-0 md:border-r border-border/50">
                                        <div className="text-2xl font-bold text-foreground">{new Date(booking.booking_date).getDate()}</div>
                                        <div className="text-sm font-medium uppercase text-muted-foreground">{new Date(booking.booking_date).toLocaleString('default', { month: 'short' })}</div>
                                        <div className="mt-2 text-xs font-medium bg-background/50 px-2 py-1 rounded-full border border-border/50">
                                            {booking.start_time || booking.booking_time}
                                        </div>
                                    </div>

                                    {/* Details Column */}
                                    <div className="flex-1 p-4 flex flex-col justify-center gap-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h4 className="font-semibold text-lg">{booking.venues?.name || 'Unknown Venue'}</h4>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                    <User className="h-3.5 w-3.5" />
                                                    {booking.profiles?.full_name || 'Guest User'}
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={`capitalize ${statusBadgeColors[booking.status] || 'bg-secondary'}`}>
                                                {booking.status}
                                            </Badge>
                                        </div>
                                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                ID: <span className="font-mono">{booking.id.slice(0, 8)}...</span>
                                            </span>
                                            <span className="font-semibold text-primary">₹{booking.amount}</span>
                                        </div>
                                    </div>

                                    {/* Actions Column */}
                                    <div className="p-4 flex items-center justify-end border-t md:border-t-0 md:border-l border-border/50 gap-2">
                                        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                                            <Dialog open={cancellingId === booking.id} onOpenChange={(open) => !open && setCancellingId(null)}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => setCancellingId(booking.id)}>
                                                        Cancel
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Cancel Booking?</DialogTitle>
                                                        <DialogDescription>
                                                            Please provide a reason for cancelling this booking. The user will be notified.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-4">
                                                        <Label>Reason for Cancellation</Label>
                                                        <Textarea
                                                            placeholder="e.g. Venue maintenance required..."
                                                            value={cancelReason}
                                                            onChange={(e) => setCancelReason(e.target.value)}
                                                            className="mt-2"
                                                        />
                                                    </div>
                                                    <DialogFooter>
                                                        <Button variant="outline" onClick={() => setCancellingId(null)}>Close</Button>
                                                        <Button variant="destructive" onClick={handleCancelBooking} disabled={!cancelReason.trim()}>
                                                            Confirm Cancellation
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}

                {filteredBookings.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No bookings found matching criteria.</p>
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
    const [activeTab, setActiveTab] = useState<'overview' | 'venues' | 'users' | 'bookings' | 'content'>('overview');

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

    const updateVenueStatus = useCallback(async (venueId: string, status: 'approved' | 'rejected' | 'paused') => {
        // 1. Optimistic Update (Immediate Feedback)
        setAllVenues(prev => prev.map(v => v.id === venueId ? { ...v, status } : v));
        toast({ title: "Updated", description: `Venue marked as ${status}.` });

        try {
            // 2. Perform DB Update
            const { error } = await supabase
                .from('venues')
                .update({ status })
                .eq('id', venueId);

            if (error) throw error;

            // 3. Fire-and-Forget Notifications (Don't await / block UI)
            const venue = allVenues.find(v => v.id === venueId);
            if (venue) {
                const notificationPayload = {
                    recipient_id: venue.owner_id,
                    title: "Venue Status Update",
                    message: `Your venue "${venue.name}" has been ${status}.`,
                    type: "info",
                    link: `/owner/venues/${venueId}/edit`
                };

                // Run side-effects in background
                Promise.all([
                    supabase.from('notifications').insert(notificationPayload),
                    supabase.functions.invoke('push', { body: { record: notificationPayload } })
                ]).catch(err => console.error("Background notification error:", err));
            }
        } catch (error: any) {
            console.error('Update error:', error);
            const msg = error.message || "Failed to update status";
            toast({ title: "Error", description: msg, variant: "destructive" });
            fetchVenues(); // Revert optimistic update on error
        }
    }, [allVenues, toast]);

    const toggleFeaturedVenue = useCallback(async (venueId: string, currentStatus: boolean) => {
        try {
            // Optimistic update
            setAllVenues(prev => prev.map(v => v.id === venueId ? { ...v, is_featured: !currentStatus } : v));

            const { error } = await supabase
                .from('venues')
                .update({ is_featured: !currentStatus })
                .eq('id', venueId);

            if (error) throw error;

            toast({ title: "Updated", description: `Venue is now ${!currentStatus ? 'Featured' : 'Not Featured'}` });
        } catch (error: any) {
            toast({ title: "Error", description: "Failed to update featured status", variant: "destructive" });
            fetchVenues(); // Revert
        }
    }, [toast]);

    const deleteVenue = useCallback(async (venueId: string) => {
        // 1. Optimistic Update
        const previousVenues = [...allVenues];
        setAllVenues(prev => prev.filter(v => v.id !== venueId));
        toast({ title: "Venue deleted", description: "Permanently removed." });
        setVenueToDelete(null); // Close dialog immediately

        try {
            // 2. Background Operations
            const venue = previousVenues.find(v => v.id === venueId);

            // Prepare notification payload
            const notificationPayload = venue ? {
                recipient_id: venue.owner_id,
                title: "Venue Deleted",
                message: `Your venue "${venue.name}" has been permanently deleted by the administrator.`,
                type: "alert"
            } : null;

            // Execute all DB operations in parallel where possible, keeping dependencies in mind
            // Bookings and Pricing must be deleted before Venue due to foreign key constraints, 
            // but we can start the notification parallel to the deletion flow.

            const deleteOperations = async () => {
                const { error: bookingsError } = await supabase.from('bookings').delete().eq('venue_id', venueId);
                if (bookingsError) throw bookingsError;

                const { error: pricingError } = await supabase.from('venue_pricing').delete().eq('venue_id', venueId);
                if (pricingError) throw pricingError;

                const { data, error } = await supabase.from('venues').delete().eq('id', venueId).select();
                if (error) throw error;
                if (!data || data.length === 0) throw new Error("RLS Error or Venue already deleted");
            };

            const notifyOperations = async () => {
                if (notificationPayload) {
                    await Promise.all([
                        supabase.from('notifications').insert(notificationPayload),
                        supabase.functions.invoke('push', { body: { record: notificationPayload } })
                    ]);
                }
            };

            // Run Delete and Notify concurrently (Notify doesn't depend on Venue existing in DB, just the ID/Data we already have)
            await Promise.all([deleteOperations(), notifyOperations()]);

        } catch (error) {
            console.error("Delete error:", error);
            toast({ title: "Error", description: "Could not delete venue. Reverting.", variant: "destructive" });
            setAllVenues(previousVenues); // Revert optimistic update
        }
    }, [allVenues, toast]);

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

                            {/* Tabs - Hidden (Moved to Footer) */}
                            <div className="hidden">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`rounded-md flex-1 md:w-28 transition-all ${activeTab === 'overview' ? 'bg-background shadow-sm text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setActiveTab('overview')}
                                >
                                    <Activity className="mr-2 h-4 w-4" /> Overview
                                </Button>
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
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`rounded-md flex-1 md:w-28 transition-all ${activeTab === 'bookings' ? 'bg-background shadow-sm text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setActiveTab('bookings')}
                                >
                                    <Calendar className="mr-2 h-4 w-4" /> Bookings
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`rounded-md flex-1 md:w-28 transition-all ${activeTab === 'content' ? 'bg-background shadow-sm text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setActiveTab('content')}
                                >
                                    <Star className="mr-2 h-4 w-4" /> Content
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
                                                    onToggleFeatured={(val) => toggleFeaturedVenue(venue.id, !val)} // Note: val is the NEW state, function expects CURRENT status to toggle. Wait, logic above was !current. Let's fix.
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
                    ) : activeTab === 'overview' ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
                            <AnalyticsOverview />
                        </motion.div>
                    ) : activeTab === 'users' ? (
                        <UserManagementTab activeTab={activeTab} />
                    ) : activeTab === 'bookings' ? (
                        <BookingManagementTab activeTab={activeTab} />
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <h2 className="text-3xl font-bold tracking-tight">Content Management</h2>
                            <BannerManager />
                        </motion.div>
                    )}
                </main>
            </div >

            {/* Fixed Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border/50 p-2 z-50 flex justify-center">
                <div className="grid grid-cols-5 gap-1 w-full md:w-[600px]">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`flex flex-col items-center justify-center h-14 gap-1 rounded-xl transition-all ${activeTab === 'overview' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <Activity className={`h-5 w-5 ${activeTab === 'overview' && "fill-current"}`} />
                        <span className="text-[10px] font-medium">Overview</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`flex flex-col items-center justify-center h-14 gap-1 rounded-xl transition-all ${activeTab === 'venues' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab('venues')}
                    >
                        <Grid className={`h-5 w-5 ${activeTab === 'venues' && "fill-current"}`} />
                        <span className="text-[10px] font-medium">Venues</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`flex flex-col items-center justify-center h-14 gap-1 rounded-xl transition-all ${activeTab === 'users' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users className={`h-5 w-5 ${activeTab === 'users' && "fill-current"}`} />
                        <span className="text-[10px] font-medium">Users</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`flex flex-col items-center justify-center h-14 gap-1 rounded-xl transition-all ${activeTab === 'bookings' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab('bookings')}
                    >
                        <Calendar className={`h-5 w-5 ${activeTab === 'bookings' && "fill-current"}`} />
                        <span className="text-[10px] font-medium">Bookings</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`flex flex-col items-center justify-center h-14 gap-1 rounded-xl transition-all ${activeTab === 'content' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab('content')}
                    >
                        <Star className={`h-5 w-5 ${activeTab === 'content' && "fill-current"}`} />
                        <span className="text-[10px] font-medium">Content</span>
                    </Button>
                </div>
            </div>

            <div className="h-20 md:hidden" /> {/* Spacer for footer */}

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
