import { Button } from "@rsc/ui";
import type { OutletSummary } from "@rsc/contracts";
import Skeleton from "@mui/material/Skeleton";
import { Pencil, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { OutletOnboardModal } from "../components/outlet-onboard-modal";
import { useDeleteOutlet } from "../hooks/use-delete-outlet";
import { useOutletsLive } from "../hooks/use-outlets-live";
import { usePlatformCharges, useUpdatePlatformCharges } from "../hooks/use-platform-charges";
import { useToggleOutletStatus } from "../hooks/use-toggle-outlet-status";
import { toastBus } from "../lib/toast-bus";

const CARD_RADIUS = "var(--rsc-radius)";

function basisPointsToPercent(value: number): string {
  return String(value / 100);
}

function minorUnitsToNaira(value: number): string {
  return String(value / 100);
}

function parseNonNegativeNumber(value: string): number | null {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function OutletAvatar({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imageUrl && !imgFailed) {
    return (
      <div className="outlet-card__avatar">
        <img
          src={imageUrl}
          alt=""
          className="outlet-card__img"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="outlet-card__avatar outlet-card__avatar--fallback" aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

type OutletControlPageProps = {
  view?: "outlets" | "platform";
};

export function OutletControlPage({ view = "outlets" }: OutletControlPageProps) {
  const navigate = useNavigate();
  const { data: outlets, isLoading } = useOutletsLive();
  const [onlineState, setOnlineState] = useState<Record<string, boolean>>({});
  const [deleteReadyId, setDeleteReadyId] = useState<string | null>(null);
  const initialized = useRef(false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (outlets && !initialized.current) {
      setOnlineState(Object.fromEntries(outlets.map((o) => [o.id, o.isOnline])));
      initialized.current = true;
    }
  }, [outlets]);

  // Single click navigates to detail page; double-click reveals edit/delete actions.
  // The timer differentiates the two: second click cancels pending navigation.
  function handleCardClick(outletId: string) {
    if (deleteReadyId && deleteReadyId !== outletId) setDeleteReadyId(null);
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      navigate(`/outlets/${outletId}`);
    }, 250);
  }

  function handleCardDoubleClick(outletId: string) {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setDeleteReadyId(outletId);
  }

  // Dismiss delete/edit mode when clicking outside a card or pressing Escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!(e.target as Element).closest(".outlet-card")) setDeleteReadyId(null);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setDeleteReadyId(null);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Modal state: undefined = closed, null = add mode, OutletSummary = edit mode
  const [modalOutlet, setModalOutlet] = useState<OutletSummary | null | undefined>(undefined);

  // Toggle
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const { mutate: toggleStatus } = useToggleOutletStatus();

  function handleToggle(outlet: OutletSummary, currentIsOnline: boolean) {
    const next = !currentIsOnline;
    setOnlineState((prev) => ({ ...prev, [outlet.id]: next }));
    setPendingToggleId(outlet.id);
    toggleStatus(
      { outlet, isOnline: next },
      {
        onSuccess: () => setPendingToggleId(null),
        onError: () => {
          setOnlineState((prev) => ({ ...prev, [outlet.id]: currentIsOnline }));
          setPendingToggleId(null);
        },
      },
    );
  }

  // Delete
  const { mutate: deleteOutlet, variables: deletingId, isPending: isDeleting } = useDeleteOutlet();

  function handleDelete(id: string) {
    setDeleteReadyId(null);
    deleteOutlet(id);
  }

  // Platform charges
  const platformCharges = usePlatformCharges();
  const updatePlatformCharges = useUpdatePlatformCharges();

  function handleSavePlatformCharges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const commissionPercent = parseNonNegativeNumber(String(form.get("commission") ?? ""));
    const vatPercent = parseNonNegativeNumber(String(form.get("vat") ?? ""));
    const deliveryFeeNaira = parseNonNegativeNumber(String(form.get("deliveryFee") ?? ""));
    const serviceFeeNaira = parseNonNegativeNumber(String(form.get("serviceFee") ?? ""));

    if (
      commissionPercent === null ||
      commissionPercent > 100 ||
      vatPercent === null ||
      vatPercent > 100 ||
      deliveryFeeNaira === null ||
      serviceFeeNaira === null
    ) {
      toastBus.emit("Enter valid charges. Percentage rates must be between 0 and 100.", "error");
      return;
    }

    updatePlatformCharges.mutate({
      platformCommissionBps: Math.round(commissionPercent * 100),
      defaultVatBps: Math.round(vatPercent * 100),
      deliveryFeeMinor: Math.round(deliveryFeeNaira * 100),
      serviceFeeMinor: Math.round(serviceFeeNaira * 100),
    });
  }

  return (
    <>
      <OutletOnboardModal
        open={modalOutlet !== undefined}
        outlet={modalOutlet ?? undefined}
        onClose={() => setModalOutlet(undefined)}
      />

      <div className="outlet-control">
        {view === "outlets" && (
          <section className="outlet-availability">
            <div className="outlet-availability__head">
              <h2>Outlet Availability overrides</h2>
              <Button tone="navy" onClick={() => setModalOutlet(null)}>
                <span className="onboard-icon">+</span>
                <span className="onboard-label">Onboard New Outlet</span>
              </Button>
            </div>

            <div className="outlet-list">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      variant="rectangular"
                      height={84}
                      sx={{ borderRadius: CARD_RADIUS, transform: "none" }}
                    />
                  ))
                : outlets?.map((outlet) => {
                    const isOnline = onlineState[outlet.id] ?? outlet.isOnline;
                    const isDeleteReady = deleteReadyId === outlet.id;
                    const isBeingDeleted = isDeleting && deletingId === outlet.id;

                    return (
                      <div
                        key={outlet.id}
                        className={[
                          "outlet-card",
                          isDeleteReady ? "outlet-card--delete-ready" : "",
                          isBeingDeleted ? "outlet-card--deleting" : "",
                        ]
                          .join(" ")
                          .trim()}
                        onClick={() => handleCardClick(outlet.id)}
                        onDoubleClick={() => handleCardDoubleClick(outlet.id)}
                      >
                        {/* Side action buttons — slide in on double-tap */}
                        <div className="outlet-card__side-actions">
                          <button
                            type="button"
                            aria-label={`Edit ${outlet.name}`}
                            className="outlet-edit-btn"
                            tabIndex={isDeleteReady ? 0 : -1}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteReadyId(null);
                              setModalOutlet(outlet);
                            }}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            aria-label={`Delete ${outlet.name}`}
                            className="outlet-delete-btn"
                            tabIndex={isDeleteReady ? 0 : -1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(outlet.id);
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <OutletAvatar imageUrl={outlet.imageUrl} name={outlet.name} />

                        <div className="outlet-card__info">
                          <strong>{outlet.name}</strong>
                          <small className="outlet-card__cuisine">{outlet.cuisineType}</small>
                          <small>
                            Sub-account:{" "}
                            {outlet.paystackSubaccountCode ?? "None (Pending Onboarding)"}
                          </small>
                        </div>

                        <span
                          className={`outlet-status${isOnline ? "" : " outlet-status--closed"}`}
                        >
                          {isOnline ? "ONLINE & TRADING" : "REMOTELY CLOSED"}
                        </span>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={isOnline}
                          aria-label={`Toggle ${outlet.name} availability`}
                          className={`outlet-toggle${isOnline ? " outlet-toggle--on" : ""}${pendingToggleId === outlet.id ? " outlet-toggle--pending" : ""}`}
                          disabled={pendingToggleId === outlet.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(outlet, isOnline);
                          }}
                        />
                      </div>
                    );
                  })}
            </div>
          </section>
        )}

        {/* Platform charges */}
        {view === "platform" && (
          <section className="panel platform-charges">
            <h2 className="platform-charges__title">Adjust Platform Charges</h2>
            {platformCharges.isError ? (
              <div className="charges-form__error" role="alert">
                <p>Platform charges could not be loaded.</p>
                <Button tone="quiet" type="button" onClick={() => void platformCharges.refetch()}>
                  Try Again
                </Button>
              </div>
            ) : platformCharges.isLoading || !platformCharges.data ? (
              <div className="charges-form" aria-label="Loading platform charges">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    variant="rounded"
                    height={68}
                    sx={{ borderRadius: "12px", transform: "none" }}
                  />
                ))}
              </div>
            ) : (
              <form
                key={[
                  platformCharges.data.platformCommissionBps,
                  platformCharges.data.defaultVatBps,
                  platformCharges.data.deliveryFeeMinor,
                  platformCharges.data.serviceFeeMinor,
                ].join("-")}
                className="charges-form"
                onSubmit={handleSavePlatformCharges}
              >
                <label className="field-label">
                  Platform Commission (%)
                  <input
                    className="field-input"
                    name="commission"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    defaultValue={basisPointsToPercent(platformCharges.data.platformCommissionBps)}
                    disabled={updatePlatformCharges.isPending}
                    required
                  />
                </label>
                <label className="field-label">
                  VAT Rate (%)
                  <input
                    className="field-input"
                    name="vat"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    defaultValue={basisPointsToPercent(platformCharges.data.defaultVatBps)}
                    disabled={updatePlatformCharges.isPending}
                    required
                  />
                </label>
                <label className="field-label">
                  Flat Delivery Fee (₦)
                  <input
                    className="field-input"
                    name="deliveryFee"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={minorUnitsToNaira(platformCharges.data.deliveryFeeMinor)}
                    disabled={updatePlatformCharges.isPending}
                    required
                  />
                </label>
                <label className="field-label">
                  Service Fee (₦)
                  <input
                    className="field-input"
                    name="serviceFee"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={minorUnitsToNaira(platformCharges.data.serviceFeeMinor)}
                    disabled={updatePlatformCharges.isPending}
                    required
                  />
                </label>
                <Button
                  tone="navy"
                  fullWidth
                  type="submit"
                  disabled={updatePlatformCharges.isPending}
                >
                  {updatePlatformCharges.isPending ? "Saving…" : "Save Configuration"}
                </Button>
              </form>
            )}
          </section>
        )}
      </div>
    </>
  );
}
