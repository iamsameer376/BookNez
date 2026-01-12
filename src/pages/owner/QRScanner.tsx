import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle, XCircle, Search, AlertTriangle, Scan, RefreshCw, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingDetails {
  id: string;
  booking_date: string;
  booking_time: string;
  amount: number;
  status: string;
  venue_id: string;
  venue_name?: string;
  user_email?: string;
  user_name?: string;
  qr_scanned: boolean;
  qr_scanned_at?: string;
}

interface ScanResult {
  type: 'success' | 'error' | 'warning';
  title: string;
  description: string;
}

const QRScanner = () => {
  const navigate = useNavigate();

  // State
  const [shouldScan, setShouldScan] = useState(false); // Controls logical intent to scan
  const [scanning, setScanning] = useState(false);     // Reflects actual hardware state

  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [manualId, setManualId] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(e => console.warn("Failed to stop scanner on unmount", e));
        }
        scannerRef.current.clear();
      }
    };
  }, []);

  // Effect to handle scanning logic based on `shouldScan` and DOM readiness
  useEffect(() => {
    let mounted = true;

    const initScanner = async () => {
      if (!shouldScan) {
        if (scannerRef.current && scanning) {
          try {
            await scannerRef.current.stop();
            scannerRef.current.clear();
            if (mounted) setScanning(false);
          } catch (e) {
            console.error("Stop failed", e);
          }
        }
        return;
      }

      // If we should scan, wait for the element to exist
      const checkElement = async () => {
        const element = document.getElementById("qr-reader");
        if (!element) {
          // Retry shortly if element not found yet (React render delay)
          await new Promise(resolve => setTimeout(resolve, 50));
          return checkElement();
        }
        return element;
      };

      await checkElement();
      if (!mounted) return;

      // Existing instance cleanup
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (e) { console.warn("Cleanup error", e); }
      }

      // Initialize new instance
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          (errorMessage) => {
            // excessive logs ignored 
          }
        );
        if (mounted) setScanning(true);
      } catch (err) {
        console.warn("Back camera failed, trying user camera...", err);
        try {
          await html5QrCode.start(
            { facingMode: "user" },
            config,
            onScanSuccess,
            () => { }
          );
          if (mounted) setScanning(true);
        } catch (err2) {
          console.error("All cameras failed", err2);
          if (mounted) {
            setScanResult({
              type: 'error',
              title: "Camera Error",
              description: "Could not access camera. Please check permissions."
            });
            setShouldScan(false);
          }
        }
      }
    };

    initScanner();

    return () => {
      mounted = false;
    };
  }, [shouldScan]); // Re-run when `shouldScan` changes

  const startScanning = () => {
    setScanResult(null);
    setBookingDetails(null);
    setShouldScan(true);
  };

  const stopScanningManual = () => {
    setShouldScan(false);
  };

  const verifyBooking = async (rawBookingId: string) => {
    const bookingId = rawBookingId.trim().replace(/^"|"$/g, '');


    try {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
        throw new Error("Invalid Booking ID format.");
      }

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`*, venues (name, owner_id)`)
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;
      if (!bookingData) throw new Error('Booking not found.');

      let booking = bookingData as any;

      if (booking.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', booking.user_id)
          .single();
        booking.profiles = profile;
      }

      // 1. Venue Check
      const { data: { user } } = await supabase.auth.getUser();
      if (booking.venues?.owner_id !== user?.id) {
        setScanResult({
          type: 'error',
          title: "Wrong Venue",
          description: "This booking belongs to another venue."
        });
        return;
      }

      // 2. Date Check
      const now = new Date();
      // Proper local date handling
      const d = new Date();
      // Get today in YYYY-MM-DD
      const offset = d.getTimezoneOffset();
      const localNow = new Date(d.getTime() - (offset * 60 * 1000));
      const todayStr = localNow.toISOString().split('T')[0];

      if (booking.booking_date !== todayStr) {
        setScanResult({
          type: 'error',
          title: "Wrong Date",
          description: `Booking is for ${booking.booking_date}, but today is ${todayStr}.`
        });

        setBookingDetails({
          id: booking.id,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          amount: booking.amount,
          status: 'Wrong Date',
          venue_id: booking.venue_id,
          venue_name: booking.venues?.name || 'Venue',
          user_email: booking.profiles?.email || 'Customer',
          user_name: booking.profiles?.full_name || 'Guest',
          qr_scanned: booking.qr_scanned,
          qr_scanned_at: booking.qr_scanned_at,
        });
        return;
      }

      // 3. Already Scanned Check
      if (booking.qr_scanned) {
        setScanResult({
          type: 'warning',
          title: "Already Used",
          description: `Scanned at ${new Date(booking.qr_scanned_at).toLocaleTimeString()}`
        });

        setBookingDetails({
          id: booking.id,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          amount: booking.amount,
          status: booking.status,
          venue_id: booking.venue_id,
          venue_name: booking.venues?.name || 'Venue',
          user_email: booking.profiles?.email || 'Customer',
          user_name: booking.profiles?.full_name || 'Guest',
          qr_scanned: booking.qr_scanned,
          qr_scanned_at: booking.qr_scanned_at,
        });
        return;
      }

      // 4. Time Check
      const bookingTimeStr = booking.booking_time;
      const timeSlots = bookingTimeStr.split(',').map((t: string) => t.trim());
      const firstSlot = timeSlots[0];
      const lastSlot = timeSlots[timeSlots.length - 1];

      const parseTime = (timeStr: string, baseDate: Date) => {
        const [time, period] = timeStr.split(' ');
        const [hoursStr, minutesStr] = time.split(':');
        let hours = parseInt(hoursStr);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        const d = new Date(baseDate);
        d.setHours(hours, parseInt(minutesStr) || 0, 0, 0);
        return d;
      };

      const bookingDateObj = new Date(booking.booking_date);
      const startTime = parseTime(firstSlot, bookingDateObj);
      const lastSlotStart = parseTime(lastSlot, bookingDateObj);
      const endTime = new Date(lastSlotStart);
      endTime.setHours(endTime.getHours() + 1);

      const allowedEntryStart = new Date(startTime.getTime() - 10 * 60 * 1000);

      if (now < allowedEntryStart) {
        const diffMs = allowedEntryStart.getTime() - now.getTime();
        const diffMins = Math.ceil(diffMs / 60000);

        setScanResult({
          type: 'error',
          title: "Too Early",
          description: `Entry allowed in ${diffMins} mins (${allowedEntryStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
        });
        return;
      }

      // Allow entry up to the end of the slot
      if (now > endTime) {
        setScanResult({
          type: 'error',
          title: "Expired",
          description: "This slot has ended."
        });

        setBookingDetails({
          id: booking.id,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          amount: booking.amount,
          status: 'Expired',
          venue_id: booking.venue_id,
          venue_name: booking.venues?.name || 'Venue',
          user_email: booking.profiles?.email || 'Customer',
          user_name: booking.profiles?.full_name || 'Guest',
          qr_scanned: false,
        });
        return;
      }

      // 5. Success
      const bookingWithDetails: BookingDetails = {
        id: booking.id,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        amount: booking.amount,
        status: booking.status,
        venue_id: booking.venue_id,
        venue_name: booking.venues?.name || 'Venue',
        user_email: booking.profiles?.email || 'Customer',
        user_name: booking.profiles?.full_name || 'Guest',
        qr_scanned: booking.qr_scanned,
        qr_scanned_at: booking.qr_scanned_at,
      };

      setBookingDetails(bookingWithDetails);

      if (booking.status === 'confirmed') {
        const scanTime = new Date().toISOString();
        await supabase
          .from('bookings')
          .update({
            status: 'completed',
            qr_scanned: true,
            qr_scanned_at: scanTime
          })
          .eq('id', bookingId);

        bookingWithDetails.qr_scanned = true;
        bookingWithDetails.qr_scanned_at = scanTime;
        bookingWithDetails.status = 'completed';
        setBookingDetails(bookingWithDetails);

        setScanResult({
          type: 'success',
          title: "Entry Allowed",
          description: "Welcome!"
        });
      } else {
        setScanResult({
          type: 'error',
          title: "Not Confirmed",
          description: `Booking Status: ${booking.status}`
        });
      }

    } catch (error: any) {
      console.error("Verification Error:", error);
      setScanResult({
        type: 'error',
        title: "Invalid QR",
        description: "Code not recognized."
      });
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    // Stop scanning first logic handled by effect when we set shouldScan to false
    setShouldScan(false);
    verifyBooking(decodedText);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) {
      setShouldScan(false);
      setScanResult(null);
      setBookingDetails(null);
      verifyBooking(manualId);
    }
  };

  // Helper to render result box content
  const renderResultContent = () => {
    if (!scanResult) return null;

    const styles = {
      success: {
        bg: 'bg-green-100 dark:bg-green-900',
        border: 'border-green-500',
        iconColor: 'text-green-600 dark:text-green-300',
        icon: CheckCircle,
      },
      error: {
        bg: 'bg-red-100 dark:bg-red-900',
        border: 'border-red-500',
        iconColor: 'text-red-600 dark:text-red-300',
        icon: XCircle,
      },
      warning: {
        bg: 'bg-yellow-100 dark:bg-yellow-900',
        border: 'border-yellow-500',
        iconColor: 'text-yellow-600 dark:text-yellow-300',
        icon: AlertTriangle,
      }
    };

    const style = styles[scanResult.type];
    const Icon = style.icon;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl p-8 shadow-xl ${style.bg} ${style.border} border-t-8 mb-6 text-center`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`p-4 rounded-full bg-white/80 dark:bg-black/20 ${style.iconColor} shadow-sm`}>
            <Icon className="h-12 w-12" />
          </div>
          <div>
            <h3 className={`text-2xl font-black tracking-tight ${style.iconColor}`}>{scanResult.title}</h3>
            <p className="text-muted-foreground font-medium mt-1 text-lg">{scanResult.description}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/owner')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-lg font-bold ml-2">Venue Scanner</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">

        {/* 1. Result Box Area */}
        <AnimatePresence mode="wait">
          {scanResult && (
            <motion.div key="result" exit={{ opacity: 0, y: -20 }}>
              {renderResultContent()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Scanner Area */}
        {/* We hide the scanner UI when a result is shown, but we keep the logical structure ready */}
        <AnimatePresence>
          {!scanResult && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="mb-6 overflow-hidden border-0 shadow-2xl rounded-3xl">
                <CardContent className="p-0 relative bg-black">

                  {/* Camera Container */}
                  <div className="relative w-full aspect-square bg-black overflow-hidden">
                    {/* The div where html5-qrcode renders. */}
                    {shouldScan && <div id="qr-reader" className="w-full h-full"></div>}

                    {/* Overlay for "Camera Off" */}
                    {!shouldScan && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 bg-slate-900">
                        <Smartphone className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Ready to Scan</p>
                      </div>
                    )}

                    {/* Laser Scanner Animation */}
                    {scanning && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="w-full h-full border-[20px] border-black/50 absolute inset-0 z-10"></div>
                        <motion.div
                          className="w-[80%] h-1 bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.8)] absolute left-[10%] z-20"
                          animate={{ top: ['10%', '90%', '10%'] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                        <div className="absolute top-4 right-4 z-20">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="p-6 bg-white dark:bg-slate-900">
                    <div className="flex justify-center mb-6">
                      {!shouldScan ? (
                        <Button
                          onClick={startScanning}
                          size="lg"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-lg font-bold shadow-blue-200 dark:shadow-none shadow-lg transform transition active:scale-95"
                        >
                          <Scan className="h-6 w-6 mr-2" />
                          Tap to Scan
                        </Button>
                      ) : (
                        <Button
                          onClick={stopScanningManual}
                          variant="outline"
                          size="lg"
                          className="w-full rounded-xl"
                        >
                          Cancel Scanning
                        </Button>
                      )}
                    </div>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-medium">Or type code</span>
                      </div>
                    </div>

                    <form onSubmit={handleManualSubmit} className="flex gap-2 mt-4">
                      <Input
                        placeholder="UUID code..."
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        className="font-mono text-center uppercase tracking-wide bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                      />
                      <Button type="submit" variant="secondary" className="px-4">
                        <Search className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Scan Action */}
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-8 sticky bottom-6 z-20"
          >
            <Button
              onClick={startScanning}
              size="lg"
              className="w-full shadow-2xl rounded-xl py-6 text-lg font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Scan Next Person
            </Button>
          </motion.div>
        )}

        {/* 3. Booking Details Card */}
        {bookingDetails && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-lg bg-white/50 backdrop-blur dark:bg-slate-900/50">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Guest</p>
                    <p className="font-bold text-lg">{bookingDetails.user_name || bookingDetails.user_email?.split('@')[0] || 'Guest'}</p>
                  </div>
                  <Badge variant={bookingDetails.status === 'completed' ? 'default' : 'secondary'} className="px-3 py-1 text-xs">
                    {bookingDetails.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Date</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{new Date(bookingDetails.booking_date).toLocaleDateString()}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Time</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{bookingDetails.booking_time}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <span className="font-medium text-primary">Total Paid</span>
                  <span className="text-2xl font-black text-primary">₹{bookingDetails.amount}</span>
                </div>

                {bookingDetails.qr_scanned && bookingDetails.qr_scanned_at && (
                  <div className="pt-2 text-center">
                    <p className="text-xs text-slate-400">
                      Scanned: {new Date(bookingDetails.qr_scanned_at).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default QRScanner;
