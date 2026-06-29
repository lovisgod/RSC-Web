import { Button } from "@rsc/ui";
import type { OutletSummary } from "@rsc/contracts";
import { Pencil, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastBus } from "../lib/toast-bus";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pass an existing outlet to switch the modal into edit mode */
  outlet?: OutletSummary;
}

interface FormState {
  name: string;
  description: string;
  cuisineType: string;
  isOnline: boolean;
  momentSubaccountCode: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  cuisineType: "",
  isOnline: true,
  momentSubaccountCode: "",
};

export function OutletOnboardModal({ open, onClose, outlet }: Props) {
  const isEditMode = !!outlet;
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Seed form when modal opens (add → empty, edit → outlet data)
  useEffect(() => {
    if (!open) return;
    if (outlet) {
      setForm({
        name: outlet.name,
        description: outlet.description ?? "",
        cuisineType: outlet.cuisineType,
        isOnline: outlet.isOnline,
        momentSubaccountCode: outlet.momentSubaccountCode,
      });
      setImagePreview(outlet.imageUrl);
    } else {
      setForm(EMPTY_FORM);
      setImagePreview(null);
    }
    setImageFile(null);
    setFieldErrors({});
  }, [open, outlet]);

  // Focus + Escape
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => firstFieldRef.current?.focus(), 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const {
    mutate,
    isPending,
    error,
    reset: resetMutation,
  } = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("description", form.description.trim());
      fd.append("cuisineType", form.cuisineType.trim());
      fd.append("isOnline", String(form.isOnline));
      fd.append("momentSubaccountCode", form.momentSubaccountCode.trim());
      if (imageFile) fd.append("image", imageFile);

      const url = isEditMode
        ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/outlets/${outlet!.id}`
        : `${import.meta.env.VITE_API_BASE_URL}/api/v1/outlets`;
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(url, { method, body: fd });
      const payload: { message?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message ?? `Request failed (${res.status})`);
      return payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "outlets"] });
      toastBus.emit(
        data.message ?? (isEditMode ? "Outlet updated" : "Outlet onboarded"),
        "success",
      );
      handleClose();
    },
    onError: (err: Error) => {
      toastBus.emit(err.message, "error");
    },
  });

  function handleClose() {
    if (isPending) return;
    resetMutation();
    onClose();
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function validate() {
    const errs: typeof fieldErrors = {};
    if (!form.name.trim()) errs.name = "Outlet name is required";
    if (!form.cuisineType.trim()) errs.cuisineType = "Cuisine type is required";
    if (!form.momentSubaccountCode.trim())
      errs.momentSubaccountCode = "Subaccount code is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) mutate();
  }

  function field(key: keyof FormState) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" aria-hidden="true" onClick={handleClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="modal__head">
          <div>
            <p className="kicker" style={{ margin: 0 }}>
              Outlet management
            </p>
            <h2 id="modal-title">{isEditMode ? "Edit Outlet" : "Onboard New Outlet"}</h2>
          </div>
          <button
            type="button"
            className="modal__close"
            aria-label="Close"
            disabled={isPending}
            onClick={handleClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Form ── */}
        <form className="modal__body" onSubmit={handleSubmit} noValidate>
          {/* Image upload / replace */}
          <div>
            <input
              ref={fileInputRef}
              id="outlet-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleImageChange}
            />
            <div
              className={`outlet-image-drop${imagePreview ? " outlet-image-drop--filled" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={isEditMode ? "Replace outlet image" : "Upload outlet image"}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Outlet preview"
                    className="outlet-image-drop__preview"
                  />
                  {isEditMode && (
                    <span className="outlet-image-drop__replace-hint">
                      <Pencil size={14} /> Click to replace
                    </span>
                  )}
                </>
              ) : (
                <span className="outlet-image-drop__placeholder">
                  <Upload size={26} />
                  <span>Click to upload outlet photo</span>
                  <small>JPG · PNG · WEBP</small>
                </span>
              )}
            </div>
          </div>

          {/* Name + Cuisine */}
          <div className="modal-row">
            <label className="field-label">
              Outlet Name *
              <input
                ref={firstFieldRef}
                className={`field-input${fieldErrors.name ? " field-input--error" : ""}`}
                type="text"
                placeholder="e.g. Farfallino Kitchen"
                {...field("name")}
              />
              {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            </label>

            <label className="field-label">
              Cuisine Type *
              <input
                className={`field-input${fieldErrors.cuisineType ? " field-input--error" : ""}`}
                type="text"
                placeholder="e.g. Italian, Nigerian Grill"
                {...field("cuisineType")}
              />
              {fieldErrors.cuisineType && (
                <span className="field-error">{fieldErrors.cuisineType}</span>
              )}
            </label>
          </div>

          {/* Description */}
          <label className="field-label">
            Description
            <textarea
              className="field-input field-input--textarea"
              placeholder="Brief description of this outlet…"
              {...field("description")}
            />
          </label>

          {/* Subaccount code */}
          <label className="field-label">
            Moment Subaccount Code *
            <input
              className={`field-input${fieldErrors.momentSubaccountCode ? " field-input--error" : ""}`}
              type="text"
              placeholder="e.g. MOMENT_FARFALLINO"
              {...field("momentSubaccountCode")}
            />
            {fieldErrors.momentSubaccountCode && (
              <span className="field-error">{fieldErrors.momentSubaccountCode}</span>
            )}
          </label>

          {/* Is Online toggle */}
          <div className="modal-toggle-row">
            <div>
              <strong>Available for orders</strong>
              <p>
                {isEditMode
                  ? "Toggle outlet availability"
                  : "Outlet accepts orders right after onboarding"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isOnline}
              aria-label="Toggle availability"
              className={`outlet-toggle${form.isOnline ? " outlet-toggle--on" : ""}`}
              onClick={() => setForm((p) => ({ ...p, isOnline: !p.isOnline }))}
            />
          </div>

          {/* API error */}
          {error && (
            <p className="modal-error" role="alert">
              {(error as Error).message}
            </p>
          )}

          {/* Actions */}
          <div className="modal__actions">
            <Button tone="quiet" type="button" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button tone="navy" type="submit" disabled={isPending}>
              {isPending
                ? isEditMode
                  ? "Saving…"
                  : "Onboarding…"
                : isEditMode
                  ? "Save Changes"
                  : "Onboard Outlet"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
