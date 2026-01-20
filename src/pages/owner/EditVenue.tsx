
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, X, Upload, Clock, Calendar as CalendarIcon, Settings, LayoutGrid, Info, CheckCircle2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Tables } from '@/integrations/supabase/types';
import { motion, AnimatePresence } from 'framer-motion';
import { LocationPicker } from '@/components/LocationPicker';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VenueSlotGrid } from '@/components/owner/VenueSlotGrid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

type Venue = Tables<'venues'>;
type VenuePricing = Tables<'venue_pricing'>;

const EditVenue = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [pricing, setPricing] = useState<VenuePricing[]>([]);
  const [peakHours, setPeakHours] = useState<string[]>([]);
  const [customSport, setCustomSport] = useState("");
  const [customAmenity, setCustomAmenity] = useState("");

  const amenitiesList = [
    'Parking', 'WiFi', 'Air Conditioning', 'Locker Room',
    'Shower', 'Equipment', 'Cafeteria', 'First Aid'
  ];
  const [bookedSlots, setBookedSlots] = useState<string[]>([]); // New state for bookings


  const fetchBookedSlots = useCallback(async () => {
    if (!id || !selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      console.log('Fetching bookings for', dateStr);
      // Fetch ALL bookings for this venue to debug
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('venue_id', id);

      if (error) throw error;

      console.log('ALL Venue Bookings:', data);

      // Client-side filter using correct columns
      const todaysBookings = data.filter((b: any) => b.booking_date === dateStr && b.status !== 'cancelled');
      console.log('Filtered for today:', todaysBookings);

      const normalizeSlot = (time: string) => {
        const clean = time.trim().toUpperCase();
        if (clean.includes('M')) {
          if (!clean.includes(' ')) {
            return clean.replace('AM', ' AM').replace('PM', ' PM');
          }
          return clean;
        }
        const [h] = clean.split(':');
        let hour = parseInt(h);
        if (isNaN(hour)) return time;
        const period = hour >= 12 ? 'PM' : 'AM';
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        return `${hour.toString().padStart(2, '0')}:00 ${period}`;
      };

      const slots = todaysBookings.map((b: any) => normalizeSlot(b.booking_time));
      setBookedSlots(slots);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  }, [id, selectedDate]);

  const generateTimeSlots = () => {
    if (!venue?.opening_time || !venue?.closing_time) {
      // Fallback defaults if not set
      return [
        '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
        '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
        '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM',
      ];
    }

    const parseTime = (timeStr: string) => {
      const trimmed = timeStr.trim();
      if (!trimmed.includes('AM') && !trimmed.includes('PM')) {
        const [hoursStr] = trimmed.split(':');
        return parseInt(hoursStr);
      }
      const [time, period] = trimmed.split(' ');
      const [hoursStr] = time.split(':');
      let hours = parseInt(hoursStr);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours;
    };

    const formatTime = (hour: number) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour.toString().padStart(2, '0')}:00 ${period}`;
    };

    const startHour = parseTime(venue.opening_time);
    const endHour = parseTime(venue.closing_time);
    const slots = [];

    // Handle cross-midnight (e.g. 11 PM to 2 AM) - simple loop 
    // Start <= End normal case
    if (startHour <= endHour) {
      for (let h = startHour; h <= endHour; h++) {
        slots.push(formatTime(h));
      }
    } else {
      // Cross midnight
      for (let h = startHour; h <= 23; h++) {
        slots.push(formatTime(h));
      }
      for (let h = 0; h <= endHour; h++) {
        slots.push(formatTime(h));
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const fetchVenue = useCallback(async () => {
    if (!id || !user?.id) return;
    console.log('Fetching venue data for ID:', id); // DEBUG

    try {
      let query = supabase
        .from('venues')
        .select('*')
        .eq('id', id);

      // Only restrict to owner if not admin
      if (!hasRole('admin')) {
        query = query.eq('owner_id', user.id);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      setVenue(data);
      setPeakHours(data?.peak_hours || []);
    } catch (error: any) {
      toast({
        title: 'Error loading venue',
        description: error.message,
        variant: 'destructive',
        duration: 1000,
      });
      if (hasRole('admin')) {
        navigate('/dashboard/admin');
      } else {
        navigate('/owner/venues');
      }
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, navigate, toast]);

  // ...

  const handleUpdateVenue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log('Saving venue changes...', venue); // DEBUG
    setSaving(true);

    try {
      if (!venue) return;
      const { error } = await supabase
        .from('venues')
        .update({
          name: venue.name,
          description: venue.description,
          address: venue.address,
          pricing: venue.pricing,
          opening_time: venue.opening_time,
          closing_time: venue.closing_time,
          peak_hours: peakHours,
          sports: venue.sports,
          latitude: venue.latitude,
          longitude: venue.longitude,
          peak_price: (venue as any).peak_price,
          amenities: (venue as any).amenities
        })
        .eq('id', id as string);

      if (error) {
        console.error('Update error:', error); // DEBUG
        throw error;
      }

      console.log('Update success'); // DEBUG

      // Notify owner if edited by Admin
      if (hasRole('admin') && venue.owner_id !== user?.id) {
        await supabase.from('notifications').insert({
          recipient_id: venue.owner_id,
          title: "Venue Details Updated",
          message: `An administrator has updated the details for your venue "${venue.name}".`,
          type: "info",
          link: `/owner/venues/${id}/edit`
        });
      }

      toast({
        title: 'Settings saved',
        description: 'Venue details updated successfully',
        duration: 2000,
      });
    } catch (error: any) {
      console.error('Catch error:', error); // DEBUG
      toast({
        title: 'Error updating venue',
        description: error.message,
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const fetchPricing = useCallback(async () => {
    if (!selectedDate || !id) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('venue_pricing')
        .select('*')
        .eq('venue_id', id)
        .eq('date', dateStr);

      if (error) throw error;
      setPricing(data || []);
    } catch (error: any) {
      console.error('Error fetching pricing:', error);
    }
  }, [id, selectedDate]);

  useEffect(() => {
    fetchVenue();
  }, [fetchVenue]);

  useEffect(() => {
    fetchPricing();
    fetchBookedSlots();
  }, [fetchPricing, fetchBookedSlots]);

  // --- Helper Methods ---
  const getPricingData = () => {
    const pricingMap: { [key: string]: number } = {};
    timeSlots.forEach(slot => {
      const p = pricing.find(item => item.time_slot === slot);
      pricingMap[slot] = p?.price ?? venue?.pricing ?? 0;
    });
    return pricingMap;
  };

  const getFrozenSlots = () => {
    return pricing.filter(p => p.is_frozen).map(p => p.time_slot);
  };

  const getDisabledSlots = () => {
    if (!selectedDate) return [];

    const now = new Date();
    // Reset seconds/ms for cleaner comparison
    const todayStr = format(now, 'yyyy-MM-dd');
    const selectedStr = format(selectedDate, 'yyyy-MM-dd');

    if (selectedStr < todayStr) {
      // Human logic: If I select yesterday, EVERYTHING is past.
      return timeSlots;
    }

    if (selectedStr > todayStr) {
      // Future dates: nothing is "past" in terms of time passing.
      return [];
    }

    // It is Today.
    const currentHour = now.getHours();

    return timeSlots.filter(slot => {
      // Parse "06:00 AM"
      const [time, period] = slot.split(' ');
      let [hours, minutes] = time.split(':').map(Number);

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      // Disable if slot hour is strictly less than current hour.
      // GRACE PERIOD: If it's 12:20 PM, 12:00 PM slot is still valid (up to 12:30).
      // If it is 12:40 PM, 12:00 PM is closed.

      const currentMinutes = now.getMinutes();
      const cutoffHour = currentMinutes > 30 ? currentHour : currentHour - 1;
      // If 12:40 -> cutoff = 12. Slot 12 must be > 12? No.
      // Logic:
      // If 12:20 (cutoff = 11): 11 < 11 (False), 12 < 11 (False). 
      // Wait, simple comparison:
      // If hours < currentHour, it is definitely past.
      // If hours == currentHour, check minutes.

      if (hours < currentHour) return true; // Past hours always disabled
      if (hours === currentHour && currentMinutes > 30) return true; // Current hour disabled after 30 mins

      return false;
    });
  };

  // --- Handlers ---



  const handleToggleFreeze = async (slot: string) => {
    if (!selectedDate || !venue) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Find existing state
    const existing = pricing.find(p => p.time_slot === slot);
    const isFrozen = existing?.is_frozen ?? false;
    const currentPrice = existing?.price ?? venue.pricing;

    // Optimistic Update
    const newPricing = [...pricing];
    if (existing) {
      // Toggle existing
      const index = newPricing.findIndex(p => p.time_slot === slot);
      newPricing[index] = { ...existing, is_frozen: !isFrozen };
    } else {
      // Create new entry
      // We'll mimic the structure, id will be missing but that's ok for local state
      newPricing.push({
        venue_id: venue.id,
        date: dateStr,
        time_slot: slot,
        price: currentPrice,
        is_frozen: true,
        created_at: new Date().toISOString(),
        id: 'temp-' + Date.now()
      } as any);
    }
    setPricing(newPricing);

    try {
      const { error } = await supabase
        .from('venue_pricing')
        .upsert({
          venue_id: id,
          date: dateStr,
          time_slot: slot,
          price: currentPrice,
          is_frozen: !isFrozen,
        }, {
          onConflict: 'venue_id,date,time_slot'
        });

      if (error) throw error;

      // Quiet success for toggles, or maybe a small toast
    } catch (error: any) {
      // Revert on error
      fetchPricing();
      toast({
        title: 'Failed to update slot',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSlotPrice = async (slot: string, newPrice: number) => {
    if (!selectedDate || !venue) return;

    // Update local state immediately for responsiveness
    const existingIndex = pricing.findIndex(p => p.time_slot === slot);
    const newPricing = [...pricing];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    if (existingIndex >= 0) {
      newPricing[existingIndex] = { ...newPricing[existingIndex], price: newPrice };
    } else {
      newPricing.push({
        venue_id: venue.id,
        date: dateStr,
        time_slot: slot,
        price: newPrice,
        is_frozen: false,
        created_at: new Date().toISOString(),
        id: 'temp-' + Date.now()
      } as any);
    }
    setPricing(newPricing);

    // Debounce or just fire? For "realtime" feeling we fire, 
    // but if user types fast it spams DB. Editor's choice: 
    // Let's fire upsert but maybe catch errors silently if racing.
    // Better UX: Only save on Blur or have a small "Save" button for the grid?
    // The prompt said "edits should be updated in real time after saving changes"
    // Interpreting as: User changes -> Auto save or quick save.
    // Let's do auto-save with simple debounce if possible, but for simplicity here we just upsert.

    try {
      const { error } = await supabase
        .from('venue_pricing')
        .upsert({
          venue_id: id,
          date: dateStr,
          time_slot: slot,
          price: newPrice,
          is_frozen: pricing.find(p => p.time_slot === slot)?.is_frozen ?? false
        }, { onConflict: 'venue_id,date,time_slot' });

      if (error) throw error;
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    if (!venue) return;
    const updatedPhotos = (venue.photos || []).filter(p => p !== photoUrl);
    setVenue({ ...venue, photos: updatedPhotos }); // Optimistic

    const { error } = await supabase.from('venues').update({ photos: updatedPhotos }).eq('id', id as string);
    if (error) toast({ title: 'Error removing photo', variant: 'destructive' });
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !venue || !user?.id) return;

    // Validate
    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024 && file.type.startsWith('image/'));
    if (validFiles.length < files.length) {
      toast({ title: "Warning", description: "Some files skipped (invalid type or >5MB)", variant: "destructive" });
    }
    if (validFiles.length === 0) return;

    toast({ title: "Uploading...", description: "Please wait while we upload your photos." });

    const newUrls: string[] = [];

    for (const file of validFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('venue_photos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('venue_photos')
        .getPublicUrl(filePath);

      newUrls.push(publicUrl);
    }

    if (newUrls.length > 0) {
      const updatedPhotos = [...(venue.photos || []), ...newUrls];
      setVenue({ ...venue, photos: updatedPhotos });

      const { error } = await supabase
        .from('venues')
        .update({ photos: updatedPhotos })
        .eq('id', id as string);

      if (error) {
        console.error(error);
        toast({ title: 'Error saving photos', variant: 'destructive' });
        fetchVenue(); // Revert on error
      } else {
        toast({ title: 'Success', description: 'Photos uploaded successfully' });
      }
    }
  };


  if (loading) {
    return <div className="p-8"><Skeleton className="h-12 w-48 mb-6" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-primary/5 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => hasRole('admin') ? navigate('/dashboard/admin') : navigate('/owner/venues')} className="hover:bg-secondary/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Edit Venue
            </h1>
          </div>
          <Button onClick={(e) => handleUpdateVenue(e)} disabled={saving} type="button" className={saving ? 'opacity-80' : ''}>
            {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Tabs defaultValue="overview" className="space-y-8">

          <TabsList className="grid w-full grid-cols-3 bg-secondary/10 p-1.5 rounded-2xl h-auto">
            <TabsTrigger value="overview" className="py-2.5 rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all flex items-center justify-center gap-2">
              <Info className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="operations" className="py-2.5 rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all flex items-center justify-center gap-2">
              <Settings className="h-4 w-4" /> Operations
            </TabsTrigger>
            <TabsTrigger value="slots" className="py-2.5 rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all flex items-center justify-center gap-2">
              <LayoutGrid className="h-4 w-4" /> Slot Manager
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" key="overview" className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Photos & Basic Info */}
                  <div className="md:col-span-2 space-y-6">
                    <Card className="border-border/50 shadow-sm overflow-hidden">
                      <CardHeader>
                        <CardTitle>Venue Details</CardTitle>
                        <CardDescription>Basic information visible to customers</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Venue Name</Label>
                          <Input
                            value={venue?.name || ''}
                            onChange={e => venue && setVenue({ ...venue, name: e.target.value })}
                            className="h-11 bg-background/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={venue?.description || ''}
                            onChange={e => venue && setVenue({ ...venue, description: e.target.value })}
                            rows={4}
                            className="bg-background/50 resize-none"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle>Photos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {venue?.photos?.map((photo, i) => (
                            <div key={i} className="relative group aspect-video rounded-lg overflow-hidden border bg-secondary/10">
                              <img src={photo} alt="Venue" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                              <Button
                                variant="destructive" size="icon"
                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemovePhoto(photo)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 rounded-lg aspect-video cursor-pointer transition-all">
                            <Upload className="h-6 w-6 text-primary mb-2" />
                            <span className="text-xs font-medium text-muted-foreground">Add Photo</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleAddPhoto} />
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Location */}
                  <div className="space-y-6">
                    <Card className="border-border/50 shadow-sm h-full">
                      <CardHeader>
                        <CardTitle>Location</CardTitle>
                        <CardDescription>Set the precise location</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Input
                          value={venue?.address || ''}
                          onChange={e => venue && setVenue({ ...venue, address: e.target.value })}
                          placeholder="Full Address"
                        />
                        <div className="h-[300px] rounded-xl overflow-hidden border">
                          <LocationPicker
                            onLocationSelect={(loc) => venue && setVenue({ ...venue, address: loc.address, latitude: loc.lat, longitude: loc.lng })}
                            initialLocation={venue?.latitude ? { lat: venue.latitude, lng: venue.longitude! } : null}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* OPERATIONS TAB */}
            <TabsContent value="operations" key="operations" className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sports & Timings */}
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                      <CardTitle>Operating Hours & Sports</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Opening</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <select
                              value={venue?.opening_time || '06:00 AM'}
                              onChange={e => venue && setVenue({ ...venue, opening_time: e.target.value })}
                              className="w-full h-11 pl-10 pr-4 rounded-md border border-input bg-background"
                            >
                              {Array.from({ length: 24 }).map((_, i) => {
                                const hour = i === 0 ? 12 : (i > 12 ? i - 12 : i);
                                const period = i < 12 ? 'AM' : 'PM';
                                const time = `${hour.toString().padStart(2, '0')}:00 ${period}`;
                                return <option key={time} value={time}>{time}</option>;
                              })}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Closing</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <select
                              value={venue?.closing_time || '11:00 PM'}
                              onChange={e => venue && setVenue({ ...venue, closing_time: e.target.value })}
                              className="w-full h-11 pl-10 pr-4 rounded-md border border-input bg-background"
                            >
                              {Array.from({ length: 24 }).map((_, i) => {
                                const hour = i === 0 ? 12 : (i > 12 ? i - 12 : i);
                                const period = i < 12 ? 'AM' : 'PM';
                                const time = `${hour.toString().padStart(2, '0')}:00 ${period}`;
                                return <option key={time} value={time}>{time}</option>;
                              })}
                            </select>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <Label>Available Sports</Label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {/* Combine defaults with existing venue sports to show everything */}
                          {Array.from(new Set([
                            ...['Cricket', 'Football', 'Tennis', 'Badminton', 'Pickleball'],
                            ...(venue?.sports || [])
                          ])).map(sport => {
                            const isActive = venue?.sports?.includes(sport);
                            return (
                              <div
                                key={sport}
                                onClick={() => {
                                  const current = venue?.sports || [];
                                  const fresh = isActive ? current.filter(s => s !== sport) : [...current, sport];
                                  venue && setVenue({ ...venue, sports: fresh });
                                }}
                                className={`cursor-pointer px-4 py-2 rounded-full text-sm border transition-all ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-secondary'}`}
                              >
                                {sport}
                              </div>
                            )
                          })}
                        </div>

                        <div className="flex gap-2">
                          <Input
                            placeholder="Add custom sport..."
                            value={customSport}
                            onChange={(e) => setCustomSport(e.target.value)}
                            className="max-w-[200px]"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (customSport.trim() && venue) {
                                const trimmed = customSport.trim();
                                if (!venue.sports?.includes(trimmed)) {
                                  setVenue({ ...venue, sports: [...(venue.sports || []), trimmed] });
                                  setCustomSport("");
                                }
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      {/* AMENITIES SECTION */}
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">Amenities</Label>
                        <div className="grid grid-cols-2 gap-4">
                          {amenitiesList.map((amenity) => (
                            <div key={amenity} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-${amenity}`}
                                checked={((venue as any)?.amenities || []).includes(amenity)}
                                onCheckedChange={() => {
                                  if (!venue) return;
                                  const current = (venue as any).amenities || [];
                                  const fresh = current.includes(amenity)
                                    ? current.filter((a: string) => a !== amenity)
                                    : [...current, amenity];
                                  setVenue({ ...venue, amenities: fresh } as any);
                                }}
                              />
                              <label htmlFor={`edit-${amenity}`} className="text-sm cursor-pointer select-none">
                                {amenity}
                              </label>
                            </div>
                          ))}
                        </div>

                        {/* Custom Amenities */}
                        <div className="space-y-2 mt-2">
                          <div className="flex gap-2 max-w-sm">
                            <Input
                              placeholder="Add custom amenity..."
                              value={customAmenity}
                              onChange={(e) => setCustomAmenity(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (customAmenity.trim() && venue) {
                                    const trimmed = customAmenity.trim();
                                    const current = (venue as any).amenities || [];
                                    if (!current.includes(trimmed)) {
                                      setVenue({ ...venue, amenities: [...current, trimmed] } as any);
                                      setCustomAmenity('');
                                    }
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                if (customAmenity.trim() && venue) {
                                  const trimmed = customAmenity.trim();
                                  const current = (venue as any).amenities || [];
                                  if (!current.includes(trimmed)) {
                                    setVenue({ ...venue, amenities: [...current, trimmed] } as any);
                                    setCustomAmenity('');
                                  }
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {((venue as any)?.amenities || [])
                              .filter((a: string) => !amenitiesList.includes(a))
                              .map((a: string) => (
                                <Badge key={a} variant="secondary" className="pl-2 pr-1 py-1 flex gap-1 items-center">
                                  {a}
                                  <X
                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                    onClick={() => {
                                      if (!venue) return;
                                      const current = (venue as any).amenities || [];
                                      setVenue({ ...venue, amenities: current.filter((item: string) => item !== a) } as any);
                                    }}
                                  />
                                </Badge>
                              ))}
                          </div>
                        </div>
                      </div>

                    </CardContent>
                  </Card>

                  {/* Base Price & Peak Hours */}
                  <div className="space-y-6">
                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle>Pricing Strategy</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Standard Hourly Rate (₹)</Label>
                          <Input
                            type="number"
                            min="51"
                            value={venue?.pricing || 0}
                            onChange={e => venue && setVenue({ ...venue, pricing: parseFloat(e.target.value) })}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (val <= 50) {
                                toast({
                                  title: "Invalid Price",
                                  description: "Price must be greater than ₹50",
                                  variant: "destructive"
                                });
                                venue && setVenue({ ...venue, pricing: 51 });
                              }
                            }}
                            className="h-11 font-mono text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <p className="text-xs text-muted-foreground">This price applies if no custom overriding price is set.</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Peak Hour Rate (₹)</Label>
                          <Input
                            type="number"
                            min="51"
                            value={(venue as any)?.peak_price || 0}
                            onChange={e => venue && setVenue({ ...venue, peak_price: parseFloat(e.target.value) } as any)}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (val > 0 && val <= 50) {
                                toast({
                                  title: "Invalid Price",
                                  description: "Peak Price must be greater than ₹50",
                                  variant: "destructive"
                                });
                                venue && setVenue({ ...venue, peak_price: 51 } as any);
                              }
                            }}
                            placeholder="Peak hour specific price"
                            className="h-11 font-mono text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <p className="text-xs text-muted-foreground">If set, this price applies during peak hours instead of standard rate.</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle>Peak Hours Configuration</CardTitle>
                        <CardDescription>Mark slots that are in high demand.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <VenueSlotGrid
                          mode="selection"
                          slots={timeSlots}
                          selectedSlots={peakHours}
                          basePrice={venue?.pricing || 0}
                          peakPrice={(venue as any)?.peak_price || 0}
                          onSlotClick={(slot) => {
                            setPeakHours(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
                          }}
                        />
                        <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => handleUpdateVenue()}>
                          Apply Peak Hours
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* SLOT MANAGER TAB (New separated, clean UI) */}
            <TabsContent value="slots" key="slots" className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

                {/* Date Picker Section */}
                <div className="flex flex-col items-center justify-center py-6 bg-card rounded-2xl border border-border/50 shadow-sm mb-6">
                  <Label className="mb-2 text-muted-foreground uppercase tracking-wide text-xs font-bold">Manage Slots For</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={"w-[240px] justify-start text-left font-normal text-lg h-12"}
                      >
                        <CalendarIcon className="mr-2 h-5 w-5" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Freezing Section */}
                  <Card className="border-border/50 shadow-md">
                    <CardHeader className="pb-3 border-b bg-secondary/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            Slot Availability
                            {bookedSlots.length > 0 && <span className="text-xs text-blue-600 ml-2">({bookedSlots.length} Booked)</span>}
                          </CardTitle>
                          <CardDescription>Tap to freeze (block) or unfreeze slots.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <VenueSlotGrid
                        mode="freezing"
                        slots={timeSlots}
                        frozenSlots={getFrozenSlots()}
                        disabledSlots={getDisabledSlots()}
                        bookedSlots={bookedSlots}
                        onSlotClick={handleToggleFreeze}
                      />
                    </CardContent>
                  </Card>

                  {/* Pricing Section */}
                  <Card className="border-border/50 shadow-md">
                    <CardHeader className="pb-3 border-b bg-secondary/5">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="bg-primary/10 p-1.5 rounded-full"><div className="font-bold text-primary">₹</div></div>
                        Custom Pricing
                      </CardTitle>
                      <CardDescription>Override base price for specific slots on this date.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <VenueSlotGrid
                        mode="pricing"
                        slots={timeSlots}
                        pricing={getPricingData()}
                        basePrice={venue?.pricing || 0}
                        disabledSlots={getDisabledSlots()}
                        bookedSlots={bookedSlots}
                        frozenSlots={getFrozenSlots()}
                        onPriceChange={handleUpdateSlotPrice}
                      />
                    </CardContent>
                  </Card>
                </div>

              </motion.div>
            </TabsContent>




          </AnimatePresence>
        </Tabs>
      </main >
    </div >
  );
};

export default EditVenue;
