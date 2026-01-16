import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, AlertCircle, Search, X, Map as MapIcon, LayoutGrid } from 'lucide-react';
import { VenueCard } from '@/components/VenueCard';
import { FilterSort } from '@/components/FilterSort';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tables } from '@/integrations/supabase/types';
import PageTransition from '@/components/PageTransition';
import { motion } from 'framer-motion';
import { VenueMap } from '@/components/VenueMap';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { calculateDistance } from '@/utils/distance';

type Venue = Tables<'venues'> & {
  average_rating: number;
  review_count: number;
  distance?: number;
};

const VenuesList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category');
  const initialSearch = searchParams.get('search') || '';
  const { location } = useGeoLocation();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [sortBy, setSortBy] = useState('distance');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Fetch venues from Supabase
  const fetchVenues = useCallback(async () => {
    setLoadingVenues(true);
    try {
      let query = supabase
        .from('venue_with_stats' as any)
        .select('*')
        .eq('is_active', true);

      if (category) {
        query = query.or(`category.eq.${category},category.eq.sports_${category}`);
      }

      // We fetch all matching venues and do text search on client side to avoid conflicts
      // But if there is an initial search from dashboard, we can use it to pre-fill
      // Actually, let's just fetch all mostly matching the category and handle specific text search in client
      // forcing a broader fetch allows for smoother client-side filtering.
      // However, for performance on huge sets, server side is better.
      // Given the current scale, client side filter of a few hundred venues is fine.

      const { data, error } = await query;

      if (error) throw error;
      setVenues(data as any || []);
    } catch (error) {
      console.error('Error fetching venues:', error);
    } finally {
      setLoadingVenues(false);
    }
  }, [category]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  // Sync valid search query to URL if meaningful, mainly for sharability, 
  // but let's keep it simple and just manage local state for now unless it was from nav.
  useEffect(() => {
    if (initialSearch && venues.length > 0 && searchQuery === '') {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch, venues.length]);


  // Computed property: Processed Venues (Filtered & Sorted)
  const processedVenues = useMemo(() => {
    let result = [...venues];

    // 1. Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(venue =>
        venue.name?.toLowerCase().includes(query) ||
        venue.description?.toLowerCase().includes(query) ||
        venue.address?.toLowerCase().includes(query)
      );
    }

    // 2. Calculate Distances (if location available)
    if (location.loaded && location.coordinates) {
      result = result.map(v => ({
        ...v,
        distance: calculateDistance(
          location.coordinates!.lat,
          location.coordinates!.lng,
          v.latitude || 0,
          v.longitude || 0
        )
      }));
    }

    // 3. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          // If distance is available, sort by it. Else, push to bottom or keep original.
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          if (a.distance !== undefined) return -1;
          if (b.distance !== undefined) return 1;
          return 0;

        case 'price-low':
          // Access pricing. Assuming it's a number or can be cast.
          // Note: Pricing might be complex object in some schemas, but based on VenueCard usage it seems to be treated as number.
          // The Venue type says 'pricing: any', but code often does Number(venue.pricing).
          return (Number(a.pricing) || 0) - (Number(b.pricing) || 0);

        case 'price-high':
          return (Number(b.pricing) || 0) - (Number(a.pricing) || 0);

        case 'rating':
          return (b.average_rating || 0) - (a.average_rating || 0);

        default:
          return 0;
      }
    });

    return result;
  }, [venues, searchQuery, sortBy, location]);


  const handleLocalSearch = (query: string) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleSort = (sortType: string) => {
    setSortBy(sortType);
  };

  const getPageTitle = () => {
    if (searchQuery) return `Venues matching "${searchQuery}"`;
    if (category === 'sports_turf' || category === 'turf') return 'TURF Venues';
    if (category === 'sports_pool') return 'Sports Pool Venues';
    return category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Venues` : 'All Venues';
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/user')}
              className="gap-2 pl-0 hover:bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>

            {/* View Toggle */}
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid className="h-4 w-4" />
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <MapIcon className="h-4 w-4" />
                Map
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {getPageTitle()}
              </h1>
              <p className="text-sm text-muted-foreground">
                {processedVenues.length} {processedVenues.length === 1 ? 'venue' : 'venues'} found
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter results..."
                  className="pl-9 h-10 bg-card border-none shadow-sm focus-visible:ring-1 focus-visible:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => handleLocalSearch(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <FilterSort onSort={handleSort} currentSort={sortBy} />
            </div>
          </div>

          {loadingVenues ? (
            <div className="text-center py-12 text-muted-foreground">Loading venues...</div>
          ) : processedVenues.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No venues found matching your criteria.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {viewMode === 'list' ? (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1
                      }
                    }
                  }}
                >
                  {processedVenues.map((venue) => (
                    <motion.div
                      key={venue.id}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                      }}
                    >
                      <VenueCard
                        id={venue.id}
                        name={venue.name}
                        image={venue.photos[0] || '/placeholder.svg'}
                        rating={venue.average_rating || 0}
                        price={Number(venue.pricing)}
                        distance={venue.distance}
                        category={venue.category}
                        amenities={venue.amenities.slice(0, 3)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 h-full min-h-[500px]"
                >
                  <VenueMap venues={processedVenues} />
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>
    </PageTransition >
  );
};

export default VenuesList;
