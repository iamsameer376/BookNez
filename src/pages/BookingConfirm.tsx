import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CreditCard, Wallet, Smartphone, IndianRupee } from 'lucide-react';
import QRCode from 'qrcode';
import { Badge } from '@/components/ui/badge';

const BookingConfirm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  const { venueId, venueName, venueCategory, date, times, monthsCount, amount } = location.state || {};

  const isTuition = venueCategory === 'tuition';
  const bookingTimes = times || [];

  if (!venueId || !date || (!isTuition && bookingTimes.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground mb-4">Invalid booking details</p>
            <Button onClick={() => navigate('/dashboard/user')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [bookingError, setBookingError] = useState<string | null>(null);

  const handleConfirmBooking = async () => {
    if (!user) return;

    setIsProcessing(true);
    setBookingError(null);
    try {
      // For tuition or single slot, create one booking
      // For multiple time slots, create separate bookings for each slot
      const bookingsToCreate = isTuition || bookingTimes.length === 0
        ? [{ time: 'Monthly', amount: amount }]
        : bookingTimes.map(time => ({
          time,
          amount: amount / bookingTimes.length, // Split amount equally
        }));

      let firstBookingId = '';
      let qrCodeUrl = '';

      // Create bookings
      for (let i = 0; i < bookingsToCreate.length; i++) {
        const bookingData = bookingsToCreate[i];

        // 1. Insert Booking first to get the ID
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            user_id: user.id,
            venue_id: venueId,
            booking_date: (() => {
              const d = new Date(date);
              const offset = d.getTimezoneOffset();
              const localDate = new Date(d.getTime() - (offset * 60 * 1000));
              return localDate.toISOString().split('T')[0];
            })(),
            booking_time: bookingData.time,
            amount: bookingData.amount,
            status: 'confirmed',
            qr_code: '', // Placeholder, will update
          })
          .select()
          .single();

        if (bookingError) throw bookingError;

        if (i === 0) {
          firstBookingId = booking.id;
        }

        // 2. Generate QR Code using the Booking ID
        // We use just the ID for simplicity and reliability
        const qrData = booking.id;
        const generatedQrUrl = await QRCode.toDataURL(qrData);

        if (i === 0) {
          qrCodeUrl = generatedQrUrl;
        }

        // 3. Update the booking with the QR code URL
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ qr_code: generatedQrUrl })
          .eq('id', booking.id);

        if (updateError) throw updateError;

        // Create payment record for each booking
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            booking_id: booking.id,
            amount: bookingData.amount,
            payment_mode: paymentMethod,
            status: 'completed',
            transaction_id: `TXN${Date.now()}-${i}`,
          });

        if (paymentError) throw paymentError;
      }

      toast({
        title: 'Booking confirmed!',
        description: `Successfully booked ${bookingsToCreate.length > 1 ? `${bookingsToCreate.length} slots` : '1 slot'}!`,
        duration: 1000,
      });

      navigate('/booking/success', {
        state: {
          bookingId: firstBookingId,
          qrCode: qrCodeUrl,
          venueName,
          date,
          times: bookingTimes,
          monthsCount,
          amount,
          isTuition,
        },
      });
    } catch (error: any) {
      console.error("Booking Error:", error);
      const msg = error.message || "Booking failed due to unknown error";
      setBookingError(msg);
      window.scrollTo(0, 0);
      toast({
        title: 'Booking failed',
        description: msg,
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Confirm Your Booking</h1>

        <div className="space-y-6">
          {bookingError && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg whitespace-pre-wrap font-medium">
              {bookingError}
            </div>
          )}
          {/* Booking Summary */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Booking Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Venue</span>
                  <span className="font-semibold">{venueName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-semibold">
                    {new Date(date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {!isTuition && bookingTimes.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Slots</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                      {bookingTimes.map(time => (
                        <Badge key={time} variant="secondary" className="text-xs">
                          {time}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {isTuition && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-semibold">{monthsCount} month(s)</span>
                  </div>
                )}
                <div className="flex justify-between pt-4 border-t">
                  <span className="text-lg font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold flex items-center">
                    <IndianRupee className="h-5 w-5" />
                    {amount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Payment Method</h2>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="upi" id="upi" />
                  <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Smartphone className="h-5 w-5" />
                    UPI
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="h-5 w-5" />
                    Credit/Debit Card
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="wallet" id="wallet" />
                  <Label htmlFor="wallet" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Wallet className="h-5 w-5" />
                    Wallet
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={handleConfirmBooking}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Confirm & Pay'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default BookingConfirm;
