import { ChangePasswordPanel } from "@rsc/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  ShieldCheck,
  X,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ImageUp,
} from "lucide-react";
import { type ChangeEvent, useState } from "react";

import { useChangePassword } from "../hooks/use-change-password";
import { useAuth } from "../hooks/use-auth";
import { useOutletInfo } from "../hooks/use-outlet-info";
import { uploadOutletBanner } from "../lib/api";
import { outletAdminKeys } from "../lib/query-keys";

export function SettingsPage() {
  const { user } = useAuth();
  const outletId = user?.outletId || "";

  const { data: outlet, isLoading: isLoadingOutlet } = useOutletInfo(outletId);
  const queryClient = useQueryClient();
  const bannerUpload = useMutation({
    mutationFn: (file: File) => uploadOutletBanner(outletId, file),
    onSuccess: (updatedOutlet) => {
      queryClient.setQueryData(outletAdminKeys.outlet.detail(outletId), updatedOutlet);
    },
  });

  const changePassword = useChangePassword();
  const [passwordResetSignal, setPasswordResetSignal] = useState(0);

  function handleBannerUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) bannerUpload.mutate(file);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--rsc-brand)]">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Manage the security of your outlet-admin account.
        </p>
      </div>

      <ChangePasswordPanel
        shieldIcon={<ShieldCheck size={21} aria-hidden="true" />}
        keyIcon={<KeyRound size={17} aria-hidden="true" />}
        closeIcon={<X size={18} aria-hidden="true" />}
        showPasswordIcon={<Eye size={17} aria-hidden="true" />}
        hidePasswordIcon={<EyeOff size={17} aria-hidden="true" />}
        isSubmitting={changePassword.isPending}
        submitError={changePassword.isError ? changePassword.error.message : undefined}
        resetSignal={passwordResetSignal}
        idleDescription="Changing your password helps protect outlet operations and order data from unauthorized access."
        onResetError={() => changePassword.reset()}
        onSubmit={(input) =>
          changePassword.mutate(input, {
            onSuccess: () => setPasswordResetSignal((current) => current + 1),
          })
        }
      />

      {outletId && (
        <section className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div
            className="flex min-h-48 items-end justify-end bg-slate-100 bg-cover bg-center p-4"
            style={
              outlet?.bannerUrl ? { backgroundImage: `url("${outlet.bannerUrl}")` } : undefined
            }
          >
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm">
              <ImageUp size={17} aria-hidden="true" />
              {bannerUpload.isPending ? "Uploading..." : "Change banner"}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={bannerUpload.isPending}
                onChange={handleBannerUpload}
              />
            </label>
          </div>
          <div className="border-t border-slate-100 p-5">
            <h2 className="text-base font-bold text-slate-900">Outlet banner</h2>
            <p className="mt-1 text-sm text-slate-500">
              This image appears at the top of the customer outlet page.
            </p>
            {bannerUpload.isError && (
              <p className="mt-2 text-sm font-semibold text-red-600" role="alert">
                {bannerUpload.error.message}
              </p>
            )}
          </div>
        </section>
      )}

      {outletId && (
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--rsc-main)_10%,white)] text-[var(--rsc-main)]">
                <Landmark size={21} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Settlement Account</h2>
                <p className="mt-1 text-sm text-slate-500">
                  View the settlement configuration assigned to this outlet by DineOut NG Admin.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {isLoadingOutlet ? (
              <p className="text-sm text-slate-500">Loading settlement details...</p>
            ) : outlet?.settlementSubaccountCode ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-600 mt-0.5">
                    <CheckCircle2 size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900">Settlements are active</h3>
                    <p className="mt-1 text-xs text-emerald-700 leading-5">
                      This outlet is linked to settlement subaccount:{" "}
                      <code className="bg-emerald-100/80 px-1.5 py-0.5 rounded font-mono text-emerald-950 font-semibold">
                        {outlet.settlementSubaccountCode}
                      </code>
                    </p>
                    <p className="mt-2 text-xs leading-5 text-emerald-700/80">
                      Settlement details are managed centrally by DineOut NG Admin.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 mt-0.5">
                    <AlertCircle size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">Settlement setup pending</h3>
                    <p className="mt-1 text-xs text-amber-700 leading-5">
                      DineOut NG Admin has not linked a settlement subaccount to this outlet yet.
                      The outlet will remain hidden from customers until the settlement code is
                      added.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
