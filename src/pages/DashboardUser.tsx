import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, AlertCircle, Search } from 'lucide-react';
import { CategoryGrid } from '@/components/CategoryGrid';
import { SettingsMenu } from '@/components/SettingsMenu';
import { VenueCard } from '@/components/VenueCard';
import { FilterSort } from '@/components/FilterSort';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  average_rating: number;
  review_count: number;
}

const DashboardUser = () => {
  const { user, userRoles, userName, userCity, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [nearbyVenues, setNearbyVenues] = useState<Venue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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
        .from('venue_with_stats' as any)
        .select('*')
        .eq('is_active', true)
        .limit(8);

      if (error) throw error;
      setNearbyVenues(data as any);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/venues?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center justify-between w-full md:w-auto">
              <div className="flex items-center gap-4">
                <div onClick={() => navigate('/dashboard/user')} className="cursor-pointer">
                  <h1 className="text-2xl font-bold text-primary">BookNex</h1>
                  {userName && <p className="text-sm text-muted-foreground leading-none mt-1">Welcome, {userName}</p>}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground border-l pl-3 ml-3">
                  <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span className="font-medium text-foreground truncate max-w-[100px]">{userCity || 'Location'}</span>
                </div>
              </div>
              <div className="md:hidden">
                <SettingsMenu />
              </div>
            </div>

            <div className="flex-1 max-w-xl w-full">
              <form onSubmit={handleSearch} className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search venues by name..."
                  className="pl-10 h-11 bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-background transition-all rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </div>

            <div className="hidden md:block">
              <SettingsMenu />
            </div>
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
                        rating={venue.average_rating || 0}
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
