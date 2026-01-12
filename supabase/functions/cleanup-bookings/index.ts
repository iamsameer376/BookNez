import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate the cutoff time (12 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 12);

    // Get all bookings that are past their booking time + 12 hours
    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, booking_date, booking_time')
      .in('status', ['confirmed', 'completed']);

    if (fetchError) throw fetchError;

    const bookingsToDelete = bookings?.filter(booking => {
      // Parse booking date and time
      const [timePart, period] = booking.booking_time.split(' ');
      const [hours, minutes] = timePart.split(':');
      let hour24 = parseInt(hours);
      
      if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
      const bookingDateTime = new Date(`${booking.booking_date}T${hour24.toString().padStart(2, '0')}:${minutes}:00`);
      bookingDateTime.setHours(bookingDateTime.getHours() + 12); // Add 12 hours
      
      return bookingDateTime < new Date();
    }) || [];

    if (bookingsToDelete.length > 0) {
      const idsToDelete = bookingsToDelete.map(b => b.id);
      
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;

      console.log(`Deleted ${bookingsToDelete.length} old bookings`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: bookingsToDelete.length,
        message: `Cleaned up ${bookingsToDelete.length} bookings` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
