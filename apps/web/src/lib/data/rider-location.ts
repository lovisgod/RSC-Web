import type { RiderLocation } from "@rsc/contracts";
import { riderLocationSchema } from "@rsc/contracts";

export function parseRiderLocationEvent(rawData: string): RiderLocation | null {
  try {
    const raw: unknown = JSON.parse(rawData);
    const candidate =
      raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;
    const result = riderLocationSchema.safeParse(candidate);

    if (!result.success) {
      console.warn("Ignored invalid rider-location event", result.error.flatten());
      return null;
    }

    return result.data;
  } catch {
    console.warn("Ignored non-JSON rider-location event");
    return null;
  }
}
