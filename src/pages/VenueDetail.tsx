import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Star,
  MapPin,
  IndianRupee,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Navigation,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Tables } from '@/integrations/supabase/types';

type Venue = Tables<'venues'>;
type VenuePricing = Tables<'venue_pricing'>;

const VenueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [dynamicPricing, setDynamicPricing] = useState<VenuePricing[]>([]);
  const [monthsCount, setMonthsCount] = useState(1);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [venueStats, setVenueStats] = useState({ average: 0, count: 0 });

  const fetchVenueStats = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('venue_id', id);

    if (!error && data) {
      const total = data.length;
      const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
      setVenueStats({
        average: total ? Number((sum / total).toFixed(1)) : 0,
        count: total
      });
    }
  }, [id]);

  const fetchVenue = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: venueData, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id as string)
        .single();

      const venueTyped = venueData as unknown as Venue;
      if (error) throw error;
      setVenue(venueTyped);
    } catch (error: any) {
      toast({
        title: 'Error fetching venue',
        description: error.message,
        variant: 'destructive',
        duration: 1000,
      });
      navigate('/dashboard/user');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate, toast]);

  const fetchBookedSlots = useCallback(async () => {
    if (!selectedDate || !id) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_time')
        .eq('venue_id', id)
        .eq('booking_date', dateStr)
        .in('status', ['confirmed', 'completed']);

      if (error) throw error;
      setBookedSlots(data?.map(b => b.booking_time) || []);
    } catch (error: any) {
      console.error('Error fetching booked slots:', error);
    }
  }, [id, selectedDate]);

  const fetchDynamicPricing = useCallback(async () => {
    if (!selectedDate || !id) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      console.log('Fetching pricing for:', dateStr, 'Venue:', id); // DEBUG
      const { data, error } = await supabase
        .from('venue_pricing')
        .select('*')
        .eq('venue_id', id)
        .eq('date', dateStr);

      if (error) throw error;
      console.log('Fetched pricing data:', data); // DEBUG
      setDynamicPricing(data || []);
    } catch (error: any) {
      console.error('Error fetching pricing:', error);
    }
  }, [id, selectedDate]);

  useEffect(() => {
    if (id) {
      fetchVenue();
    }
  }, [id, fetchVenue]);

  useEffect(() => {
    if (selectedDate && id) {
      fetchDynamicPricing();
      fetchBookedSlots();
    }
  }, [selectedDate, id, fetchDynamicPricing, fetchBookedSlots]);

  useEffect(() => {
    if (id) {
      fetchVenueStats();
    }
  }, [id, fetchVenueStats]);

  useEffect(() => {
    if (!selectedDate || !id) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const channel = supabase
      .channel(`venue_${id}_${dateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `venue_id=eq.${id}`,
        },
        () => {
          fetchBookedSlots();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venue_pricing',
          filter: `venue_id=eq.${id}`,
        },
        () => {
          fetchDynamicPricing();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'venues',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          // Optimistically update or refetch
          // Payload.new contains the new row data
          if (payload.new) {
            setVenue(payload.new as Venue);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, id, fetchBookedSlots, fetchDynamicPricing]);

  // Generate time slots
  const generateTimeSlots = () => {
    if (!venue) return [];

    const parseTime = (timeStr: string) => {
      const trimmed = timeStr.trim();
      // Handle 24h format (e.g., "14:00")
      if (!trimmed.includes('AM') && !trimmed.includes('PM')) {
        const [hoursStr] = trimmed.split(':');
        return parseInt(hoursStr);
      }
      // Handle 12h format
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

    const startHour = parseTime(venue.opening_time || '06:00 AM');
    const endHour = parseTime(venue.closing_time || '11:00 PM');

    const slots = [];
    const now = new Date();
    const isToday = selectedDate &&
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear();

    const currentHour = isToday ? (now.getMinutes() > 30 ? now.getHours() + 1 : now.getHours()) : -1;

    // Helper to add slot if valid
    const addSlotIfValid = (hour: number) => {
      // For cross-midnight, "next day" hours on "today" selection needs careful handling?
      // Actually, physically:
      // If venue is 11PM to 2AM.
      // On "Jan 14", slots are: 11PM, 12AM (technically Jan 15), 1AM, 2AM.
      // In this simple model, we usually treating 0, 1, 2 as "late night" of the selected day.

      if (!isToday || hour >= currentHour) {
        slots.push(formatTime(hour));
      }
    };

    if (startHour <= endHour) {
      for (let hour = startHour; hour <= endHour; hour++) {
        addSlotIfValid(hour);
      }
    } else {
      // Cross midnight
      for (let hour = startHour; hour <= 23; hour++) {
        addSlotIfValid(hour);
      }
      for (let hour = 0; hour <= endHour; hour++) {
        addSlotIfValid(hour);
      }
    }

    return slots;
  };


  const timeSlots = generateTimeSlots();
  const peakHours = venue?.peak_hours || ['06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'];

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTimes([]);
    setShowTimeSlots(!!date);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTimes(prev =>
      prev.includes(time)
        ? prev.filter(t => t !== time)
        : [...prev, time]
    );
  };

  const isSlotUnavailable = (time: string) => {
    const pricing = dynamicPricing.find(p => p.time_slot === time);
    // console.log(`Checking slot ${time}:`, pricing); // DEBUG verbose
    if (pricing?.is_frozen) return true;
    if (bookedSlots.includes(time)) return true;
    return false;
  };

  const getTotalPrice = () => {
    if (!venue?.pricing) return 500;
    const basePrice = typeof venue.pricing === 'number' ? venue.pricing : 500;
    const isTuition = venue.category === 'tuition';

    if (isTuition) {
      return basePrice * monthsCount;
    }

    let total = 0;
    selectedTimes.forEach(time => {
      const pricing = dynamicPricing.find(p => p.time_slot === time);
      if (pricing) {
        total += pricing.price;
      } else {
        const isPeak = peakHours.includes(time);
        total += isPeak ? basePrice * 1.5 : basePrice;
      }
    });

    return total || basePrice;
  };

  const handleBookNow = () => {
    const isTuition = venue?.category === 'tuition';

    if (!selectedDate) {
      toast({
        title: 'Selection required',
        description: 'Please select a date',
        variant: 'destructive',
        duration: 1000,
      });
      return;
    }

    if (!isTuition && selectedTimes.length === 0) {
      toast({
        title: 'Selection required',
        description: 'Please select at least one time slot',
        variant: 'destructive',
        duration: 1000,
      });
      return;
    }

    navigate('/booking/confirm', {
      state: {
        venueId: venue?.id,
        venueName: venue?.name,
        venueCategory: venue?.category,
        date: selectedDate,
        times: selectedTimes,
        monthsCount: isTuition ? monthsCount : undefined,
        amount: getTotalPrice(),
      },
    });
  };

  const handleGetDirections = () => {
    if (!venue?.latitude || !venue?.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold">Venue not found</h2>
        <p className="text-muted-foreground">The venue you are looking for does not exist or has been removed.</p>
        <Button onClick={() => navigate('/dashboard/user')}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 pb-20">
      <header className="sticky top-0 z-50 border-b bg-background/60 backdrop-blur-md transition-all">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard/user')}
            className="gap-2 hover:bg-background/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Venues
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {/* Left Column - Venue Details */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Image Gallery with Carousel */}
            <Card className="overflow-hidden border-none shadow-xl">
              <div className="relative h-64 sm:h-80 lg:h-96 group">
                <img
                  src={venue.photos[currentPhotoIndex] || '/placeholder.svg'}
                  alt={venue.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                {venue.photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setCurrentPhotoIndex((prev) => prev === 0 ? venue.photos.length - 1 : prev - 1)}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setCurrentPhotoIndex((prev) => prev === venue.photos.length - 1 ? 0 : prev + 1)}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {venue.photos.map((_, idx) => (
                        <button
                          key={idx}
                          className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/40 w-1.5'}`}
                          onClick={() => setCurrentPhotoIndex(idx)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              {venue.photos.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 p-2 bg-card/50 backdrop-blur-md">
                  {venue.photos.slice(0, 5).map((photo, idx) => (
                    <div
                      key={idx}
                      className={`relative h-16 sm:h-20 rounded-md overflow-hidden cursor-pointer transition-all ${currentPhotoIndex === idx ? 'ring-2 ring-primary scale-95' : 'hover:opacity-80'}`}
                      onClick={() => setCurrentPhotoIndex(idx)}
                    >
                      <img
                        src={photo}
                        alt={`${venue.name} ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Venue Info */}
            <Card className="border shadow-sm bg-card/60 backdrop-blur-md">
              <CardContent className="p-6 space-y-6">
                <div>
                  <div className="flex justify-between items-start">
                    <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">{venue.name}</h1>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div
                      className="flex items-center gap-2 cursor-pointer w-fit hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/venues/${venue.id}/reviews`)}
                    >
                      <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-bold text-foreground">{venueStats.average || '0.0'}</span>
                      </div>
                      <span className="text-sm text-muted-foreground underline decoration-dotted underline-offset-4">
                        {venueStats.count} reviews
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="flex items-start gap-2 text-muted-foreground">
                      <div className="p-1.5 bg-red-500/10 rounded-full shrink-0 mt-0.5">
                        <MapPin className="h-4 w-4 text-red-500" />
                      </div>
                      <span className="leading-snug">{venue.address}</span>
                    </div>

                    {venue.latitude && venue.longitude && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary mt-1 h-9"
                        onClick={handleGetDirections}
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Get Directions
                      </Button>
                    )}
                  </div>
                </div>

                {venue.description && (
                  <div>
                    <h2 className="text-xl font-semibold mb-2">About</h2>
                    <p className="text-muted-foreground leading-relaxed">{venue.description}</p>
                  </div>
                )}

                {venue.sports && venue.sports.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Sports Available</h2>
                    <div className="flex flex-wrap gap-2">
                      {venue.sports.map((sport) => (
                        <Badge
                          key={sport}
                          variant="default"
                          className="flex items-center gap-1.5 px-3 py-1"
                        >
                          {sport}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-semibold mb-3">Facilities</h2>
                  <div className="flex flex-wrap gap-2">
                    {((venue as any).amenities || []).map((amenity: string) => (
                      <Badge
                        key={amenity}
                        variant="secondary"
                        className="flex items-center gap-1.5 px-3 py-1 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Slots */}
            {showTimeSlots && venue?.category !== 'tuition' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border shadow-sm bg-card/60 backdrop-blur-md">
                  <CardContent className="p-6">
                    <h2 className="text-lg sm:text-xl font-semibold mb-2">Select Time Slots</h2>
                    <p className="text-sm text-muted-foreground mb-6">You can select multiple slots to create a longer booking.</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {timeSlots.map((time) => {
                        const isPeak = peakHours.includes(time);
                        const isSelected = selectedTimes.includes(time);
                        const isUnavailable = isSlotUnavailable(time);

                        // Calculate price for this specific slot
                        let price = venue?.pricing || 500;
                        const dynamicPrice = dynamicPricing.find(p => p.time_slot === time);
                        if (dynamicPrice) {
                          price = dynamicPrice.price;
                        } else if (isPeak) {
                          price = price * 1.5;
                        }

                        return (
                          <Button
                            key={time}
                            variant={isSelected ? 'default' : 'outline'}
                            className={`
                                relative h-auto py-3 flex flex-col gap-1 border-2 transition-all p-2
                                ${isSelected ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary' : 'hover:border-primary/50'}
                                ${isUnavailable ? 'opacity-40 cursor-not-allowed bg-muted hover:bg-muted hover:border-border' : ''}
                              `}
                            onClick={() => handleTimeSelect(time)}
                            disabled={isUnavailable}
                          >
                            <span className="font-semibold text-sm">{time}</span>
                            <span className="text-xs font-medium opacity-80">₹{price}</span>
                            {isPeak && !isUnavailable && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-medium absolute -top-2 -right-2 border border-orange-200 bg-white">Peak</span>
                            )}
                            {isUnavailable && (
                              <span className="text-[10px] font-medium text-destructive">Booked</span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="border shadow-xl bg-card/80 backdrop-blur-md">
                <CardContent className="p-6 space-y-6">
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
                    <div className="flex items-center justify-center gap-1 text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                      <IndianRupee className="h-7 w-7 text-primary" />
                      {getTotalPrice()}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {venue?.category === 'tuition' ? 'per month' : 'total price'}
                    </span>
                  </div>

                  {selectedTimes.length > 0 && (
                    <div className="flex justify-between items-center px-2">
                      <span className="text-sm text-muted-foreground">{selectedTimes.length} slots selected</span>
                      <Badge variant="outline" className="border-primary/20 text-primary cursor-pointer hover:bg-primary/5" onClick={() => { setSelectedTimes([]); setSelectedDate(undefined); }}>Reset</Badge>
                    </div>
                  )}

                  {venue?.category === 'tuition' && showTimeSlots && (
                    <div className="bg-secondary/20 p-4 rounded-lg">
                      <Label className="text-sm font-semibold mb-3 block">Duration (Months)</Label>
                      <div className="flex items-center justify-between bg-background rounded-md border p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setMonthsCount(Math.max(1, monthsCount - 1))}
                        >
                          -
                        </Button>
                        <span className="text-lg font-bold w-12 text-center">{monthsCount}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setMonthsCount(Math.min(12, monthsCount + 1))}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  )}

                  {!showTimeSlots && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Select Date</h3>
                      </div>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const compareDate = new Date(date);
                          compareDate.setHours(0, 0, 0, 0);
                          return compareDate < today;
                        }}
                        className="rounded-lg border bg-background/50 shadow-sm w-full flex justify-center"
                      />
                    </div>
                  )}

                  {selectedTimes.length > 0 && (
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                      <div className="flex items-center gap-2 text-sm mb-3 text-primary font-medium">
                        <Clock className="h-4 w-4" />
                        <span>Selected Slots</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTimes.map(time => (
                          <Badge key={time} variant="secondary" className="bg-background/80 shadow-sm border">{time}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full h-12 text-lg shadow-lg shadow-primary/20"
                    size="lg"
                    onClick={handleBookNow}
                    disabled={!selectedDate || (venue?.category !== 'tuition' && selectedTimes.length === 0)}
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default VenueDetail;
