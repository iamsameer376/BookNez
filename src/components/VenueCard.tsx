import { memo } from 'react';
import { Star, MapPin, IndianRupee, Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";

interface VenueCardProps {
  id: string;
  name: string;
  image: string;
  rating: number;
  price: number;
  distance?: number | null;
  category: string;
  amenities: string[];
}

export const VenueCard = memo(({
  id,
  name,
  image,
  rating,
  price,
  distance,
  category,
  amenities,
}: VenueCardProps) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = isFavorite(id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(id);
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group border-border/50 bg-card/50 backdrop-blur-sm"
      onClick={() => navigate(`/venues/${id}`)}
    >
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        <img
          src={image || '/placeholder.svg'}
          alt={name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 will-change-transform"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

        <Badge className="absolute top-3 right-3 bg-black/60 hover:bg-black/70 text-white border-none backdrop-blur-md uppercase tracking-wider font-semibold text-[10px]">
          {category === 'sports_turf' || category === 'turf' ? 'TURF' : category}
        </Badge>

        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={handleFavoriteClick}
          className="absolute top-3 left-3 p-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-colors z-10"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isFav ? "fill-red-500 text-red-500" : "text-white"
            )}
          />
        </motion.button>

        {/* Price Tag Overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/10">
          <IndianRupee className="h-3.5 w-3.5" />
          <span className="font-bold text-sm">{price}</span>
          <span className="text-[10px] opacity-80">/hour</span>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">{name}</h3>
              <div className="flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded text-xs font-bold text-primary shrink-0">
                <Star className="h-3 w-3 fill-primary" />
                <span>{rating.toFixed(1)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground/80">
              <MapPin className="h-3.5 w-3.5 text-primary/70" />
              <span>{typeof distance === 'number' ? `${distance.toFixed(1)} km away` : 'Distance unavailable'}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="outline" className="text-[10px] px-2 py-0.5 border-primary/20 bg-primary/5 text-foreground/80 font-normal">
                {amenity}
              </Badge>
            ))}
            {amenities.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/20 bg-primary/5 text-foreground/80 font-normal">
                +{amenities.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export const VenueCardSkeleton = () => {
  return (
    <Card className="overflow-hidden border-border/50 bg-card/50">
      <div className="relative w-full aspect-[4/3]">
        <Skeleton className="w-full h-full" />
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

VenueCard.displayName = 'VenueCard';

