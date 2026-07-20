"use client";

import { Card } from "@rsc/ui";
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
  UserProfile,
} from "@rsc/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  CheckCircle2,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  MapPinCheck,
  Pencil,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { apiClient } from "@/src/lib/api";
import { getMutationErrorMessage } from "@/src/lib/api-error";
import { changePasswordSchema, type ChangePasswordFormData } from "@/src/lib/schemas/auth";
import { profileSchema, type ProfileFormData } from "@/src/lib/schemas/profile";
import { reverseGeocode, type GeocodingResult } from "@/src/lib/geocoding";
import { useGeolocation } from "@/src/hooks/use-geolocation";
import { useDeliveryAddresses } from "@/src/hooks/use-delivery-addresses";
import { useGooglePlacesAutocomplete } from "@/src/hooks/use-google-places-autocomplete";
import { useAddressStore } from "@/src/stores/address-store";
import { useAuthStore } from "@/src/stores/auth-store";
import { useCartStore } from "@/src/stores/cart-store";
import { PasswordInput } from "@/src/components/shared/password-input";
import type { GooglePlaceSuggestion } from "@/src/lib/google-places";

import { OrderDetailsModal } from "@/src/components/orders/order-card";
import { OrdersView } from "@/src/components/orders/orders-view";
import type { Order } from "@/src/lib/data/orders";
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

const darkInputClass =
  "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none";

const darkErrorClass = "mt-1 text-xs text-red-300";

const notificationPreferencesQueryKey = ["notifications", "preferences"] as const;

// ── Profile header card ───────────────────────────────────────────────────────

interface ProfileChangeVerificationModalProps {
  profile: UserProfile;
  initialSeconds: number | null;
  onVerified: (profile: UserProfile) => void;
  onClose: () => void;
}

