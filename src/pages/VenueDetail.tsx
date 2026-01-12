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
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
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
      const dateStr = selectedDate.toISOString().split('T')[0];
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
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('venue_pricing')
        .select('*')
        .eq('venue_id', id)
        .eq('date', dateStr);

      if (error) throw error;
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

    const dateStr = selectedDate.toISOString().split('T')[0];

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, id, fetchBookedSlots, fetchDynamicPricing]);

  // Generate time slots based on venue opening and closing times
  const generateTimeSlots = () => {
    if (!venue) return [];

    const parseTime = (timeStr: string) => {
      const [time, period] = timeStr.trim().split(' ');
      const [hoursStr, minutesStr] = time.split(':');
      let hours = parseInt(hoursStr);
      const minutes = parseInt(minutesStr);

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

    // Get current hour + 1 for buffer (allow booking starting from next hour)
    const currentHour = isToday ? now.getHours() + 1 : -1;

    for (let hour = startHour; hour <= endHour; hour++) {
      // For same-day bookings, only show future time slots
      if (!isToday || hour >= currentHour) {
        slots.push(formatTime(hour));
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
    // Check if slot is frozen by owner
    const pricing = dynamicPricing.find(p => p.time_slot === time);
    if (pricing?.is_frozen) return true;

    // Check if slot is already booked
    if (bookedSlots.includes(time)) return true;

    return false;
  };

  const getTotalPrice = () => {
    if (!venue?.pricing) return 500;

    // venue.pricing is a number based on the type definition
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard/user')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Venues
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Venue Details */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Image Gallery with Carousel */}
            <Card className="overflow-hidden">
              <div className="relative h-64 sm:h-80 lg:h-96">
                <img
                  src={venue.photos[currentPhotoIndex] || '/placeholder.svg'}
                  alt={venue.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
                {venue.photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={() => setCurrentPhotoIndex((prev) => prev === 0 ? venue.photos.length - 1 : prev - 1)}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={() => setCurrentPhotoIndex((prev) => prev === venue.photos.length - 1 ? 0 : prev + 1)}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                      {venue.photos.map((_, idx) => (
                        <button
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-all ${idx === currentPhotoIndex ? 'bg-white w-4' : 'bg-white/50'
                            }`}
                          onClick={() => setCurrentPhotoIndex(idx)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              {venue.photos.length > 1 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-4">
                  {venue.photos.slice(0, 4).map((photo, idx) => (
                    <div
                      key={idx}
                      className={`relative h-20 sm:h-24 rounded-lg overflow-hidden cursor-pointer transition-all ${currentPhotoIndex === idx ? 'ring-2 ring-primary' : ''
                        }`}
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
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold mb-3">{venue.name}</h1>
                  <div className="flex flex-col gap-3">
                    <div
                      className="flex items-center gap-2 cursor-pointer w-fit hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/venues/${venue.id}/reviews`)}
                    >
                      <div className="flex items-center gap-1 bg-accent/10 px-2 py-0.5 rounded-full">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
                        <span className="font-bold text-foreground">{venueStats.average || '0.0'}</span>
                      </div>
                      <span className="text-sm text-muted-foreground underline decoration-dotted underline-offset-4">
                        {venueStats.count} reviews
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-5 w-5" />
                      <span>{venue.address}</span>
                    </div>
                  </div>
                </div>

                {venue.description && (
                  <div>
                    <h2 className="text-xl font-semibold mb-2">About</h2>
                    <p className="text-muted-foreground">{venue.description}</p>
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-semibold mb-3">Facilities</h2>
                  <div className="flex flex-wrap gap-2">
                    {venue.amenities.map((amenity) => (
                      <Badge
                        key={amenity}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Slots or Months - Only show after date is selected */}
            {showTimeSlots && venue?.category !== 'tuition' && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg sm:text-xl font-semibold mb-4">Select Time Slots (Multiple allowed)</h2>
                  <p className="text-sm text-muted-foreground mb-4">Click multiple slots to book them together</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {timeSlots.map((time) => {
                      const isPeak = peakHours.includes(time);
                      const isSelected = selectedTimes.includes(time);
                      const isUnavailable = isSlotUnavailable(time);

                      return (
                        <Button
                          key={time}
                          variant={isSelected ? 'default' : 'outline'}
                          className={`relative ${isUnavailable ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
                          onClick={() => handleTimeSelect(time)}
                          disabled={isUnavailable}
                        >
                          <div className="text-center">
                            <div className="font-semibold text-xs">{time}</div>
                            {isPeak && !isUnavailable && (
                              <div className="text-xs">Peak</div>
                            )}
                            {isUnavailable && (
                              <div className="text-xs text-destructive">Booked</div>
                            )}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-3xl font-bold">
                    <IndianRupee className="h-6 w-6" />
                    {getTotalPrice()}
                    <span className="text-sm font-normal text-muted-foreground">
                      {venue?.category === 'tuition' ? '/month' : '/slot'}
                    </span>
                  </div>
                  {selectedTimes.length > 1 && (
                    <Badge variant="secondary" className="mt-2">
                      {selectedTimes.length} slots selected
                    </Badge>
                  )}
                </div>

                {venue?.category === 'tuition' && showTimeSlots && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Number of Months</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMonthsCount(Math.max(1, monthsCount - 1))}
                      >
                        -
                      </Button>
                      <span className="text-lg font-semibold w-12 text-center">{monthsCount}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMonthsCount(Math.min(12, monthsCount + 1))}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Total: ₹{getTotalPrice()} for {monthsCount} month(s)
                    </p>
                  </div>
                )}

                {!showTimeSlots && (
                  <div>
                    <h3 className="font-semibold mb-3">Select Date First</h3>
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
                      className="rounded-md border"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Choose a date to see available time slots
                    </p>
                  </div>
                )}

                {selectedTimes.length > 0 && (
                  <div className="p-4 bg-secondary/10 rounded-lg">
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-semibold">Selected Slots:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedTimes.map(time => (
                        <Badge key={time} variant="secondary">{time}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
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
      </main>
    </div>
  );
};

export default VenueDetail;
