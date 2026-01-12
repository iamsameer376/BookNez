import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, MapPin } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Venue = Tables<'venues'>;

const ManageVenues = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVenues = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', user?.id as string);

      if (error) throw error;
      setVenues(data || []);
    } catch (error) {
      console.error('Error fetching venues:', error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: 'Error fetching venues',
        description: message,
        variant: 'destructive',
        duration: 1000,
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchVenues();
    }
  }, [user, fetchVenues]);

  const toggleVenueStatus = async (venueId: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase
        .from('venues')
        .update({ is_active: !currentStatus })
        .eq('id', venueId);

      if (error) throw error;

      setVenues(prev =>
        prev.map(v => v.id === venueId ? { ...v, is_active: !currentStatus } : v)
      );

      toast({
        title: `Venue ${!currentStatus ? 'activated' : 'deactivated'}`,
        duration: 1000,
      });
    } catch (error: any) {
      toast({
        title: 'Error updating venue',
        description: error.message,
        variant: 'destructive',
        duration: 1000,
      });
    }
  };


  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      sports_turf: 'Sports - Turf',
      sports_pool: 'Sports - Pool',
      salon: 'Salon',
      cinema: 'Cinema',
      clinic: 'Clinic',
      tuition: 'Tuition',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading venues...</p>
      </div>
    );
  }

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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Manage Venues</h2>
          <Button onClick={() => navigate('/owner/add-venue')}>
            Add New Venue
          </Button>
        </div>

        {venues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No venues yet</p>
              <Button onClick={() => navigate('/owner/add-venue')}>
                Add Your First Venue
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((venue) => (
              <Card key={venue.id} className="overflow-hidden">
                {venue.photos && venue.photos.length > 0 && (
                  <div className="relative h-48">
                    <img
                      src={venue.photos[0]}
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                    {venue.photos.length > 1 && (
                      <Badge className="absolute top-2 right-2 bg-background/80 backdrop-blur">
                        +{venue.photos.length - 1} more
                      </Badge>
                    )}
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{venue.name}</CardTitle>
                      <Badge variant="outline" className="mt-2">
                        {getCategoryLabel(venue.category)}
                      </Badge>
                    </div>
                    <Switch
                      checked={venue.is_active}
                      onCheckedChange={() => toggleVenueStatus(venue.id, venue.is_active)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {venue.description}
                  </p>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm line-clamp-2">{venue.address}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">₹{venue.pricing}/hr</span>
                    <Badge variant={venue.is_active ? 'default' : 'secondary'}>
                      {venue.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(venue.amenities || []).slice(0, 3).map((amenity) => (
                      <Badge key={amenity} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {(venue.amenities || []).length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{(venue.amenities || []).length - 3} more
                      </Badge>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/owner/venues/${venue.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageVenues;
