"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { RiderLocation } from "@rsc/contracts";

type LatLngLiteral = { lat: number; lng: number };

interface GoogleMap {
  fitBounds(bounds: GoogleLatLngBounds, padding?: number | GoogleMapPadding): void;
  getZoom(): number | undefined;
  setCenter(position: LatLngLiteral): void;
  setOptions(options: Partial<GoogleMapOptions>): void;
  setZoom(zoom: number): void;
}

interface GoogleMapPadding {
  bottom?: number;
  left?: number;
  right?: number;
  top?: number;
}

interface GoogleMarker {
  setMap(map: GoogleMap | null): void;
  setPosition(position: LatLngLiteral): void;
}

interface GoogleLatLngBounds {
  extend(position: LatLngLiteral): void;
}

interface GoogleMapsNamespace {
  maps: {
    LatLngBounds: new () => GoogleLatLngBounds;
    Map: new (element: HTMLElement, options: GoogleMapOptions) => GoogleMap;
    Marker: new (options: GoogleMarkerOptions) => GoogleMarker;
    SymbolPath: {
      CIRCLE: number;
    };
  };
}

interface GoogleMapOptions {
  center: LatLngLiteral;
  clickableIcons?: boolean;
  disableDoubleClickZoom?: boolean;
  disableDefaultUI?: boolean;
  draggable?: boolean;
  gestureHandling?: "cooperative" | "greedy" | "none" | "auto";
  keyboardShortcuts?: boolean;
  mapTypeControl?: boolean;
  maxZoom?: number;
  minZoom?: number;
  scrollwheel?: boolean;
  streetViewControl?: boolean;
  styles?: GoogleMapStyle[];
  zoom: number;
  zoomControl?: boolean;
}

interface GoogleMapStyle {
  elementType?: string;
  featureType?: string;
  stylers: Array<Record<string, string | number | boolean>>;
}

interface GoogleMarkerOptions {
  icon?: {
    fillColor: string;
    fillOpacity: number;
    path: number;
    scale: number;
    strokeColor: string;
    strokeWeight: number;
  };
  map: GoogleMap;
  position: LatLngLiteral;
  title: string;
}

declare global {
  interface Window {
    __rscGoogleMapsPromise?: Promise<GoogleMapsNamespace>;
    google?: GoogleMapsNamespace;
  }
}

const GOOGLE_MAPS_SCRIPT_ID = "rsc-google-maps-script";
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const RIDER_MARKER_COLOR = "#ff8200";
const CUSTOMER_MARKER_COLOR = "#14883a";
const DEFAULT_MAP_ZOOM = 15;
const BOUNDS_MAX_DISTANCE_KM = 80;

const LOCKED_MAP_OPTIONS: Partial<GoogleMapOptions> = {
  clickableIcons: false,
  disableDefaultUI: true,
  disableDoubleClickZoom: true,
  draggable: false,
  gestureHandling: "none",
  keyboardShortcuts: false,
  mapTypeControl: false,
  maxZoom: 17,
  minZoom: 10,
  scrollwheel: false,
  streetViewControl: false,
  zoomControl: false,
};

const MAP_STYLES: GoogleMapStyle[] = [
  {
    elementType: "geometry",
    stylers: [{ color: "#eef7f1" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#34513e" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#f7fbf8" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cde5d5" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#bfe5ea" }],
  },
];

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsNamespace> {
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (window.__rscGoogleMapsPromise) {
    return window.__rscGoogleMapsPromise;
  }

  window.__rscGoogleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);

    const resolveWhenReady = () => {
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps loaded without the maps namespace."));
      }
    };

    if (existingScript) {
      existingScript.addEventListener("load", resolveWhenReady, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", resolveWhenReady, { once: true });
    script.addEventListener("error", () => reject(new Error("Google Maps failed.")), {
      once: true,
    });

    document.head.appendChild(script);
  });

  return window.__rscGoogleMapsPromise;
}

function markerIcon(google: GoogleMapsNamespace, fillColor: string) {
  return {
    fillColor,
    fillOpacity: 1,
    path: google.maps.SymbolPath.CIRCLE,
    scale: 9,
    strokeColor: "#ffffff",
    strokeWeight: 3,
  };
}

function isValidPosition(position: LatLngLiteral | null): position is LatLngLiteral {
  return (
    !!position &&
    Number.isFinite(position.lat) &&
    Number.isFinite(position.lng) &&
    position.lat >= -90 &&
    position.lat <= 90 &&
    position.lng >= -180 &&
    position.lng <= 180
  );
}

