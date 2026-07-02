"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

import type { RiderLocation } from "@rsc/contracts";

// DivIcon markers — avoids webpack icon path issues
const riderIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;background:#f97316;border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 5px rgba(249,115,22,0.25)"></div>`,
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const customerIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;background:#3b82f6;border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.2)"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function PanOnUpdate({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(position, { animate: true });
  }, [map, position]);
  return null;
}

interface TrackingMapProps {
  riderLocation: RiderLocation;
  customerLatLng: [number, number] | null;
}

export default function TrackingMap({ riderLocation, customerLatLng }: TrackingMapProps) {
  const riderPos: [number, number] = [riderLocation.latitude, riderLocation.longitude];

  return (
    <MapContainer
      center={riderPos}
      zoom={15}
      style={{ height: "260px", width: "100%", borderRadius: "12px", zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={riderPos} icon={riderIcon} />
      {customerLatLng && <Marker position={customerLatLng} icon={customerIcon} />}
      <PanOnUpdate position={riderPos} />
    </MapContainer>
  );
}
