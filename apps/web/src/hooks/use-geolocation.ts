import { useState } from "react";

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

export interface GeolocationState {
  coords: GeoCoords | null;
  locating: boolean;
  error: string | null;
  detect: () => void;
  reset: () => void;
}

export function useGeolocation(): GeolocationState {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function detect() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location access denied. Please enable location permissions and try again.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Your location could not be determined. Please try again.");
        } else {
          setError("Location request timed out. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function reset() {
    setCoords(null);
    setError(null);
  }

  return { coords, locating, error, detect, reset };
}
