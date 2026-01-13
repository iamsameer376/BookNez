import { useEffect, useState, useCallback } from 'react';
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

type Venue = Tables<'venues'> & {
  average_rating: number;
  review_count: number;
};

const VenuesList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category');
  const initialSearch = searchParams.get('search') || '';

  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [sortBy, setSortBy] = useState('distance');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

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

      if (initialSearch) {
        query = query.ilike('name', `%${initialSearch}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVenues(data as any || []);
      setFilteredVenues(data as any || []);
    } catch (error) {
      console.error('Error fetching venues:', error);
    } finally {
      setLoadingVenues(false);
    }
  }, [category, initialSearch]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const handleLocalSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = venues.filter(venue =>
      venue.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredVenues(filtered);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredVenues(venues);
    if (!category) {
      setSearchParams({});
    } else {
      setSearchParams({ category });
    }
  };

  const handleSort = (sortType: string) => {
    setSortBy(sortType);
    if (sortType === 'price_asc') {
      const sorted = [...venues].sort((a, b) => (typeof a.pricing === 'number' ? a.pricing : 0) - (typeof b.pricing === 'number' ? b.pricing : 0));
      setFilteredVenues(sorted);
    } else if (sortType === 'price_desc') {
      const sorted = [...venues].sort((a, b) => (typeof b.pricing === 'number' ? b.pricing : 0) - (typeof a.pricing === 'number' ? a.pricing : 0));
      setFilteredVenues(sorted);
    } else {
      // Default / distance sort - for now just reset
      setFilteredVenues(venues);
    }
  };

  const getPageTitle = () => {
    if (initialSearch) return `Results for "${initialSearch}"`;
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
                {filteredVenues.length} {filteredVenues.length === 1 ? 'venue' : 'venues'} found
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
          ) : filteredVenues.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No venues found in this category yet. Please check back later or try another category.
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
                  {filteredVenues.map((venue) => (
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
                        rating={(venue as any).average_rating || 0}
                        price={Number(venue.pricing)}
                        distance={2.5}
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
                  <VenueMap venues={filteredVenues} />
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