function distanceKm(a: LatLngLiteral, b: LatLngLiteral) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRadians(b.lat - a.lat);
  const lngDelta = toRadians(b.lng - a.lng);
  const startLat = toRadians(a.lat);
  const endLat = toRadians(b.lat);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getRouteZoomFloor(distanceKmValue: number) {
  if (distanceKmValue <= 2.5) return 15;
  if (distanceKmValue <= 5) return 14;
  return null;
}

interface TrackingMapProps {
  riderLocation: RiderLocation;
  customerLatLng: [number, number] | null;
}

export default function TrackingMap({ riderLocation, customerLatLng }: TrackingMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const riderMarkerRef = useRef<GoogleMarker | null>(null);
  const customerMarkerRef = useRef<GoogleMarker | null>(null);
  const [loadError, setLoadError] = useState("");

  const riderPosition = useMemo<LatLngLiteral>(
    () => ({
      lat: riderLocation.latitude,
      lng: riderLocation.longitude,
    }),
    [riderLocation.latitude, riderLocation.longitude],
  );
  const customerPosition = useMemo<LatLngLiteral | null>(
    () =>
      customerLatLng
        ? {
            lat: customerLatLng[0],
            lng: customerLatLng[1],
          }
        : null,
    [customerLatLng],
  );

  useEffect(() => {
    let disposed = false;

    if (!GOOGLE_MAPS_API_KEY) {
      return;
    }

    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then((google) => {
        if (disposed || !mapElementRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(mapElementRef.current, {
            center: riderPosition,
            ...LOCKED_MAP_OPTIONS,
            styles: MAP_STYLES,
            zoom: DEFAULT_MAP_ZOOM,
          });
        } else {
          mapRef.current.setOptions(LOCKED_MAP_OPTIONS);
        }

        if (!riderMarkerRef.current) {
          riderMarkerRef.current = new google.maps.Marker({
            icon: markerIcon(google, RIDER_MARKER_COLOR),
            map: mapRef.current,
            position: riderPosition,
            title: "Rider location",
          });
        } else {
          riderMarkerRef.current.setPosition(riderPosition);
        }

        const hasRoutePositions =
          isValidPosition(customerPosition) && isValidPosition(riderPosition);
        const routeDistanceKm = hasRoutePositions
          ? distanceKm(riderPosition, customerPosition)
          : Number.POSITIVE_INFINITY;
        const canShowRouteBounds = hasRoutePositions && routeDistanceKm <= BOUNDS_MAX_DISTANCE_KM;

        if (canShowRouteBounds) {
          if (!customerMarkerRef.current) {
            customerMarkerRef.current = new google.maps.Marker({
              icon: markerIcon(google, CUSTOMER_MARKER_COLOR),
              map: mapRef.current,
              position: customerPosition,
              title: "Delivery destination",
            });
          } else {
            customerMarkerRef.current.setPosition(customerPosition);
          }

          const bounds = new google.maps.LatLngBounds();
          bounds.extend(riderPosition);
          bounds.extend(customerPosition);
          mapRef.current.fitBounds(bounds, { bottom: 28, left: 28, right: 28, top: 28 });
          window.setTimeout(() => {
            const routeZoomFloor = getRouteZoomFloor(routeDistanceKm);
            const fittedZoom = mapRef.current?.getZoom();
            if (
              routeZoomFloor !== null &&
              typeof fittedZoom === "number" &&
              fittedZoom < routeZoomFloor
            ) {
              mapRef.current?.setZoom(routeZoomFloor);
            }
          }, 0);
          return;
        }

        customerMarkerRef.current?.setMap(null);
        customerMarkerRef.current = null;
        mapRef.current.setCenter(riderPosition);
        mapRef.current.setZoom(DEFAULT_MAP_ZOOM);
      })
      .catch(() => {
        if (!disposed) {
          setLoadError("Map could not be loaded right now.");
        }
      });

    return () => {
      disposed = true;
    };
  }, [customerPosition, riderPosition]);

  const mapFallback = !GOOGLE_MAPS_API_KEY
    ? "Map is unavailable because the Google Maps key is not configured."
    : loadError;

  if (mapFallback) {
    return (
      <div className="grid h-[280px] w-full place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm font-semibold text-slate-500">
        {mapFallback}
      </div>
    );
  }

  return (
    <div className="relative h-[280px] w-full overflow-hidden rounded-3xl bg-slate-100">
      <div ref={mapElementRef} className="h-full w-full" aria-label="Live rider tracking map" />
    </div>
  );
}
