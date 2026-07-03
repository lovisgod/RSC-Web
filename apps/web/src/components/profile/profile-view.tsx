"use client";

import { Card } from "@rsc/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, Loader2, MapPin, MapPinCheck, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { apiClient } from "@/src/lib/api";
import { getMutationErrorMessage } from "@/src/lib/api-error";
import { changePasswordSchema, type ChangePasswordFormData } from "@/src/lib/schemas/auth";
import { profileSchema, type ProfileFormData } from "@/src/lib/schemas/profile";
import { geocodeAddress, reverseGeocode, type GeocodingResult } from "@/src/lib/geocoding";
import { useGeolocation } from "@/src/hooks/use-geolocation";
import { useDeliveryAddresses } from "@/src/hooks/use-delivery-addresses";
import { useAddressStore } from "@/src/stores/address-store";
import { useAuthStore } from "@/src/stores/auth-store";
import { useCartStore } from "@/src/stores/cart-store";
import { PasswordInput } from "@/src/components/shared/password-input";

import { OrdersView } from "@/src/components/orders/orders-view";
import { LucideLogOut } from "lucide-react";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

const darkInputClass =
  "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none";

const darkErrorClass = "mt-1 text-xs text-red-300";

// ── Profile header card ───────────────────────────────────────────────────────

