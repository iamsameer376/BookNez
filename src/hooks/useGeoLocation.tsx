import { useState, useEffect } from 'react';
import { useToast } from './use-toast';

interface LocationState {
    loaded: boolean;
    coordinates?: { lat: number; lng: number };
    error?: { code: number; message: string };
    city?: string;
    address?: string;
}

export const useGeoLocation = () => {
    const [location, setLocation] = useState<LocationState>({
        loaded: false,
    });
    const { toast } = useToast();

    const onSuccess = async (location: GeolocationPosition) => {
        console.log('UseGeoLocation: Coordinates received', location.coords);
        try {
            // Reverse Geocoding using OpenStreetMap Nominatim
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.coords.latitude}&lon=${location.coords.longitude}`
            );
            const data = await response.json();
            console.log('UseGeoLocation: Nominatim response', data);

            const city = data.address?.city ||
                data.address?.town ||
                data.address?.village ||
                data.address?.suburb ||
                data.address?.state_district ||
                data.address?.county ||
                'Unknown Location';

            setLocation({
                loaded: true,
                coordinates: {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                },
                city,
                address: data.display_name
            });
        } catch (error) {
            console.error('UseGeoLocation: Error fetching city name:', error);
            setLocation({
                loaded: true,
                coordinates: {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                },
                city: 'Location Detected',
            });
        }
    };

    const onError = (error: GeolocationPositionError) => {
        console.error('UseGeoLocation: Error getting location', error);
        setLocation({
            loaded: true,
            error: {
                code: error.code,
                message: error.message,
            },
        });

        // Only show toast for actual errors, not user denied
        if (error.code !== error.PERMISSION_DENIED) {
            toast({
                title: "Location Error",
                description: "Could not retrieve your location",
                variant: "destructive"
            });
        }
    };

    const getLocation = () => {
        if (!("geolocation" in navigator)) {
            setLocation((state) => ({
                ...state,
                loaded: true,
                error: {
                    code: 0,
                    message: "Geolocation not supported",
                },
            }));
            return;
        }

        navigator.geolocation.getCurrentPosition(onSuccess, onError, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    };

    useEffect(() => {
        getLocation();
    }, []);

    return { location, getLocation };
};
