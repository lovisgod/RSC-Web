import { Button } from "@rsc/ui";
import type { OutletSummary } from "@rsc/contracts";
import Skeleton from "@mui/material/Skeleton";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { OutletOnboardModal } from "../components/outlet-onboard-modal";
import { useDeleteOutlet } from "../hooks/use-delete-outlet";
import { useOutletsLive } from "../hooks/use-outlets-live";
import { useToggleOutletStatus } from "../hooks/use-toggle-outlet-status";

const CARD_RADIUS = "var(--rsc-radius)";

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

export function OutletControlPage() {
  const { data: outlets, isLoading } = useOutletsLive();
  const [onlineState, setOnlineState] = useState<Record<string, boolean>>({});
  const [deleteReadyId, setDeleteReadyId] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (outlets && !initialized.current) {
      setOnlineState(Object.fromEntries(outlets.map((o) => [o.id, o.isOnline])));
      initialized.current = true;
    }
  }, [outlets]);

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

  function handleToggle(id: string, currentIsOnline: boolean) {
    const next = !currentIsOnline;
    setOnlineState((prev) => ({ ...prev, [id]: next }));
    setPendingToggleId(id);
    toggleStatus(
      { id, isOnline: next },
      {
        onSuccess: () => setPendingToggleId(null),
        onError: () => {
          setOnlineState((prev) => ({ ...prev, [id]: currentIsOnline }));
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
  const [commission, setCommission] = useState("15");
  const [vat, setVat] = useState("7.5");
  const [deliveryFee, setDeliveryFee] = useState("500");

  return (
    <>
      <OutletOnboardModal
        open={modalOutlet !== undefined}
        outlet={modalOutlet ?? undefined}
        onClose={() => setModalOutlet(undefined)}
      />

      <div className="outlet-control">
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
                      onDoubleClick={() => setDeleteReadyId(outlet.id)}
                      onClick={() => {
                        if (deleteReadyId && deleteReadyId !== outlet.id) setDeleteReadyId(null);
                      }}
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
                        <small>Sub-account: {outlet.momentSubaccountCode}</small>
                      </div>

                      <span className={`outlet-status${isOnline ? "" : " outlet-status--closed"}`}>
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
                          handleToggle(outlet.id, isOnline);
                        }}
                      />
                    </div>
                  );
                })}
          </div>
        </section>

        {/* Platform charges */}
        <section className="panel platform-charges">
          <h2 className="platform-charges__title">Adjust Platform Charges</h2>
          <div className="charges-form">
            <label className="field-label">
              Platform Commission (%)
              <input
                className="field-input"
                type="number"
                min={0}
                max={100}
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
            </label>
            <label className="field-label">
              VAT Rate (%)
              <input
                className="field-input"
                type="number"
                min={0}
                max={100}
                value={vat}
                onChange={(e) => setVat(e.target.value)}
              />
            </label>
            <label className="field-label">
              Flat Delivery Fee (₦)
              <input
                className="field-input"
                type="number"
                min={0}
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
              />
            </label>
            <Button tone="navy" fullWidth>
              Save Configuration
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