function ProfileHeader() {
  const [editing, setEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const queryClient = useQueryClient();
  const signOut = useAuthStore((s) => s.signOut);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiClient.logout();
    } catch {
      // proceed even if the API call fails
    }
    signOut();
    window.location.replace("/sign-in");
  }

  const { data: profile, isPending } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiClient.getProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    ...(profile
      ? { values: { name: profile.name, email: profile.email, phone: profile.phone } }
      : {}),
  });

  const mutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      apiClient.updateProfile({ name: data.name, email: data.email, phone: data.phone }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile"], updated);
      setEditing(false);
    },
  });

  const displayName = profile?.name ?? "";
  const initials = displayName ? getInitials(displayName) : "…";

  return (
    <div
      className="rounded-2xl p-6 h-full flex flex-col relative"
      style={{ backgroundColor: "var(--rsc-main)" }}
    >
      {/* Logout — mobile only, mirrors side-nav icon */}
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        aria-label="Log out"
        className="md:hidden absolute bottom-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
      >
        {loggingOut ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <LucideLogOut className="w-5 h-5 rotate-180" />
        )}
      </button>
      {/* Avatar */}
      <div className="flex flex-col items-center mb-5">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3"
          style={{ backgroundColor: "var(--rsc-dark)" }}
        >
          {isPending ? <Loader2 className="w-6 h-6 animate-spin opacity-60" /> : initials}
        </div>

        {!editing && (
          <>
            {isPending ? (
              <div className="space-y-2 flex flex-col items-center">
                <div className="h-5 w-36 bg-white/20 rounded animate-pulse" />
                <div className="h-4 w-44 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white">{displayName}</h2>
                <p className="text-sm text-white/60 mt-0.5">{profile?.email}</p>
                <p className="text-sm text-white/60">{profile?.phone}</p>
              </>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={isPending}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--rsc-dark)" }}
            >
              ✏️ Edit Profile
            </button>
          </>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-3">
          <div>
            <input
              {...register("name")}
              type="text"
              placeholder="Full name"
              className={darkInputClass}
            />
            {errors.name && <p className={darkErrorClass}>{errors.name.message}</p>}
          </div>
          <div>
            <input
              {...register("email")}
              type="email"
              placeholder="Email address"
              className={darkInputClass}
            />
            {errors.email && <p className={darkErrorClass}>{errors.email.message}</p>}
          </div>
          <div>
            <input
              {...register("phone")}
              type="tel"
              placeholder="Phone number (e.g. 08032000102)"
              maxLength={14}
              className={darkInputClass}
            />
            {errors.phone && <p className={darkErrorClass}>{errors.phone.message}</p>}
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-300 text-center">
              {getMutationErrorMessage(mutation.error, {})}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                reset();
                mutation.reset();
                setEditing(false);
              }}
              className="flex-1 py-3 rounded-full text-sm font-semibold text-white border border-white/30 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#22c55e" }}
            >
              {mutation.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Default address modal ─────────────────────────────────────────────────────

const addrInputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none";

function DefaultAddressModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const geo = useGeolocation();
  const { data: savedAddresses = [] } = useDeliveryAddresses();

  const [addressText, setAddressText] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geoResult, setGeoResult] = useState<GeocodingResult | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const coords =
    geo.coords ??
    (geoResult ? { latitude: geoResult.latitude, longitude: geoResult.longitude } : null);

  // When GPS is pinned, reverse geocode to fill the address text
  useEffect(() => {
    if (!geo.coords) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setGeoResult(null);
      setGeoError(null);
      setReverseGeocoding(true);
    });

    void reverseGeocode(geo.coords.latitude, geo.coords.longitude)
      .then((result) => {
        if (cancelled) return;
        setReverseGeocoding(false);
        if (result) {
          setGeoResult(result);
          setAddressText(result.displayName.split(",").slice(0, 2).join(", ").trim());
        } else {
          setAddressText("Current location");
        }
      })
      .catch(() => {
        if (!cancelled) setReverseGeocoding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [geo.coords]);

  function handleAddressChange(value: string) {
    setAddressText(value);
    setGeoResult(null);
    setGeoError(null);
    if (geo.coords) geo.reset();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 5) return;

    debounceRef.current = setTimeout(() => {
      setGeocoding(true);
      void geocodeAddress(value.trim())
        .then((result) => {
          setGeocoding(false);
          if (result) setGeoResult(result);
          else setGeoError("Address not found. Try a more specific address.");
        })
        .catch(() => {
          setGeocoding(false);
          setGeoError("Geocoding failed. Please try again.");
        });
    }, 1500);
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!coords) throw new Error("Coordinates required");
      const isAlreadyDefault = savedAddresses.some(
        (a) =>
          a.isDefault &&
          Math.abs(a.latitude - coords.latitude) < 0.0001 &&
          Math.abs(a.longitude - coords.longitude) < 0.0001,
      );
      if (isAlreadyDefault) return Promise.resolve(savedAddresses.find((a) => a.isDefault)!);
      return apiClient.createDeliveryAddress({
        label: geoResult?.label || (geo.coords ? "My Location" : addressText.slice(0, 30)),
        addressLine: addressText || geoResult?.addressLine || "My Location",
        city: geoResult?.city || "Lagos",
        state: geoResult?.state || "Lagos State",
        latitude: coords.latitude,
        longitude: coords.longitude,
        isDefault: true,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["delivery-addresses"] });
      setTimeout(onClose, 2000);
    },
  });

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !mutation.isPending) onClose();
  }

  const busy = geocoding || geo.locating || reverseGeocoding;
  const canSubmit = !!coords && !busy && !mutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" style={{ color: "var(--rsc-main)" }} />
            <h2 className="text-base font-bold text-gray-900">Set Default Address</h2>
          </div>
          {!mutation.isPending && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-3">
          {/* Saving */}
          {mutation.isPending && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-12 h-12 animate-spin" style={{ color: "var(--rsc-main)" }} />
              <p className="text-sm font-medium text-gray-600">Saving your address…</p>
            </div>
          )}

          {/* Success */}
          {mutation.isSuccess && (
            <div className="flex flex-col items-center gap-3 py-8">
              <MapPinCheck className="w-14 h-14 text-green-500" />
              <p className="text-base font-bold text-gray-900">Default address saved!</p>
              <p className="text-sm text-gray-400 text-center">
                It will now appear as your quick-fill option at checkout.
              </p>
            </div>
          )}

          {/* Form */}
          {!mutation.isPending && !mutation.isSuccess && (
            <>
              {/* Address text input */}
              <div className="relative">
                <input
                  value={addressText}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="Type your delivery address…"
                  className={addrInputClass}
                />
                {(geocoding || reverseGeocoding) && (
                  <Loader2 className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-gray-400" />
                )}
                {geoResult && !geocoding && (
                  <CheckCircle2 className="absolute right-3 top-3.5 w-4 h-4 text-green-500" />
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <span className="flex-1 h-px bg-gray-100" />
                <span>or</span>
                <span className="flex-1 h-px bg-gray-100" />
              </div>

              {/* GPS pin button */}
              <button
                type="button"
                onClick={geo.coords ? geo.reset : geo.detect}
                disabled={geo.locating || reverseGeocoding}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "var(--rsc-main)", color: "var(--rsc-main)" }}
              >
                {geo.locating || reverseGeocoding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {geo.locating ? "Getting location…" : "Looking up address…"}
                  </>
                ) : geo.coords ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">Location pinned — tap to clear</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    Pin My Current Location
                  </>
                )}
              </button>

              {/* Coordinate confirmation */}
              {coords && !busy && (
                <p className="text-xs text-center text-green-600 font-medium">
                  ✓ Coordinates ready ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)})
                </p>
              )}

              {/* Errors */}
              {(geoError ?? geo.error) && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{geoError ?? geo.error}</p>
                </div>
              )}
              {mutation.isError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">
                    {getMutationErrorMessage(mutation.error, {})}
                  </p>
                </div>
              )}

              {!coords && !busy && !(geoError ?? geo.error) && (
                <p className="text-xs text-center text-gray-400">
                  Type an address or pin your location to continue
                </p>
              )}

              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={!canSubmit}
                className="w-full py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--rsc-main)" }}
              >
                Set as Default Address
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Default address card ──────────────────────────────────────────────────────

