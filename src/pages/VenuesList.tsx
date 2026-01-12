import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { VenueCard } from '@/components/VenueCard';
import { FilterSort } from '@/components/FilterSort';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tables } from '@/integrations/supabase/types';

type Venue = Tables<'venues'>;

const VenuesList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');

  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [sortBy, setSortBy] = useState('distance');

  const fetchVenues = useCallback(async () => {
    setLoadingVenues(true);
    try {
      let query = supabase
        .from('venues')
        .select('*')
        .eq('is_active', true);

      if (category) {
        // Support both new 'turf'/'pool' and legacy 'sports_turf'/'sports_pool'
        // Using ilike for 'sports%' would match everything, but we want specific mapping.
        // We use .or() to match either exact category OR sports_ prefixed version.
        query = query.or(`category.eq.${category},category.eq.sports_${category}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVenues(data || []);
      setFilteredVenues(data || []);
    } catch (error) {
      console.error('Error fetching venues:', error);
    } finally {
      setLoadingVenues(false);
    }
  }, [category]);

  useEffect(() => {
    if (category) {
      fetchVenues();
    }
  }, [category, fetchVenues]);

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

  const getCategoryTitle = () => {
    if (category === 'sports_turf') return 'Sports Turf';
    if (category === 'sports_pool') return 'Sports Pool';
    return category ? category.charAt(0).toUpperCase() + category.slice(1) : '';
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {getCategoryTitle()} Venues
          </h1>
          <FilterSort onSort={handleSort} currentSort={sortBy} />
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
                rating={4.5}
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
