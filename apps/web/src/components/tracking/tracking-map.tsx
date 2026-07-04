"use client";

import { useEffect } from "react";

import type { RiderLocation } from "@rsc/contracts";
import L from "leaflet";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";

function FitTrackingView({
  riderPosition,
  customerPosition,
}: {
  riderPosition: [number, number];
  customerPosition: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (customerPosition) {
      map.fitBounds(L.latLngBounds([riderPosition, customerPosition]), {
        animate: true,
        maxZoom: 16,
        padding: [36, 36],
      });
      return;
    }

    map.setView(riderPosition, 15, { animate: true });
  }, [customerPosition, map, riderPosition]);

  return null;
}

interface TrackingMapProps {
  riderLocation: RiderLocation;
  customerLatLng: [number, number] | null;
}

export default function TrackingMap({ riderLocation, customerLatLng }: TrackingMapProps) {
  const riderPosition: [number, number] = [riderLocation.latitude, riderLocation.longitude];

  return (
    <MapContainer
      center={riderPosition}
      zoom={15}
      className="h-[280px] w-full"
      style={{ zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={riderPosition}
        radius={9}
        pathOptions={{
          color: "#ffffff",
          fillColor: "#d4832a",
          fillOpacity: 1,
          weight: 3,
        }}
      />
      {customerLatLng && (
        <CircleMarker
          center={customerLatLng}
          radius={8}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#1e3160",
            fillOpacity: 1,
            weight: 3,
          }}
        />
      )}
      <FitTrackingView riderPosition={riderPosition} customerPosition={customerLatLng} />
    </MapContainer>
  );
}
