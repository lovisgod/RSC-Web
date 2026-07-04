import { describe, expect, it } from "vitest";

import { parseRiderLocationEvent } from "./rider-location";

const location = {
  riderId: "2abf9577-027c-4936-83a8-e004fd56a46e",
  masterOrderId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
  latitude: 6.5244,
  longitude: 3.3792,
  recordedAt: "2026-07-04T10:00:00.000Z",
};

describe("parseRiderLocationEvent", () => {
  it("accepts a direct rider-location event", () => {
    expect(parseRiderLocationEvent(JSON.stringify(location))).toEqual(location);
  });

  it("accepts a wrapped rider-location event", () => {
    expect(parseRiderLocationEvent(JSON.stringify({ data: location }))).toEqual(location);
  });

  it("ignores malformed and out-of-range events", () => {
    expect(parseRiderLocationEvent("not-json")).toBeNull();
    expect(parseRiderLocationEvent(JSON.stringify({ ...location, latitude: 200 }))).toBeNull();
  });
});