function ProfileChangeVerificationModal({
  profile,
  initialSeconds,
  onVerified,
  onClose,
}: ProfileChangeVerificationModalProps) {
  const [code, setCode] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const pending = profile.pendingVerificationChannels;

  useEffect(() => {
    if (initialSeconds === null) return;

    const timer = window.setInterval(() => {
      setSecondsRemaining((seconds) => (seconds === null ? null : Math.max(0, seconds - 1)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [initialSeconds]);

  const mutation = useMutation({
    mutationFn: () => apiClient.verifyProfileChange({ code }),
    onSuccess: (updated) => {
      onVerified(updated);
      setCode("");

      if (updated.pendingVerificationChannels.email || updated.pendingVerificationChannels.phone) {
        setSuccessMessage("One change is verified. Enter the code for the remaining change.");
      } else {
        onClose();
      }
    },
  });

  const destination =
    pending.email && pending.phone
      ? "your new email address and phone number"
      : pending.email
        ? "your new email address"
        : "your new phone number";
  const formattedTime =
    secondsRemaining === null
      ? null
      : `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}`;

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !mutation.isPending) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-verification-title"
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 id="profile-verification-title" className="font-bold text-gray-900">
              Verify your change
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">Enter the six-digit code we sent.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            aria-label="Close verification"
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4 p-6"
        >
          <p className="text-sm leading-6 text-gray-600">
            Use the code sent to <span className="font-semibold text-gray-900">{destination}</span>.
            If both changed, either code can be verified first.
          </p>

          <div>
            <label htmlFor="profile-change-code" className="sr-only">
              Six-digit verification code
            </label>
            <input
              id="profile-change-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setSuccessMessage(null);
                mutation.reset();
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              autoFocus
              placeholder="000000"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.35em] text-gray-900 outline-none transition focus:border-[var(--rsc-main)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--rsc-main)_15%,transparent)]"
            />
          </div>

          {formattedTime && secondsRemaining !== 0 && (
            <p className="text-center text-xs text-gray-400">Code expires in {formattedTime}</p>
          )}
          {secondsRemaining === 0 && (
            <p className="text-center text-xs font-medium text-amber-600">
              This code may have expired. Close this window and save your details again for a new
              code.
            </p>
          )}
          {successMessage && (
            <p role="status" className="text-center text-xs font-medium text-green-600">
              {successMessage}
            </p>
          )}
          {mutation.isError && (
            <p role="alert" className="text-center text-xs text-red-600">
              {getMutationErrorMessage(mutation.error, {
                400: "There is no matching pending profile change.",
                401: "That code is incorrect, expired, or already used.",
              })}
            </p>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--rsc-main)" }}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {mutation.isPending ? "Verifying…" : "Verify change"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProfileHeader() {
  const [editing, setEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = useState<number | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const signOut = useAuthStore((s) => s.signOut);
  const releaseCartOwner = useCartStore((s) => s.releaseActiveSessionOwner);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiClient.logout();
    } catch {
      // proceed even if the API call fails
    }
    releaseCartOwner();
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

      if (updated.pendingVerificationChannels.email || updated.pendingVerificationChannels.phone) {
        setOtpExpiresInSeconds(updated.otpExpiresInSeconds);
        setVerificationOpen(true);
      } else {
        setOtpExpiresInSeconds(null);
      }
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => apiClient.uploadAvatar(file),
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile"], updated);
      setAvatarError(null);
    },
    onError: (error) => {
      setAvatarError(getMutationErrorMessage(error, {}));
    },
    onSettled: () => {
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    },
  });

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

    if (!supportedTypes.has(file.type)) {
      setAvatarError("Choose a JPEG, PNG, WEBP, or GIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Choose an image smaller than 5MB.");
      event.target.value = "";
      return;
    }

    setAvatarError(null);
    avatarMutation.mutate(file);
  }

  const displayName = profile?.name ?? "";
  const initials = displayName ? getInitials(displayName) : "…";
  const hasPendingProfileChange = Boolean(
    profile?.pendingVerificationChannels.email || profile?.pendingVerificationChannels.phone,
  );

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
          <LogOut className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
      {/* Avatar */}
      <div className="flex flex-col items-center mb-5">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={isPending || avatarMutation.isPending}
          aria-label={profile?.avatarUrl ? "Change profile image" : "Add profile image"}
          className="group/avatar relative mb-3 h-20 w-20 overflow-hidden rounded-full text-2xl font-bold text-white ring-2 ring-white/20 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 disabled:cursor-wait"
          style={{
            backgroundColor: "var(--rsc-dark)",
            ...(profile?.avatarUrl
              ? {
                  backgroundImage: `url("${profile.avatarUrl}")`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }
              : {}),
          }}
        >
          <span className="flex h-full w-full items-center justify-center">
            {isPending || avatarMutation.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin drop-shadow" />
            ) : (
              <>
                {!profile?.avatarUrl && initials}
                <span
                  className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform group-hover/avatar:scale-105"
                  style={{ color: "var(--rsc-main)" }}
                  aria-hidden="true"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </span>
              </>
            )}
          </span>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleAvatarChange}
          className="sr-only"
          tabIndex={-1}
        />
        {avatarError && (
          <p role="alert" className="mb-3 max-w-64 text-center text-xs text-red-300">
            {avatarError}
          </p>
        )}

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
                {hasPendingProfileChange && (
                  <button
                    type="button"
                    onClick={() => setVerificationOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Verify pending change
                  </button>
                )}
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

      {verificationOpen && profile && (
        <ProfileChangeVerificationModal
          profile={profile}
          initialSeconds={otpExpiresInSeconds}
          onVerified={(updated) => queryClient.setQueryData(["profile"], updated)}
          onClose={() => setVerificationOpen(false)}
        />
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
  const [geoResult, setGeoResult] = useState<GeocodingResult | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const places = useGooglePlacesAutocomplete(addressText, !geo.coords);

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
  }

  async function selectGoogleSuggestion(suggestion: GooglePlaceSuggestion) {
    setGeoError(null);
    try {
      const result = await places.selectSuggestion(suggestion);
      if (!result) {
        setGeoError("That address has no exact coordinates. Pick another suggestion.");
        return;
      }
      setGeoResult(result);
      setAddressText(result.displayName || result.addressLine);
    } catch {
      setGeoError("Could not load this address. Please pick another suggestion.");
    }
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

  const busy = places.isLoading || geo.locating || reverseGeocoding;
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
                {(places.isLoading || reverseGeocoding) && (
                  <Loader2 className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-gray-400" />
                )}
                {geoResult && !places.isLoading && (
                  <CheckCircle2 className="absolute right-3 top-3.5 w-4 h-4 text-green-500" />
                )}
                {!geo.coords && places.suggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                    {places.suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => void selectGoogleSuggestion(suggestion)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {suggestion.description}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {suggestion.provider === "google"
                              ? "Google exact address"
                              : "Address match"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
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
              {!places.isConfigured && (
                <p className="text-xs text-center text-amber-600">
                  Google Places is not configured yet.
                </p>
              )}
              {places.error && !geoError && (
                <p className="text-xs text-center text-red-500">{places.error}</p>
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

type EditableNotificationPreference = "promotions" | "discounts" | "seasonalOffers";

const notificationPreferenceLabels: Record<
  EditableNotificationPreference,
  { title: string; description: string }
> = {
  promotions: {
    title: "Promotions",
    description: "Receive general promo updates and offer announcements.",
  },
  discounts: {
    title: "Discounts",
    description: "Get notified when discount offers are available.",
  },
  seasonalOffers: {
    title: "Seasonal offers",
    description: "Hear about festive, holiday, and special-period offers.",
  },
};

function getPreferencePatch(
  preferences: NotificationPreferences,
  preference: EditableNotificationPreference,
  enabled: boolean,
): UpdateNotificationPreferencesInput {
  return {
    promotions: preferences.promotions,
    discounts: preferences.discounts,
    seasonalOffers: preferences.seasonalOffers,
    orderStatus: true,
    [preference]: enabled,
  };
}

function NotificationSwitch({
  checked,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className="relative h-7 w-12 flex-shrink-0 rounded-full p-1 transition disabled:cursor-not-allowed disabled:opacity-60"
      style={{ backgroundColor: checked ? "var(--rsc-main)" : "#D1D5DB" }}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function NotificationPreferencesCard() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: notificationPreferencesQueryKey,
    queryFn: () => apiClient.getNotificationPreferences(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) =>
      apiClient.updateNotificationPreferences(input),
    onSuccess: (preferences) => {
      queryClient.setQueryData<NotificationPreferences>(
        notificationPreferencesQueryKey,
        preferences,
      );
    },
  });

  const preferences = preferencesQuery.data;
  const controlsDisabled = preferencesQuery.isPending || mutation.isPending;

  const updatePreference = (preference: EditableNotificationPreference, enabled: boolean) => {
    if (!preferences) return;
    mutation.mutate(getPreferencePatch(preferences, preference, enabled));
  };

  return (
    <Card>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="notification-preferences-panel"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span>
          <span className="block font-semibold text-gray-900">Notification controls</span>
          <span className="mt-0.5 block text-sm text-gray-400">
            Choose which offers and updates you want to receive.
          </span>
        </span>

        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div id="notification-preferences-panel" className="mt-5 border-t border-gray-100 pt-4">
          {preferencesQuery.isPending ? (
            <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading notification preferences…
            </div>
          ) : preferencesQuery.isError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-700">
                Could not load notification preferences.
              </p>
              <button
                type="button"
                onClick={() => preferencesQuery.refetch()}
                className="mt-2 text-sm font-semibold text-red-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : preferences ? (
            <div className="space-y-3">
              {mutation.isError && (
                <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {getMutationErrorMessage(mutation.error)}
                </p>
              )}

              {(Object.keys(notificationPreferenceLabels) as EditableNotificationPreference[]).map(
                (preference) => {
                  const content = notificationPreferenceLabels[preference];
                  const checked = preferences[preference];

                  return (
                    <div
                      key={preference}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{content.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-gray-500">
                          {content.description}
                        </p>
                      </div>
                      <NotificationSwitch
                        checked={checked}
                        disabled={controlsDisabled}
                        label={`${checked ? "Disable" : "Enable"} ${content.title}`}
                        onToggle={() => updatePreference(preference, !checked)}
                      />
                    </div>
                  );
                },
              )}

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Order updates</p>
                  <p className="mt-0.5 text-xs leading-5 text-gray-500">
                    Always on so you can receive payment, preparation, pickup, and delivery updates.
                  </p>
                </div>
                <NotificationSwitch
                  checked={preferences.orderStatus}
                  disabled
                  label="Order updates"
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}

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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  return (
    <div className="relative w-full space-y-6">
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      {/* 2-column grid: profile header | settings cards */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Left — blue profile header */}
        <div className="w-full md:w-1/2 md:sticky md:top-20">
          <ProfileHeader />
        </div>

        {/* Right — settings cards stacked */}
        <div className="w-full md:w-1/2 space-y-4">
          <DefaultAddressCard />
          <NotificationPreferencesCard />
          <ChangePasswordCard />
          <DeleteAccountCard />
        </div>
      </div>

      {/* Order history — full width below, with Active / Completed toggle */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Order History</h2>
        <OrdersView onViewDetails={setSelectedOrder} />
      </div>
    </div>
  );
}
