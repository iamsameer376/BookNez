import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

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

    const onSuccess = async (lat: number, lng: number) => {
        console.log('UseGeoLocation: Coordinates received', { lat, lng });
        try {
            // Reverse Geocoding using OpenStreetMap Nominatim
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
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
                    lat,
                    lng,
                },
                city,
                address: data.display_name
            });
        } catch (error) {
            console.error('UseGeoLocation: Error fetching city name:', error);
            setLocation({
                loaded: true,
                coordinates: {
                    lat,
                    lng,
                },
                city: 'Location Detected',
            });
        }
    };

    const onError = (error: any) => {
        console.error('UseGeoLocation: Error getting location', error);
        setLocation({
            loaded: true,
            error: {
                code: error.code || 0,
                message: error.message || "Unknown error",
            },
        });

        // Only show toast for actual errors, not user denied
        if (error.code !== 1) { // 1 is PERMISSION_DENIED for both web and capacitor
            toast({
                title: "Location Error",
                description: "Could not retrieve your location",
                variant: "destructive"
            });
        }
    };

    const getLocation = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                const permissions = await Geolocation.checkPermissions();
                if (permissions.location !== 'granted') {
                    const request = await Geolocation.requestPermissions();
                    if (request.location !== 'granted') {
                        onError({ code: 1, message: "Permission denied" });
                        return;
                    }
                }

                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 10000
                });
                onSuccess(position.coords.latitude, position.coords.longitude);
            } catch (err: any) {
                onError(err);
            }
        } else {
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

            navigator.geolocation.getCurrentPosition(
                (pos) => onSuccess(pos.coords.latitude, pos.coords.longitude),
                onError,
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        }
    };

    useEffect(() => {
        getLocation();
    }, []);

    return { location, getLocation };
};

