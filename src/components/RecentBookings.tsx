import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, MapPin, QrCode, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import QRCode from 'qrcode';

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  amount: number;
  qr_code: string | null;
  venue: {
    name: string;
    address: string;
    category: string;
  };
}

export const RecentBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [generatedQr, setGeneratedQr] = useState<string>('');

  useEffect(() => {
    fetchRecentBookings();

    // Update time every second for real-time countdown
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Generate QR on the fly when dialog opens if missing
  useEffect(() => {
    const generateQr = async () => {
      if (selectedBooking && !selectedBooking.qr_code) {
        try {
          // Use ID as the QR data (Must match Scanner expectation)
          const url = await QRCode.toDataURL(selectedBooking.id);
          setGeneratedQr(url);
        } catch (err) {
          console.error("QR Gen Error", err);
        }
      } else {
        setGeneratedQr('');
      }
    };
    generateQr();
  }, [selectedBooking]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchRecentBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          booking_time,
          status,
          amount,
          qr_code,
          venues (
            name,
            address,
            category
          )
        `)
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false });

      if (error) throw error;

      const mappedBookings = data?.map((booking: any) => ({
        ...booking,
        venue: booking.venues,
      })) || [];

      setBookings(mappedBookings);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      setFetchError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntilBooking = (date: string, time: string) => {
    try {
      // time format: "10:00 AM" or "10:00 AM, 11:00 AM"
      const timeSlots = time.split(',');
      const startTimeStr = timeSlots[0].trim();

      const [timePart, period] = startTimeStr.split(' ');
      const [hours, minutes] = timePart.split(':');
      let hour24 = parseInt(hours);

      if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
      }

      const time24 = `${hour24.toString().padStart(2, '0')}:${minutes}:00`;

      // Create local date object (Browser interprets as Local Time)
      // date is "YYYY-MM-DD"
      const bookingDateTime = new Date(`${date}T${time24}`);

      if (isNaN(bookingDateTime.getTime())) {
        return 'Invalid date';
      }

      if (bookingDateTime < currentTime) {
        return 'Started';
      }

      return formatDistanceToNow(bookingDateTime, { addSuffix: true });
    } catch (error) {
      console.error('Error parsing date:', error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (/* existing loading skeleton */
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming Bookings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">My Bookings</h2>
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="font-bold">Error loading bookings:</p>
          <p>{fetchError}</p>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">My Bookings</h2>
        <Card className="p-8 text-center">
          <div className="space-y-2">
            <p className="text-muted-foreground">You don't have any bookings yet.</p>
            <p className="text-sm text-muted-foreground">Browse venues and make your first booking!</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">My Bookings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((booking) => (
            <Card
              key={booking.id}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedBooking(booking)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {booking.venue.name}
                  </h3>
                  <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                    {booking.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <span className="line-clamp-1">{booking.venue.address}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {booking.booking_date
                        ? new Date(booking.booking_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                        : 'N/A'
                      }
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{booking.booking_time}</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm font-medium text-primary">
                    {getTimeUntilBooking(booking.booking_date, booking.booking_time)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Amount: ₹{booking.amount}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Booking Details
            </DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="font-bold text-lg">{selectedBooking.venue.name}</h3>
                <Badge variant={selectedBooking.status === 'confirmed' ? 'default' : 'secondary'}>
                  {selectedBooking.status}
                </Badge>
              </div>

              <div className="flex flex-col items-center bg-white p-4 rounded-lg">
                {selectedBooking.status === 'confirmed' ? (
                  <>
                    {(selectedBooking.qr_code || generatedQr) ? (
                      <img
                        src={selectedBooking.qr_code || generatedQr}
                        alt="Booking QR Code"
                        className="w-48 h-48"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-muted-foreground">
                        Generating QR...
                      </div>
                    )}
                    <p className="font-mono text-xs font-bold mt-2 text-center tracking-widest text-slate-500">
                      {selectedBooking.id}
                    </p>
                  </>
                ) : (
                  <div className="w-48 h-48 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg">
                    <div className={`p-3 rounded-full mb-2 ${selectedBooking.status === 'cancelled' ? 'bg-red-100 text-red-500' : 'bg-gray-100'}`}>
                      {selectedBooking.status === 'cancelled' ? <XCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                    </div>
                    <p className="text-sm font-medium">QR Code Unavailable</p>
                    <p className="text-xs mt-1 opacity-70">
                      Booking is {selectedBooking.status}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500" />
                  <span>{selectedBooking.venue.address}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(selectedBooking.booking_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedBooking.booking_time}</span>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium text-primary">
                  {getTimeUntilBooking(selectedBooking.booking_date, selectedBooking.booking_time)}
                </p>
                <p className="text-lg font-bold">
                  Amount: ₹{selectedBooking.amount}
                </p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Show this QR code at the venue entrance
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
