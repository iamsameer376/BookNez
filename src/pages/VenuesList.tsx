import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, AlertCircle, Search, X } from 'lucide-react';
import { VenueCard } from '@/components/VenueCard';
import { FilterSort } from '@/components/FilterSort';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tables } from '@/integrations/supabase/types';

type Venue = Tables<'venues'>;

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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard/user')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {getPageTitle()}
            </h1>
            <p className="text-muted-foreground">
              {filteredVenues.length} {filteredVenues.length === 1 ? 'venue' : 'venues'} found
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter results..."
                className="pl-9 bg-card border-none shadow-sm focus-visible:ring-1 focus-visible:ring-primary/20"
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
          <div className="text-center py-8">Loading venues...</div>
        ) : filteredVenues.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No venues found in this category yet. Please check back later or try another category.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue) => (
              <VenueCard
                key={venue.id}
                id={venue.id}
                name={venue.name}
                image={venue.photos[0] || '/placeholder.svg'}
                rating={(venue as any).average_rating || 0}
                price={Number(venue.pricing)}
                distance={2.5}
                category={venue.category}
                amenities={venue.amenities.slice(0, 3)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default VenuesList;
