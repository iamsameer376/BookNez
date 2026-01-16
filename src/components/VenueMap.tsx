import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { VenueCard } from './VenueCard';
import 'leaflet/dist/leaflet.css';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { useEffect } from 'react';
import { calculateDistance } from '@/utils/distance';

// Fix for default Leaflet icons in some bundlers
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import L from 'leaflet';

// Assign default icon resources manually to avoid 404s
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
});

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

interface VenueMapProps {
    venues: Venue[];
    center?: [number, number];
}

// Component to recenter map when props change
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
};

// Custom marker icon using simple HTML markup for performance + styling
const createCustomIcon = (price: number) => {
    return divIcon({
        className: 'custom-venue-marker',
        html: `<div class="bg-white text-black font-bold px-2 py-1 rounded-full shadow-lg border border-gray-200 text-xs whitespace-nowrap flex items-center gap-1 hover:scale-110 transition-transform">
                <span>₹${price}</span>
              </div>`,
        iconSize: [40, 30],
        iconAnchor: [20, 15]
    });
};

const userLocationIcon = divIcon({
    className: 'user-location-marker',
    html: `<div class="bg-blue-500 w-4 h-4 rounded-full border-2 border-white shadow-lg animate-pulse ring-4 ring-blue-500/30"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

export const VenueMap = ({ venues, center = [12.9716, 77.5946] }: VenueMapProps) => { // Default to Bangalore
    const { location: userLocation } = useGeoLocation();

    // Use user location if available, otherwise default center
    const mapCenter: [number, number] = userLocation.loaded && userLocation.coordinates
        ? [userLocation.coordinates.lat, userLocation.coordinates.lng]
        : center;

    return (
        <div className="h-[calc(100vh-200px)] w-full rounded-xl overflow-hidden shadow-inner border z-0">
            <MapContainer
                center={mapCenter}
                zoom={13}
                scrollWheelZoom={true}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                <RecenterMap lat={mapCenter[0]} lng={mapCenter[1]} />

                {/* User Location Marker */}
                {userLocation.loaded && userLocation.coordinates && (
                    <Marker position={[userLocation.coordinates.lat, userLocation.coordinates.lng]} icon={userLocationIcon}>
                        <Popup>You are here</Popup>
                    </Marker>
                )}

                {/* Venue Markers */}
                {venues.map(venue => {
                    if (!venue.latitude || !venue.longitude) return null;
                    return (
                        <Marker
                            key={venue.id}
                            position={[venue.latitude, venue.longitude]}
                            icon={createCustomIcon(Number(venue.pricing))}
                        >
                            <Popup className="min-w-[280px] p-0 overflow-hidden rounded-xl border-none">
                                <VenueCard
                                    id={venue.id}
                                    name={venue.name}
                                    image={venue.photos[0]}
                                    rating={venue.average_rating}
                                    price={Number(venue.pricing)}
                                    distance={
                                        userLocation.loaded && userLocation.coordinates
                                            ? calculateDistance(
                                                userLocation.coordinates.lat,
                                                userLocation.coordinates.lng,
                                                venue.latitude || 0,
                                                venue.longitude || 0
                                            )
                                            : null
                                    }
                                    category={venue.category}
                                    amenities={venue.amenities}
                                />
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};
