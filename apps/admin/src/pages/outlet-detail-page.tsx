import { Button, EmptyState } from "@rsc/ui";
import Skeleton from "@mui/material/Skeleton";
import { ArrowLeft, Pencil, Store, Trash2, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";

import { OutletAdminModal } from "../components/outlet-admin-modal";
import { OutletOnboardModal } from "../components/outlet-onboard-modal";
import { useDeleteOutlet } from "../hooks/use-delete-outlet";
import { useOutlet } from "../hooks/use-outlet";

function OutletAvatar({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imageUrl && !imgFailed) {
    return (
      <div className="outlet-detail__avatar">
        <img
          src={imageUrl}
          alt={name}
          className="outlet-detail__img"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="outlet-detail__avatar outlet-detail__avatar--fallback" aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="outlet-detail__meta-row">
      <span className="outlet-detail__meta-label">{label}</span>
      <span className={`outlet-detail__meta-value${mono ? " text-mono" : ""}`}>{value}</span>
    </div>
  );
}

interface DeleteConfirmProps {
  name: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ name, isPending, onConfirm, onCancel }: DeleteConfirmProps) {
  return createPortal(
    <div className="modal-overlay" aria-hidden="true" onClick={() => !isPending && onCancel()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <p className="kicker" style={{ margin: 0 }}>
              Confirm action
            </p>
            <h2 id="delete-confirm-title">Delete Outlet</h2>
          </div>
          <button
            type="button"
            className="modal__close"
            aria-label="Close"
            disabled={isPending}
            onClick={onCancel}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal__body">
          <p style={{ margin: "0 0 1.5rem", lineHeight: 1.55 }}>
            Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
          </p>
          <div className="modal__actions">
            <Button tone="quiet" type="button" disabled={isPending} onClick={onCancel}>
              Cancel
            </Button>
            <Button tone="danger" type="button" disabled={isPending} onClick={onConfirm}>
              {isPending ? "Deleting…" : "Delete Outlet"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function OutletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: outlet, isLoading } = useOutlet(id!);
  const [editOpen, setEditOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { mutate: deleteOutlet, isPending: isDeleting } = useDeleteOutlet();

  function handleDeleteConfirm() {
    if (!outlet) return;
    deleteOutlet(outlet.id, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        navigate("/outlets");
      },
    });
  }

  return (
    <>
      <OutletOnboardModal open={editOpen} outlet={outlet} onClose={() => setEditOpen(false)} />
      <OutletAdminModal
        open={adminModalOpen}
        outletId={id!}
        onClose={() => setAdminModalOpen(false)}
      />
      {deleteConfirmOpen && outlet && (
        <DeleteConfirmModal
          name={outlet.name}
          isPending={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      )}

      <div className="outlet-detail-page">
        {/* Top bar — back link + standalone Onboard Admin CTA */}
        <div className="outlet-detail-page__topbar">
          <button
            type="button"
            className="outlet-detail-page__back"
            onClick={() => navigate("/outlets")}
            aria-label="Back to outlets"
          >
            <ArrowLeft size={18} />
            <span>All Outlets</span>
          </button>

          <Button
            tone="navy"
            disabled={isLoading || !outlet}
            onClick={() => setAdminModalOpen(true)}
          >
            <span className="onboard-icon">+</span>
            <span>Onboard Outlet Admin</span>
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="outlet-detail-page__card">
            <Skeleton
              variant="rectangular"
              width={140}
              height={140}
              sx={{ borderRadius: "var(--rsc-radius)", flexShrink: 0 }}
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <Skeleton variant="text" sx={{ fontSize: "1.75rem", width: "60%" }} />
              <Skeleton variant="text" sx={{ fontSize: "1rem", width: "40%" }} />
              <Skeleton variant="text" sx={{ fontSize: "0.875rem", width: "80%" }} />
              <Skeleton variant="text" sx={{ fontSize: "0.875rem", width: "50%" }} />
            </div>
          </div>
        ) : outlet ? (
          <div className="outlet-detail-page__card panel">
            <OutletAvatar imageUrl={outlet.imageUrl} name={outlet.name} />

            <div className="outlet-detail__info">
              {/* Name + status badge + edit/delete icons all in one row */}
              <div className="outlet-detail__info-header">
                <h2 className="outlet-detail__name">{outlet.name}</h2>
                <span className={`outlet-status${outlet.isOnline ? "" : " outlet-status--closed"}`}>
                  {outlet.isOnline ? "ONLINE & TRADING" : "REMOTELY CLOSED"}
                </span>

                <div className="outlet-detail__card-actions">
                  <button
                    type="button"
                    className="outlet-icon-btn outlet-icon-btn--edit"
                    aria-label="Edit outlet"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="outlet-icon-btn outlet-icon-btn--delete"
                    aria-label="Delete outlet"
                    disabled={isDeleting}
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <p className="outlet-detail__cuisine">{outlet.cuisineType}</p>

              {outlet.description && <p className="outlet-detail__desc">{outlet.description}</p>}

              <div className="outlet-detail__meta">
                <MetaRow label="Subaccount Code" value={outlet.momentSubaccountCode} />
                <MetaRow label="Outlet ID" value={outlet.id} mono />
              </div>
            </div>
          </div>
        ) : (
          <EmptyState icon={<Store size={32} />} heading="Outlet not found" />
        )}
      </div>
    </>
  );
}
