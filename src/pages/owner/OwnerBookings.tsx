import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Clock, User, MapPin } from 'lucide-react';
import { format, startOfToday, startOfWeek, startOfMonth, startOfYear, endOfDay, subDays } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/DateRangePicker';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';

type Booking = Tables<'bookings'>;
type Venue = Tables<'venues'>;
type Profile = Tables<'profiles'>;

interface BookingWithDetails extends Booking {
  venue_name: string;
  venue_address: string;
  venue_category: string;
  user_name: string;
}

const OwnerBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('week');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date()
  });

  const handleFilterChange = (type: 'today' | 'week' | 'month' | 'year') => {
    setFilterType(type);
    const now = new Date();
    let from = now;

    switch (type) {
      case 'today': from = startOfToday(); break;
      case 'week': from = startOfWeek(now, { weekStartsOn: 1 }); break;
      case 'month': from = startOfMonth(now); break;
      case 'year': from = startOfYear(now); break;
    }

    setDateRange({ from, to: endOfDay(now) });
  };

  const fetchBookings = useCallback(async () => {
    if (!user || !dateRange?.from || !dateRange?.to) return;

    try {
      setLoading(true);
      // Get owner's venues
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, address, category')
        .eq('owner_id', user?.id as string);

      if (venuesError) throw venuesError;

      if (!venues || venues.length === 0) {
        setLoading(false);
        setBookings([]);
        return;
      }

      const venueIds = venues.map(v => v.id);
      const fromStr = dateRange.from.toISOString();
      const toStr = dateRange.to.toISOString();

      // Get bookings for those venues within range
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings' as any) // Type check workaround if needed or remove 'as any' if types are perfect
        .select('*')
        .in('venue_id', venueIds)
        .gte('booking_date', fromStr.split('T')[0])
        .lte('booking_date', toStr.split('T')[0])
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Get user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', (bookingsData as any)?.map((b: any) => b.user_id) || []);

      // Combine data
      const bookingsWithDetails = ((bookingsData as any) || []).map((booking: any) => {
        const venue = venues.find(v => v.id === booking.venue_id);
        const profile = profiles?.find(p => p.id === booking.user_id);

        return {
          ...booking,
          venue_name: venue?.name || 'Unknown Venue',
          venue_address: venue?.address || '',
          venue_category: venue?.category || '',
          user_name: profile?.full_name || 'Customer',
        };
      });

      setBookings(bookingsWithDetails);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: 'Error fetching bookings',
        description: message,
        variant: 'destructive',
        duration: 1000,
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast, dateRange]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user, fetchBookings]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive'> = {
      confirmed: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
    };
    return colors[status] || 'default';
  };

  const groupedBookings = bookings.reduce((acc, booking) => {
    const category = booking.venue_category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(booking);
    return acc;
  }, {} as Record<string, BookingWithDetails[]>);

  const categoryLabels: Record<string, string> = {
    'sports_turf': 'TURF',
    'turf': 'TURF',
    'sports_pool': 'Sports Pool',
    'salon': 'Salon',
    'cinema': 'Cinema',
    'clinic': 'Clinic',
    'tuition': 'Tuition',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-primary/10">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard/owner')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-3xl font-bold">Bookings</h2>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-card/40 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-sm">
            <div className="flex gap-1 bg-background/50 p-1 rounded-lg border border-white/5 backdrop-blur-sm">
              {['today', 'week', 'month', 'year'].map((t) => (
                <Button
                  key={t}
                  variant="ghost"
                  onClick={() => handleFilterChange(t as any)}
                  className={`capitalize h-8 px-3 rounded-md transition-all ${filterType === t ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-primary/10 hover:text-primary text-muted-foreground'}`}
                  size="sm"
                >
                  {t}
                </Button>
              ))}
            </div>
            <DatePickerWithRange
              date={dateRange}
              setDate={(range) => {
                setFilterType('custom');
                setDateRange(range);
              }}
              className="w-full sm:w-auto backdrop-blur-sm bg-background/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <div>
                          <Skeleton className="h-5 w-48 mb-1" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No bookings found"
            description="There are no bookings for the selected time period. Try adjusting your filters."
          />
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedBookings).map(([category, categoryBookings]) => (
              <div key={category}>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Badge variant="outline" className="text-base">
                    {categoryLabels[category] || category}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    ({categoryBookings.length} booking{categoryBookings.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                <div className="space-y-4">
                  {categoryBookings.map((booking) => (
                    <Card key={booking.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-red-500" />
                              <div>
                                <h4 className="font-semibold">{booking.venue_name}</h4>
                                <p className="text-sm text-muted-foreground">{booking.venue_address}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(new Date(booking.booking_date), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{booking.booking_time}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{booking.user_name}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-3">
                            <Badge variant={getStatusColor(booking.status)}>
                              {booking.status.toUpperCase()}
                            </Badge>
                            <span className="text-xl font-bold">₹{booking.amount}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default OwnerBookings;
