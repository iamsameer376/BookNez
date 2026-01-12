import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Download, Home } from 'lucide-react';

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { qrCode, venueName, date, times, monthsCount, amount, isTuition, bookingId } = location.state || {};

  if (!qrCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground mb-4">Booking information not found</p>
            <Button onClick={() => navigate('/dashboard/user')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `booking-qr-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground">
              Your booking has been successfully confirmed
            </p>
          </div>

          <Card className="bg-secondary/10">
            <CardContent className="p-6 space-y-3">
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
              {!isTuition && times && times.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Slots</span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                    {times.map((time: string) => (
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
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Amount Paid</span>
                <span className="font-bold text-lg">₹{amount}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg">
              <img src={qrCode} alt="Booking QR Code" className="w-48 h-48 mx-auto" />
              <p className="font-mono text-sm font-bold mt-3 text-center tracking-wider">{bookingId}</p>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Show this QR code at the venue
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleDownloadQR}
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          </div>

          <Button
            className="w-full"
            onClick={() => navigate('/dashboard/user')}
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingSuccess;
