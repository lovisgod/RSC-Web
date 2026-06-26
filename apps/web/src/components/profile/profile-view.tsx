"use client";

import { Card } from "@rsc/ui";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useForm } from "react-hook-form";

import { OrdersView } from "@/src/components/orders/orders-view";

const DUMMY_PROFILE = {
  fullName: "Amara Okafor",
  phone: "0803 123 4567",
  email: "amara@example.com",
  defaultAddress: "14B Akin Adesola St, Victoria Island",
};

type ProfileForm = typeof DUMMY_PROFILE;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

const darkInputClass =
  "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-4 text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none";

// ── Profile header card ───────────────────────────────────────────────────────

function ProfileHeader() {
  const [editing, setEditing] = useState(false);

  const { data: profile, isPending } = useQuery<ProfileForm>({
    queryKey: ["profile"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return DUMMY_PROFILE;
    },
  });

  const { register, handleSubmit, reset } = useForm<ProfileForm>({
    values: profile ?? DUMMY_PROFILE,
  });

  function onSave(data: ProfileForm) {
    // TODO: apiClient.updateProfile(data)
    console.log("save profile", data);
    setEditing(false);
  }

  const displayName = profile?.fullName ?? DUMMY_PROFILE.fullName;
  const initials = getInitials(displayName);

  return (
    <div
      className="rounded-2xl p-6 h-full flex flex-col"
      style={{ backgroundColor: "var(--rsc-main)" }}
    >
      {/* Avatar */}
      <div className="flex flex-col items-center mb-5">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3"
          style={{ backgroundColor: "var(--rsc-dark)" }}
        >
          {isPending ? "…" : initials}
        </div>

        {!editing && (
          <>
            <h2 className="text-xl font-bold text-white">{displayName}</h2>
            <p className="text-sm text-white/60 mt-0.5">{profile?.email}</p>
            <p className="text-sm text-white/60">{profile?.phone}</p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--rsc-dark)" }}
            >
              ✏️ Edit Profile
            </button>
          </>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <form onSubmit={handleSubmit(onSave)} className="space-y-3">
          <input
            {...register("fullName")}
            type="text"
            placeholder="Full name"
            className={darkInputClass}
          />
          <input
            {...register("email")}
            type="email"
            placeholder="Email address"
            className={darkInputClass}
          />
          <input
            {...register("phone")}
            type="tel"
            placeholder="Phone number"
            className={darkInputClass}
          />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                reset();
                setEditing(false);
              }}
              className="flex-1 py-3 rounded-full text-sm font-semibold text-white border border-white/30 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#22c55e" }}
            >
              Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Default address card ──────────────────────────────────────────────────────

function DefaultAddressCard() {
  const [address, setAddress] = useState(DUMMY_PROFILE.defaultAddress);

  return (
    <Card>
      <p
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: "var(--rsc-muted)" }}
      >
        Default Delivery Address
      </p>
      <div className="flex gap-2">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter your default address"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none"
        />
        <button
          type="button"
          className="flex-shrink-0 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--rsc-main)" }}
        >
          Set Default
        </button>
      </div>
    </Card>
  );
}

// ── Change password card ──────────────────────────────────────────────────────

function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");

  const fieldClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm placeholder:text-gray-400 focus:border-[var(--rsc-main)] focus:outline-none";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    // TODO: apiClient.changePassword({ currentPassword: currentPw, newPassword: newPw })
    console.log("change password");
    setOpen(false);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Change password</h3>
          <p className="text-sm text-gray-400 mt-0.5">Update your account password.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-semibold hover:underline flex-shrink-0"
          style={{ color: "var(--rsc-main)" }}
        >
          {open ? "Cancel" : "Change"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            type="password"
            placeholder="Current password"
            className={fieldClass}
            required
          />
          <input
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            type="password"
            placeholder="New password"
            className={fieldClass}
            required
          />
          <input
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            type="password"
            placeholder="Confirm new password"
            className={fieldClass}
            required
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--rsc-main)" }}
          >
            Update password
          </button>
        </form>
      )}
    </Card>
  );
}

// ── Delete account card ───────────────────────────────────────────────────────

function DeleteAccountCard() {
  const [confirming, setConfirming] = useState(false);

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
          className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--rsc-danger)" }}
        >
          Delete
        </button>
      </div>

      {confirming && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 space-y-3">
          <p className="text-sm text-red-700 font-medium">Are you sure? This cannot be undone.</p>
          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--rsc-danger)" }}
            >
              Yes, delete my account
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50"
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
