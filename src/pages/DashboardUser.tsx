import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, AlertCircle } from 'lucide-react';
import { CategoryGrid } from '@/components/CategoryGrid';
import { SettingsMenu } from '@/components/SettingsMenu';
import { VenueCard } from '@/components/VenueCard';
import { FilterSort } from '@/components/FilterSort';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Venue {
  id: string;
  name: string;
  description: string | null;
  photos: string[];
  pricing: any;
  address: string;
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
  category: string;
}

const DashboardUser = () => {
  const { user, userRoles, userName, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [nearbyVenues, setNearbyVenues] = useState<Venue[]>([]);

  useEffect(() => {
    // Check if user has 'user' role
    if (!loading && (!user || !userRoles.includes('user'))) {
      navigate('/login/user');
    }
  }, [user, userRoles, loading, navigate]);

  useEffect(() => {
    fetchNearbyVenues();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      navigate(`/venues?category=${selectedCategory}`);
    }
  }, [selectedCategory, navigate]);

  const fetchNearbyVenues = async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('is_active', true)
        .limit(8);

      if (error) throw error;
      setNearbyVenues(data || []);
    } catch (error) {
      console.error('Error fetching nearby venues:', error);
    }
  };

  const { toast } = useToast();

  const handleCategorySelect = (category: string) => {
    if (category === 'salon') {
      toast({
        title: "Coming Soon",
        description: "Salon bookings will be available shortly!",
        duration: 2000,
      });
      return;
    }

    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-primary">BookNex</h1>
                {userName && <p className="text-sm text-muted-foreground">Welcome, {userName}</p>}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Current Location</span>
              </div>
            </div>
            <SettingsMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Nearby Venues Carousel */}
        {nearbyVenues.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Nearby Venues</h2>
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                {nearbyVenues.map((venue) => (
                  <CarouselItem key={venue.id} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-1">
                      <VenueCard
                        id={venue.id}
                        name={venue.name}
                        image={venue.photos[0] || '/placeholder.svg'}
                        rating={4.5}
                        price={Number(venue.pricing)}
                        distance={2.5}
                        category={venue.category}
                        amenities={venue.amenities.slice(0, 3)}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </section>
        )}

        {/* Categories Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Browse Categories</h2>
          <CategoryGrid onSelectCategory={handleCategorySelect} selectedCategory={selectedCategory} />
        </section>



        {/* My Bookings Button */}
        <section className="flex justify-center pt-4">
          <Button
            onClick={() => navigate('/my-bookings')}
            size="lg"
            className="w-full max-w-md"
          >
            View My Bookings
          </Button>
        </section>
      </main>
    </div>
  );
};

export default DashboardUser;
