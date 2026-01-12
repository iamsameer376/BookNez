import { Star, MapPin, IndianRupee } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface VenueCardProps {
  id: string;
  name: string;
  image: string;
  rating: number;
  price: number;
  distance: number;
  category: string;
  amenities: string[];
}

export const VenueCard = ({
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

  return (
    <Card
      className="overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] group"
      onClick={() => navigate(`/venues/${id}`)}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={image || '/placeholder.svg'}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <Badge className="absolute top-3 right-3 bg-background/90 text-foreground">
          {category}
        </Badge>
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">{name}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span>{rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{distance.toFixed(1)} km</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-primary font-semibold">
              <IndianRupee className="h-4 w-4" />
              <span>{price}</span>
              <span className="text-xs text-muted-foreground font-normal">/hour</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="secondary" className="text-xs">
                {amenity}
              </Badge>
            ))}
            {amenities.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{amenities.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
