"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { RiderLocation } from "@rsc/contracts";

type LatLngLiteral = { lat: number; lng: number };

interface GoogleMap {
  fitBounds(bounds: GoogleLatLngBounds, padding?: number | GoogleMapPadding): void;
  setCenter(position: LatLngLiteral): void;
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
  disableDefaultUI?: boolean;
  gestureHandling?: "cooperative" | "greedy" | "none" | "auto";
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  zoom: number;
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
            clickableIcons: false,
            disableDefaultUI: true,
            gestureHandling: "cooperative",
            mapTypeControl: false,
            streetViewControl: false,
            zoom: 15,
          });
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

        if (customerPosition) {
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
          mapRef.current.fitBounds(bounds, { bottom: 36, left: 36, right: 36, top: 36 });
          return;
        }

        customerMarkerRef.current?.setMap(null);
        customerMarkerRef.current = null;
        mapRef.current.setCenter(riderPosition);
        mapRef.current.setZoom(15);
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
