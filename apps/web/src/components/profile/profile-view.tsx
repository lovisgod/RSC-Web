"use client";

import { Button, Card } from "@rsc/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { inputClass } from "@/src/lib/form-styles";

const DUMMY_PROFILE = {
  fullName: "Amara Okafor",
  phone: "+234 801 234 5678",
  email: "amara@example.com",
  defaultAddress: "",
};

type ProfileForm = typeof DUMMY_PROFILE;

export function ProfileView() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: profile, isPending } = useQuery<ProfileForm>({
    queryKey: ["profile"],
    queryFn: async () => {
      // TODO: replace with apiClient.getProfile()
      await new Promise((r) => setTimeout(r, 300));
      return DUMMY_PROFILE;
    },
  });

  const { register, handleSubmit } = useForm<ProfileForm>({
    values: profile ?? DUMMY_PROFILE,
  });

  function onSave(data: ProfileForm) {
    // TODO: replace with apiClient.updateProfile(data)
    console.log("save profile", data);
  }

  if (isPending) {
    return <p className="text-sm text-gray-400 py-8">Loading profile…</p>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-lg">
      {/* Profile info */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile</h2>
        <form onSubmit={handleSubmit(onSave)} className="space-y-3">
          <input
            {...register("fullName")}
            type="text"
            placeholder="Full name"
            className={inputClass}
          />
          <input {...register("phone")} type="tel" placeholder="Phone" className={inputClass} />
          <input {...register("email")} type="email" placeholder="Email" className={inputClass} />
          <Button tone="primary" type="submit">
            Save / continue
          </Button>
        </form>
      </Card>

      {/* Default address */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Default address</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {profile?.defaultAddress || "No default address saved yet."}
            </p>
          </div>
          <Button tone="quiet">{profile?.defaultAddress ? "Edit" : "Add"}</Button>
        </div>
      </Card>

      {/* Change password */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Password</h3>
            <p className="text-sm text-gray-400 mt-0.5">Update your account password.</p>
          </div>
          <Button tone="quiet">Change</Button>
        </div>
      </Card>

      {/* Delete account */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Delete account</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              Permanently remove your account and all data.
            </p>
          </div>
          <Button tone="danger" onClick={() => setShowDeleteConfirm(true)}>
            Delete
          </Button>
        </div>

        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 space-y-3">
            <p className="text-sm text-red-700 font-medium">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button tone="danger">Yes, delete my account</Button>
              <Button tone="quiet" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
