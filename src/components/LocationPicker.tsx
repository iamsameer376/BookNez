import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, MapPin, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
});

interface LocationPickerProps {
    onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
    initialLocation?: { lat: number; lng: number } | null;
}

const LocationMarker = ({ position, onPositionChange }: { position: L.LatLng | null, onPositionChange: (lat: number, lng: number) => void }) => {
    const map = useMapEvents({
        click(e) {
            onPositionChange(e.latlng.lat, e.latlng.lng);
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position ? <Marker position={position} /> : null;
};

export const LocationPicker = ({ onLocationSelect, initialLocation }: LocationPickerProps) => {
    const [position, setPosition] = useState<L.LatLng | null>(
        initialLocation ? new L.LatLng(initialLocation.lat, initialLocation.lng) : null
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Default center (Bangalore) if no initial location
    const defaultCenter = { lat: 12.9716, lng: 77.5946 };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);

                setPosition(new L.LatLng(newLat, newLng));
                onLocationSelect({ lat: newLat, lng: newLng, address: display_name });
            } else {
                toast({
                    title: "Location not found",
                    description: "Try a different search query",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to search location",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast({ title: "Error", description: "Geolocation is not supported by your browser", variant: "destructive" });
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setPosition(new L.LatLng(latitude, longitude));

                // Get address
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await response.json();
                    onLocationSelect({
                        lat: latitude,
                        lng: longitude,
                        address: data.display_name || "Current Location"
                    });
                } catch (e) {
                    onLocationSelect({ lat: latitude, lng: longitude, address: "" });
                }
                setLoading(false);
            },
            (err) => {
                setLoading(false);
                let message = "Could not retrieve location";
                if (err.code === 1) message = "Location permission denied";
                if (err.code === 2) message = "Location unavailable. Please check your GPS.";
                if (err.code === 3) message = "Location request timed out. Please retry.";

                toast({ title: "Error", description: message, variant: "destructive" });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleMapClick = async (lat: number, lng: number) => {
        setPosition(new L.LatLng(lat, lng));
        try {
            // Optional: Reverse geocode on click too, or just send coords
            // For better UX, let's reverse geocode
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            onLocationSelect({ lat, lng, address: data.display_name });
        } catch (e) {
            onLocationSelect({ lat, lng, address: "" });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search for area, city..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-8"
                    />
                </div>
                <Button variant="outline" onClick={handleSearch} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
                <Button variant="secondary" onClick={handleCurrentLocation} disabled={loading} title="Use Current Location">
                    <Navigation className="h-4 w-4" />
                </Button>
            </div>

            <div className="h-[300px] w-full rounded-md overflow-hidden border z-0 relative">
                <MapContainer
                    center={initialLocation ? [initialLocation.lat, initialLocation.lng] : [defaultCenter.lat, defaultCenter.lng]}
                    zoom={13}
                    scrollWheelZoom={true}
                    className="h-full w-full"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    />
                    <LocationMarker
                        position={position}
                        onPositionChange={handleMapClick}
                    />
                </MapContainer>

                <div className="absolute bottom-2 left-2 right-2 bg-background/80 backdrop-blur text-xs p-2 rounded z-[400] text-muted-foreground text-center pointer-events-none">
                    Click on the map to pin exact location
                </div>
            </div>
        </div>
    );
};