function DefaultAddressCard() {
  const [open, setOpen] = useState(false);
  const { data: savedAddresses = [] } = useDeliveryAddresses();
  const defaultAddr = savedAddresses.find((a) => a.isDefault) ?? null;

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">Default Delivery Address</h3>
            {defaultAddr ? (
              <p className="text-sm text-gray-500 mt-0.5 truncate">
                {defaultAddr.addressLine}, {defaultAddr.city}
              </p>
            ) : (
              <p className="text-sm text-gray-400 mt-0.5">No default address set.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-sm font-semibold hover:underline flex-shrink-0"
            style={{ color: "var(--rsc-main)" }}
          >
            {defaultAddr ? "Change" : "Set Address"}
          </button>
        </div>
      </Card>

      {open && <DefaultAddressModal onClose={() => setOpen(false)} />}
    </>
  );
}

// ── Change password modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({ resolver: zodResolver(changePasswordSchema) });

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordFormData) =>
      apiClient.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      reset();
      setTimeout(onClose, 2500);
    },
  });

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !mutation.isPending) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" style={{ color: "var(--rsc-main)" }} />
            <h2 className="text-base font-bold text-gray-900">Change Password</h2>
          </div>
          {!mutation.isPending && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Pending */}
          {mutation.isPending && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-12 h-12 animate-spin" style={{ color: "var(--rsc-main)" }} />
              <p className="text-sm font-medium text-gray-600">Updating your password…</p>
            </div>
          )}

          {/* Success */}
          {mutation.isSuccess && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
              <p className="text-base font-bold text-gray-900">Password updated!</p>
              <p className="text-sm text-gray-400 text-center">
                Your password has been changed successfully.
              </p>
            </div>
          )}

          {/* Form — idle or after error */}
          {!mutation.isPending && !mutation.isSuccess && (
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <div>
                <PasswordInput {...register("currentPassword")} placeholder="Current password" />
                {errors.currentPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.currentPassword.message}</p>
                )}
              </div>
              <div>
                <PasswordInput {...register("newPassword")} placeholder="New password" />
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
                )}
              </div>
              <div>
                <PasswordInput
                  {...register("confirmNewPassword")}
                  placeholder="Confirm new password"
                />
                {errors.confirmNewPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.confirmNewPassword.message}</p>
                )}
              </div>

              {mutation.isError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">
                    {getMutationErrorMessage(mutation.error, {
                      401: "Current password is incorrect.",
                    })}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--rsc-main)" }}
              >
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Change password card ──────────────────────────────────────────────────────

function ChangePasswordCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Change password</h3>
            <p className="text-sm text-gray-400 mt-0.5">Update your account password.</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-sm font-semibold hover:underline flex-shrink-0"
            style={{ color: "var(--rsc-main)" }}
          >
            Change
          </button>
        </div>
      </Card>

      {open && <ChangePasswordModal onClose={() => setOpen(false)} />}
    </>
  );
}

// ── Delete account card ───────────────────────────────────────────────────────

function DeleteAccountCard() {
  const [confirming, setConfirming] = useState(false);
  const signOut = useAuthStore((s) => s.signOut);
  const clearCart = useCartStore((s) => s.clear);
  const clearAddress = useAddressStore((s) => s.clear);

  const mutation = useMutation({
    mutationFn: () => apiClient.deleteAccount(),
    onSuccess: () => {
      clearCart();
      clearAddress();
      signOut();
      window.location.replace("/sign-in");
    },
  });

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Delete account</h3>
          <p className="text-sm text-gray-400 mt-0.5">Permanently remove your account and data.</p>
        </div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={confirming}
          className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: "var(--rsc-danger)" }}
        >
          Delete
        </button>
      </div>

      {confirming && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 space-y-3">
          <p className="text-sm text-red-700 font-medium">Are you sure? This cannot be undone.</p>

          {mutation.isError && (
            <p className="text-xs text-red-600">{getMutationErrorMessage(mutation.error, {})}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--rsc-danger)" }}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Yes, delete my account"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                mutation.reset();
              }}
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

// ── Main view ─────────────────────────────────────────────────────────────────

export function ProfileView() {
  return (
    <div className="w-full space-y-6">
      {/* 2-column grid: profile header | settings cards */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Left — blue profile header */}
        <div className="w-full md:w-1/2 md:sticky md:top-20">
          <ProfileHeader />
        </div>

        {/* Right — settings cards stacked */}
        <div className="w-full md:w-1/2 space-y-4">
          <DefaultAddressCard />
          <ChangePasswordCard />
          <DeleteAccountCard />
        </div>
      </div>

      {/* Order history — full width below, with Active / Completed toggle */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Order History</h2>
        <OrdersView />
      </div>
    </div>
  );
}
