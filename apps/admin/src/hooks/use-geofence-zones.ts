import { useQuery } from "@tanstack/react-query";
import { listGeofenceZones } from "../lib/api";

export function useGeofenceZones() {
  return useQuery({
    queryKey: ["admin", "geofence-zones"],
    queryFn: listGeofenceZones,
  });
}
