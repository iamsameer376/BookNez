import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Search, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'; // Added Sparkles
import { CategoryGrid } from '@/components/CategoryGrid';
import { SettingsMenu } from '@/components/SettingsMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { VenueCard, VenueCardSkeleton } from '@/components/VenueCard'; // Added Skeleton
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import PageTransition from '@/components/PageTransition';
import { motion } from 'framer-motion';
import { HeroCarousel } from '@/components/HeroCarousel';
import { calculateDistance } from '@/utils/distance'; // Added HeroCarousel

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
  const [isLoadingVenues, setIsLoadingVenues] = useState(true); // Added loading state
  const [searchQuery, setSearchQuery] = useState('');
  const { location: userGeoLocation, getLocation } = useGeoLocation();
  const { toast } = useToast();

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
      setIsLoadingVenues(true);
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      setNearbyVenues(data as any);
    } catch (error) {
      console.error('Error fetching nearby venues:', error);
    } finally {
      setIsLoadingVenues(false);
    }
  };

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
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="bg-background/80 backdrop-blur-md sticky top-0 z-40 border-b border-border/40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center justify-between w-full md:w-auto">
                <div className="flex items-center gap-4">
                  <div onClick={() => navigate('/dashboard/user')} className="cursor-pointer">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-tight leading-none">BookNex</h1>
                        <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-[10px] font-bold text-primary tracking-widest uppercase shadow-sm">
                          Beta
                        </span>
                      </div>
                      <span className="hidden md:inline-block text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] ml-0.5">User Dashboard</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm py-1 px-3 bg-secondary/10 rounded-full border border-secondary/20 hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => getLocation && getLocation()}>
                    <MapPin className={`h-3.5 w-3.5 ${userGeoLocation.error ? 'text-destructive' : 'text-primary'}`} />
                    <span className="font-medium truncate max-w-[120px] md:max-w-[200px]">
                      {!userGeoLocation.loaded
                        ? 'Locating...'
                        : userGeoLocation.error
                          ? 'Locate Me'
                          : (userGeoLocation.city || userCity || 'Select Location')}
                    </span>
                  </div>
                </div>
                <div className="md:hidden flex items-center gap-2">
                  <NotificationBell />
                  <SettingsMenu />
                </div>
              </div>

              <div className="flex-1 max-w-xl w-full">
                <form onSubmit={handleSearch} className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search for turf, cricket, swimming..."
                    className="pl-10 h-10 bg-secondary/10 border-transparent focus-visible:bg-background focus-visible:border-primary/20 transition-all rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <NotificationBell />
                <SettingsMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="space-y-8">

          {/* Hero Section */}
          <section className="container mx-auto px-4 pt-6">
            <HeroCarousel />
          </section>

          {/* Categories Section */}
          <section className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <h2 className="text-xl font-bold">Browse Categories</h2>
            </div>
            <CategoryGrid onSelectCategory={handleCategorySelect} selectedCategory={selectedCategory} />
          </section>

          {/* Nearby Venues Carousel */}
          <section className="container mx-auto px-4 pb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Recommended Near You</h2>
                <p className="text-sm text-muted-foreground">Top rated venues in your city</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-primary/20 hover:bg-primary/5 hover:text-primary"
                  onClick={() => document.querySelector<HTMLButtonElement>('[data-carousel-prev]')?.click()}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-primary/20 hover:bg-primary/5 hover:text-primary"
                  onClick={() => document.querySelector<HTMLButtonElement>('[data-carousel-next]')?.click()}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {isLoadingVenues ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <CarouselItem key={i} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                      <VenueCardSkeleton />
                    </CarouselItem>
                  ))
                ) : nearbyVenues.length > 0 ? (
                  nearbyVenues.map((venue) => {
                    const distance = userGeoLocation.loaded && userGeoLocation.coordinates
                      ? calculateDistance(
                        userGeoLocation.coordinates.lat,
                        userGeoLocation.coordinates.lng,
                        venue.latitude || 0,
                        venue.longitude || 0
                      )
                      : null;

                    return (
                      <CarouselItem key={venue.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                        <VenueCard
                          id={venue.id}
                          name={venue.name}
                          image={venue.photos[0] || '/placeholder.svg'}
                          rating={venue.average_rating || 0}
                          price={Number(venue.pricing)}
                          distance={distance}
                          category={venue.category}
                          amenities={venue.amenities.slice(0, 3)}
                        />
                      </CarouselItem>
                    );
                  })
                ) : (
                  <div className="col-span-full p-8 text-center text-muted-foreground bg-secondary/10 rounded-xl mx-4 w-full">
                    No venues found nearby. Try changing your location or category.
                  </div>
                )}
              </CarouselContent>
              {/* Hidden triggers for the custom header buttons */}
              <CarouselPrevious data-carousel-prev className="hidden" />
              <CarouselNext data-carousel-next className="hidden" />
            </Carousel>
          </section>

          {/* CTA Section */}
          <section className="container mx-auto px-4 pb-8">
            <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-8 rounded-2xl overflow-hidden relative">
              <div className="relative z-10 max-w-2xl">
                <h3 className="text-2xl md:text-3xl font-bold mb-2">Check Your Bookings</h3>
                <p className="text-primary-foreground/90 mb-6 max-w-lg">
                  View your upcoming games, history, and manage your schedule all in one place.
                </p>
                <Button
                  onClick={() => navigate('/my-bookings')}
                  variant="secondary"
                  size="lg"
                  className="font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Go to My Bookings
                </Button>
              </div>
              {/* Abstract Pattern Background */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
            </Card>
          </section>

        </main>
      </div>
    </PageTransition>
  );
};

export default DashboardUser;

