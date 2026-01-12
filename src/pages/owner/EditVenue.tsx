import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, X, Upload } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Tables } from '@/integrations/supabase/types';
import { motion } from 'framer-motion';

type Venue = Tables<'venues'>;
type VenuePricing = Tables<'venue_pricing'>;

const EditVenue = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [pricing, setPricing] = useState<VenuePricing[]>([]);
  const [peakHours, setPeakHours] = useState<string[]>([]);

  const timeSlots = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM',
  ];

  const fetchVenue = useCallback(async () => {
    if (!id || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .eq('owner_id', user.id)
        .single();

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
      navigate('/owner/venues');
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate, toast]);

  const fetchPricing = useCallback(async () => {
    if (!selectedDate || !id) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
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
  }, [fetchPricing]);

  const getPriceForSlot = (slot: string) => {
    const dateStr = selectedDate?.toISOString().split('T')[0];
    const existing = pricing.find(p => p.date === dateStr && p.time_slot === slot);
    return existing?.price || venue?.pricing || 0;
  };

  const isSlotFrozen = (slot: string) => {
    const dateStr = selectedDate?.toISOString().split('T')[0];
    const existing = pricing.find(p => p.date === dateStr && p.time_slot === slot);
    return existing?.is_frozen || false;
  };

  const handleUpdatePrice = async (slot: string, price: number) => {
    if (!selectedDate) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      const { error } = await supabase
        .from('venue_pricing')
        .upsert({
          venue_id: id,
          date: dateStr,
          time_slot: slot,
          price: price,
          is_frozen: isSlotFrozen(slot),
        }, {
          onConflict: 'venue_id,date,time_slot'
        });

      if (error) throw error;

      toast({
        title: 'Price updated',
        description: `Price for ${slot} updated successfully`,
        duration: 1000,
      });

      fetchPricing();
    } catch (error: any) {
      toast({
        title: 'Error updating price',
        description: error.message,
        variant: 'destructive',
        duration: 1000,
      });
    }
  };

  const handleToggleFreeze = async (slot: string) => {
    if (!selectedDate) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const currentFrozen = isSlotFrozen(slot);

      const { error } = await supabase
        .from('venue_pricing')
        .upsert({
          venue_id: id,
          date: dateStr,
          time_slot: slot,
          price: getPriceForSlot(slot),
          is_frozen: !currentFrozen,
        }, {
          onConflict: 'venue_id,date,time_slot'
        });

      if (error) throw error;

      toast({
        title: currentFrozen ? 'Slot unfrozen' : 'Slot frozen',
        description: `${slot} is now ${currentFrozen ? 'available' : 'frozen'}`,
        duration: 1000,
      });

      fetchPricing();
    } catch (error: any) {
      toast({
        title: 'Error updating slot',
        description: error.message,
        variant: 'destructive',
        duration: 1000,
      });
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    try {
      if (!venue) return;
      const updatedPhotos = (venue.photos || []).filter((p: string) => p !== photoUrl);
      const { error } = await supabase
        .from('venues')
        .update({ photos: updatedPhotos })
        .eq('id', id as string);

      if (error) throw error;

      setVenue({ ...venue, photos: updatedPhotos });
      toast({
        title: 'Photo removed',
        duration: 1000,
      });
    } catch (error: any) {
      toast({
        title: 'Error removing photo',
        description: error.message,
        variant: 'destructive',
        duration: 1000,
      });
    }
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      // DEMO ONLY: Using placeholder for persistence
      // Real app would upload file to storage
      const placeholderImg = 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80';
      const updatedPhotos = [...(venue?.photos || []), placeholderImg];

      const { error } = await supabase
        .from('venues')
        .update({ photos: updatedPhotos })
        .eq('id', id as string);

      if (error) throw error;

      setVenue({ ...venue, photos: updatedPhotos });
      toast({
        title: 'Photo added (Demo Mode)',
        description: "A placeholder image was added. Storage not configured.",
        duration: 1000,
      });
    } catch (error: any) {
      toast({
        title: 'Error adding photo',
        description: error.message,
        variant: 'destructive',
        duration: 1000,
      });
    }
  };

  const handleTogglePeakHour = (slot: string) => {
    setPeakHours(prev =>
      prev.includes(slot)
        ? prev.filter(h => h !== slot)
        : [...prev, slot]
    );
  };

  const handleSavePeakHours = async () => {
    try {
      const { error } = await supabase
        .from('venues')
        .update({ peak_hours: peakHours })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Peak hours updated',
        description: 'Your peak timing preferences have been saved',
        duration: 1000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: 'Error updating peak hours',
        description: message,
        variant: 'destructive',
        duration: 2000,
      });
    }
  };

  const handleUpdateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
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
        })
        .eq('id', id as string);

      if (error) throw error;

      toast({
        title: 'Venue updated',
        description: 'Your venue has been updated successfully',
        duration: 1000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: 'Error updating venue',
        description: message,
        variant: 'destructive',
        duration: 1000,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-primary/5 pb-24">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/owner/venues')} className="group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Venues
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Edit Venue</h1>

          <Tabs defaultValue="details" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-secondary/10 p-1 rounded-xl">
              <TabsTrigger value="details" className="data-[state=active]:bg-background data-[state=active]:text-primary rounded-lg transition-all">Details</TabsTrigger>
              <TabsTrigger value="peak" className="data-[state=active]:bg-background data-[state=active]:text-primary rounded-lg transition-all">Peak Hours</TabsTrigger>
              <TabsTrigger value="pricing" className="data-[state=active]:bg-background data-[state=active]:text-primary rounded-lg transition-all">Dynamic Pricing</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card className="border-primary/20 shadow-lg">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateVenue} className="space-y-6">
                    {/* Photos Section */}
                    <div>
                      <Label className="text-lg">Venue Photos</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                        {venue?.photos?.map((photo: string, index: number) => (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={index}
                            className="relative group overflow-hidden rounded-xl"
                          >
                            <img
                              src={photo}
                              alt={`Venue ${index + 1}`}
                              className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-110"
                              onError={(e) => {
                                // If image fails to load (e.g. expired blob), replace with placeholder
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(photo)}
                              className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </motion.div>
                        ))}
                        <label className="border-2 border-dashed border-muted-foreground/30 hover:border-primary rounded-xl h-32 flex items-center justify-center cursor-pointer transition-colors bg-secondary/5 hover:bg-secondary/10">
                          <div className="text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">Add Photo</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAddPhoto}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Venue Name</Label>
                      <Input
                        id="name"
                        value={venue?.name || ''}
                        onChange={(e) => venue && setVenue({ ...venue, name: e.target.value })}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={venue?.description || ''}
                        onChange={(e) => venue && setVenue({ ...venue, description: e.target.value })}
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={venue?.address || ''}
                        onChange={(e) => venue && setVenue({ ...venue, address: e.target.value })}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pricing">Base Price (₹/hour)</Label>
                      <Input
                        id="pricing"
                        type="number"
                        value={venue?.pricing || 0}
                        onChange={(e) => venue && setVenue({ ...venue, pricing: parseFloat(e.target.value) })}
                        className="h-11 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="openingTime">Opening Time</Label>
                        <select
                          id="openingTime"
                          value={venue?.opening_time || '06:00 AM'}
                          onChange={(e) => venue && setVenue({ ...venue, opening_time: e.target.value })}
                          className="w-full h-11 px-3 rounded-md border border-input bg-background"
                        >
                          {['06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM'].map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="closingTime">Closing Time</Label>
                        <select
                          id="closingTime"
                          value={venue?.closing_time || '11:00 PM'}
                          onChange={(e) => venue && setVenue({ ...venue, closing_time: e.target.value })}
                          className="w-full h-11 px-3 rounded-md border border-input bg-background"
                        >
                          {['08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM', '12:00 AM'].map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Button type="submit" disabled={saving} className="w-full h-12 text-lg">
                      <Save className="h-5 w-5 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="peak">
              <Card className="border-primary/20 shadow-lg">
                <CardHeader>
                  <CardTitle>Configure Peak Hours</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select time slots for premium pricing
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                    {timeSlots.map((slot) => {
                      const isPeak = peakHours.includes(slot);
                      return (
                        <motion.div key={slot} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant={isPeak ? 'default' : 'outline'}
                            className={`w-full h-auto py-3 ${isPeak ? 'bg-primary text-primary-foreground shadow-md' : 'hover:border-primary'}`}
                            onClick={() => handleTogglePeakHour(slot)}
                          >
                            <div className="text-center">
                              <div className="font-semibold text-sm">{slot}</div>
                              {isPeak && (
                                <div className="text-[10px] mt-1 uppercase tracking-wider font-bold opacity-90">Peak</div>
                              )}
                            </div>
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                  <Button onClick={handleSavePeakHours} className="w-full h-11">
                    <Save className="h-4 w-4 mr-2" />
                    Save Peak Hours
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-secondary/20 shadow-lg">
                  <CardHeader>
                    <CardTitle>Select Date</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      className="rounded-xl border shadow-sm"
                    />
                  </CardContent>
                </Card>

                <Card className="border-primary/20 shadow-lg">
                  <CardHeader>
                    <CardTitle>
                      Time Slots for {selectedDate?.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {timeSlots.map((slot) => {
                        const isFrozen = isSlotFrozen(slot);
                        const price = getPriceForSlot(slot);

                        return (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={slot}
                            className={`p-4 border rounded-xl transition-colors ${isFrozen ? 'bg-destructive/5 border-destructive/20' : 'bg-card hover:border-primary/50'
                              }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-semibold">{slot}</span>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`freeze-${slot}`} className={`text-xs font-medium ${isFrozen ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {isFrozen ? 'Frozen' : 'Active'}
                                </Label>
                                <Switch
                                  id={`freeze-${slot}`}
                                  checked={isFrozen}
                                  onCheckedChange={() => handleToggleFreeze(slot)}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Label htmlFor={`price-${slot}`} className="text-sm text-muted-foreground w-20">
                                Price (₹)
                              </Label>
                              <Input
                                id={`price-${slot}`}
                                type="number"
                                value={price}
                                onChange={(e) => handleUpdatePrice(slot, parseFloat(e.target.value))}
                                className="h-9 font-mono"
                                disabled={isFrozen}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default EditVenue;
