import { Button } from "@rsc/ui";
import type { OutletSummary } from "@rsc/contracts";
import Skeleton from "@mui/material/Skeleton";
import { Bike, Calculator, Check, Compass, MapPin, Plus, Store, Tag, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { useGeofenceZones } from "../hooks/use-geofence-zones";
import { useUpdateOutletDelivery } from "../hooks/use-update-outlet-delivery";
import type { GeofenceZoneSummary } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

interface Props {
  outlets: OutletSummary[] | undefined;
  isLoading?: boolean;
}

function minorUnitsToNaira(value: number | null | undefined): string {
  if (value == null) return "0";
  return String(value / 100);
}

function parseNonNegativeNumber(value: string): number | null {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

interface LocationFeeItem {
  id: string;
  locationName: string;
  zoneId: string | null;
  feeNaira: string;
}

export function OutletDeliveryConfig({ outlets, isLoading }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const { data: geofenceZones = [] } = useGeofenceZones();

  if (isLoading) {
    return (
      <section className="panel delivery-config-panel">
        <Skeleton variant="text" sx={{ fontSize: "1.5rem", width: "40%", mb: 2 }} />
        <Skeleton variant="rounded" height={80} sx={{ borderRadius: "12px", mb: 2 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: "12px" }} />
      </section>
    );
  }

  if (!outlets || outlets.length === 0) {
    return null;
  }

  const selectedOutlet = outlets.find((o) => o.id === selectedId) ?? outlets[0]!;

  return (
    <section className="panel delivery-config-panel">
      <div className="delivery-config__header">
        <div>
          <h2 className="platform-charges__title" style={{ margin: 0 }}>
            Outlet Delivery Fee Configuration
          </h2>
          <p className="delivery-config__subtitle">
            Configure flexible delivery pricing models per outlet. Choose Flat Rate, Distance-based
            (Price per KM with Base Price), or Location/Zone-based pricing.
          </p>
        </div>
      </div>

      {/* Outlet Selector Dropdown */}
      <div className="delivery-config__outlet-selector">
        <label htmlFor="outlet-picker" className="field-label">
          Select Outlet to Configure
        </label>
        <div className="outlet-selector-box">
          <Store size={18} className="outlet-selector-icon" />
          <select
            id="outlet-picker"
            className="field-input outlet-select-input"
            value={selectedOutlet.id}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name} ({outlet.cuisineType}) — Model:{" "}
                {outlet.deliveryPricingModel === "PER_KM"
                  ? "Price per KM"
                  : outlet.deliveryPricingModel === "PER_LOCATION"
                    ? "Location-based"
                    : "Flat Rate"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <OutletDeliveryForm
        key={selectedOutlet.id}
        outlet={selectedOutlet}
        geofenceZones={geofenceZones}
      />
    </section>
  );
}

interface FormProps {
  outlet: OutletSummary;
  geofenceZones: GeofenceZoneSummary[];
}

function OutletDeliveryForm({ outlet, geofenceZones }: FormProps) {
  const updateDelivery = useUpdateOutletDelivery();

  const [pricingModel, setPricingModel] = useState<"FLAT" | "PER_KM" | "PER_LOCATION">(
    outlet.deliveryPricingModel ?? "FLAT",
  );
  const [flatFeeNaira, setFlatFeeNaira] = useState<string>(
    minorUnitsToNaira(outlet.deliveryFeeMinor ?? 150000),
  );
  const [baseFeeNaira, setBaseFeeNaira] = useState<string>(
    minorUnitsToNaira(outlet.deliveryBaseFeeMinor ?? 50000),
  );
  const [pricePerKmNaira, setPricePerKmNaira] = useState<string>(
    minorUnitsToNaira(outlet.deliveryPricePerKmMinor ?? 20000),
  );
  const [locationFees, setLocationFees] = useState<LocationFeeItem[]>(() =>
    (outlet.deliveryLocationFees ?? []).map((loc, idx) => ({
      id: `${loc.locationName}-${idx}`,
      locationName: loc.locationName,
      zoneId: loc.zoneId ?? null,
      feeNaira: minorUnitsToNaira(loc.feeMinor),
    })),
  );
  const [calcDistanceKm, setCalcDistanceKm] = useState<number>(5);

  // New location override row fields
  const [newLocationName, setNewLocationName] = useState("");
  const [newZoneId, setNewZoneId] = useState("");
  const [newFeeNaira, setNewFeeNaira] = useState("");

  function handleAddLocationOverride() {
    const name = newLocationName.trim();
    const feeNum = parseNonNegativeNumber(newFeeNaira);

    if (!name) {
      toastBus.emit("Please enter or select a location name.", "error");
      return;
    }
    if (feeNum === null) {
      toastBus.emit("Please enter a valid non-negative delivery fee.", "error");
      return;
    }

    setLocationFees((prev) => [
      ...prev,
      {
        id: `${name}-${Date.now()}`,
        locationName: name,
        zoneId: newZoneId || null,
        feeNaira: String(feeNum),
      },
    ]);

    setNewLocationName("");
    setNewZoneId("");
    setNewFeeNaira("");
  }

  function handleRemoveLocation(id: string) {
    setLocationFees((prev) => prev.filter((item) => item.id !== id));
  }

  function handleZoneSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const zoneId = e.target.value;
    setNewZoneId(zoneId);
    if (zoneId) {
      const matched = geofenceZones.find((z) => z.id === zoneId);
      if (matched) {
        setNewLocationName(matched.name);
      }
    }
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();

    const flatFee = parseNonNegativeNumber(flatFeeNaira);
    const baseFee = parseNonNegativeNumber(baseFeeNaira);
    const pricePerKm = parseNonNegativeNumber(pricePerKmNaira);

    if (pricingModel === "FLAT" && flatFee === null) {
      toastBus.emit("Enter a valid flat delivery fee.", "error");
      return;
    }

    if (pricingModel === "PER_KM") {
      if (baseFee === null || pricePerKm === null) {
        toastBus.emit("Enter a valid base price and price per kilometer.", "error");
        return;
      }
    }

    if (pricingModel === "PER_LOCATION" && baseFee === null) {
      toastBus.emit("Enter a valid default/base location delivery fee.", "error");
      return;
    }

    const payloadLocationFees = locationFees.map((loc) => ({
      locationName: loc.locationName,
      zoneId: loc.zoneId,
      feeMinor: Math.round((parseNonNegativeNumber(loc.feeNaira) ?? 0) * 100),
    }));

    updateDelivery.mutate({
      id: outlet.id,
      body: {
        deliveryPricingModel: pricingModel,
        deliveryFeeMinor: Math.round((flatFee ?? 1500) * 100),
        deliveryBaseFeeMinor: Math.round((baseFee ?? 0) * 100),
        deliveryPricePerKmMinor: Math.round((pricePerKm ?? 0) * 100),
        deliveryLocationFees: payloadLocationFees,
      },
    });
  }

  // Preview calculation for PER_KM
  const previewBase = Number(baseFeeNaira) || 0;
  const previewPerKm = Number(pricePerKmNaira) || 0;
  const previewTotal = previewBase + calcDistanceKm * previewPerKm;

  return (
    <form onSubmit={handleSave} className="delivery-model-form">
      {/* Pricing Model Selector Cards */}
      <div className="field-label" style={{ marginBottom: "-0.5rem" }}>
        Choose Pricing Model
      </div>
      <div className="pricing-models-grid">
        {/* Card 1: Flat Rate */}
        <button
          type="button"
          className={`model-card${pricingModel === "FLAT" ? " model-card--selected" : ""}`}
          onClick={() => setPricingModel("FLAT")}
        >
          <div className="model-card__icon-wrap">
            <Tag size={20} />
          </div>
          <div className="model-card__content">
            <div className="model-card__title-row">
              <span className="model-card__title">Flat Rate</span>
              {pricingModel === "FLAT" && <Check size={16} className="model-card__check" />}
            </div>
            <p className="model-card__desc">
              Charge a fixed, predictable fee across all delivery orders.
            </p>
          </div>
        </button>

        {/* Card 2: Price per Kilometer */}
        <button
          type="button"
          className={`model-card${pricingModel === "PER_KM" ? " model-card--selected" : ""}`}
          onClick={() => setPricingModel("PER_KM")}
        >
          <div className="model-card__icon-wrap">
            <Bike size={20} />
          </div>
          <div className="model-card__content">
            <div className="model-card__title-row">
              <span className="model-card__title">Price per Kilometer</span>
              {pricingModel === "PER_KM" && <Check size={16} className="model-card__check" />}
            </div>
            <p className="model-card__desc">
              Base starting price plus distance rate calculated from outlet to customer.
            </p>
          </div>
        </button>

        {/* Card 3: Price per Location */}
        <button
          type="button"
          className={`model-card${pricingModel === "PER_LOCATION" ? " model-card--selected" : ""}`}
          onClick={() => setPricingModel("PER_LOCATION")}
        >
          <div className="model-card__icon-wrap">
            <MapPin size={20} />
          </div>
          <div className="model-card__content">
            <div className="model-card__title-row">
              <span className="model-card__title">Price per Location</span>
              {pricingModel === "PER_LOCATION" && <Check size={16} className="model-card__check" />}
            </div>
            <p className="model-card__desc">
              Targeted rates for specific delivery zones/areas with fallback price.
            </p>
          </div>
        </button>
      </div>

      {/* Model 1: Flat Rate Inputs */}
      {pricingModel === "FLAT" && (
        <div className="model-settings-block">
          <label className="field-label">
            Flat Delivery Fee (₦)
            <span className="field-hint">
              Customers ordering delivery from {outlet.name} will be charged this fixed amount.
            </span>
            <input
              className="field-input"
              type="number"
              min={0}
              step={50}
              value={flatFeeNaira}
              onChange={(e) => setFlatFeeNaira(e.target.value)}
              placeholder="e.g. 1500"
              required
            />
          </label>
        </div>
      )}

      {/* Model 2: Price per Kilometer Inputs */}
      {pricingModel === "PER_KM" && (
        <div className="model-settings-block">
          <div className="model-fields-row">
            <label className="field-label">
              Base Starting Price (₦)
              <span className="field-hint">Minimum/starting fee charged before distance.</span>
              <input
                className="field-input"
                type="number"
                min={0}
                step={50}
                value={baseFeeNaira}
                onChange={(e) => setBaseFeeNaira(e.target.value)}
                placeholder="e.g. 500"
                required
              />
            </label>

            <label className="field-label">
              Price per Kilometer (₦/km)
              <span className="field-hint">Additional charge added for every kilometer.</span>
              <input
                className="field-input"
                type="number"
                min={0}
                step={10}
                value={pricePerKmNaira}
                onChange={(e) => setPricePerKmNaira(e.target.value)}
                placeholder="e.g. 200"
                required
              />
            </label>
          </div>

          {/* Dynamic Preview Calculator */}
          <div className="preview-calc-box">
            <div className="preview-calc__title">
              <Calculator size={16} />
              <span>Live Estimation Calculator</span>
            </div>
            <div className="preview-calc__controls">
              <span className="preview-calc__label">Test Distance:</span>
              {[2, 5, 8, 12, 15].map((km) => (
                <button
                  key={km}
                  type="button"
                  className={`preview-chip${calcDistanceKm === km ? " preview-chip--active" : ""}`}
                  onClick={() => setCalcDistanceKm(km)}
                >
                  {km} km
                </button>
              ))}
              <div className="preview-calc__custom">
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={calcDistanceKm}
                  onChange={(e) => setCalcDistanceKm(Math.max(0, Number(e.target.value)))}
                  className="field-input preview-km-input"
                />
                <span className="preview-km-unit">km</span>
              </div>
            </div>
            <div className="preview-calc__result">
              <span>
                Formula: ₦{previewBase.toLocaleString()} (base) + ({calcDistanceKm} km × ₦
                {previewPerKm.toLocaleString()}) =
              </span>
              <strong className="preview-calc__total">
                ₦{Math.round(previewTotal).toLocaleString()}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Model 3: Price per Location Inputs */}
      {pricingModel === "PER_LOCATION" && (
        <div className="model-settings-block">
          <label className="field-label">
            Default / Base Delivery Fee (₦)
            <span className="field-hint">
              Applied when delivery address falls into a serviceable area not specifically listed
              below.
            </span>
            <input
              className="field-input"
              type="number"
              min={0}
              step={50}
              value={baseFeeNaira}
              onChange={(e) => setBaseFeeNaira(e.target.value)}
              placeholder="e.g. 1500"
              required
            />
          </label>

          {/* Location Overrides Table */}
          <div className="location-overrides-section">
            <div className="location-overrides__heading">
              <Compass size={16} />
              <span>Location / Zone Rates</span>
            </div>

            {locationFees.length === 0 ? (
              <p className="location-overrides__empty">
                No location overrides configured yet. All delivery orders will use the default fee
                of ₦{(Number(baseFeeNaira) || 0).toLocaleString()}.
              </p>
            ) : (
              <div className="location-fees-table">
                <div className="location-fees-table__header">
                  <span>Location / Zone</span>
                  <span>Delivery Fee (₦)</span>
                  <span>Action</span>
                </div>
                {locationFees.map((loc) => (
                  <div key={loc.id} className="location-fees-table__row">
                    <div className="location-name-col">
                      <MapPin size={14} className="location-pin-icon" />
                      <span className="location-name-text">{loc.locationName}</span>
                      {loc.zoneId && <span className="zone-badge">Geofence</span>}
                    </div>
                    <div className="location-fee-col">
                      <input
                        type="number"
                        min={0}
                        step={50}
                        className="field-input location-fee-input"
                        value={loc.feeNaira}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocationFees((prev) =>
                            prev.map((item) =>
                              item.id === loc.id ? { ...item, feeNaira: val } : item,
                            ),
                          );
                        }}
                      />
                    </div>
                    <div className="location-action-col">
                      <button
                        type="button"
                        className="location-delete-btn"
                        aria-label={`Remove ${loc.locationName}`}
                        onClick={() => handleRemoveLocation(loc.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new location rate row */}
            <div className="add-location-box">
              <div className="add-location-box__inputs">
                {geofenceZones.length > 0 && (
                  <select
                    className="field-input zone-select-input"
                    value={newZoneId}
                    onChange={handleZoneSelectChange}
                  >
                    <option value="">-- Choose Geofence Zone --</option>
                    {geofenceZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        📍 {zone.name}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  className="field-input location-text-input"
                  placeholder="Or enter location name (e.g. Lekki Phase 1)"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                />
                <input
                  type="number"
                  min={0}
                  step={50}
                  className="field-input fee-input-short"
                  placeholder="Fee (₦)"
                  value={newFeeNaira}
                  onChange={(e) => setNewFeeNaira(e.target.value)}
                />
                <Button
                  tone="quiet"
                  type="button"
                  className="add-loc-btn"
                  onClick={handleAddLocationOverride}
                >
                  <Plus size={16} />
                  <span>Add Rate</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit CTA */}
      <div className="delivery-config__actions">
        <Button tone="navy" type="submit" disabled={updateDelivery.isPending}>
          {updateDelivery.isPending ? "Saving..." : `Save Delivery Settings for ${outlet.name}`}
        </Button>
      </div>
    </form>
  );
}
