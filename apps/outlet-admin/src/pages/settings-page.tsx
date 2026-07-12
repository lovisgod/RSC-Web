import { Button } from "@rsc/ui";
import { KeyRound, ShieldCheck, X, Landmark, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, type FormEvent, useEffect } from "react";

import { PasswordInput } from "../components/password-input";
import { useChangePassword } from "../hooks/use-change-password";
import { useAuth } from "../hooks/use-auth";
import { useOutletInfo } from "../hooks/use-outlet-info";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBanks, provisionSubaccount, resolveBankAccount } from "../lib/api";
import { toastBus } from "../lib/toast-bus";
import { outletAdminKeys } from "../lib/query-keys";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type PasswordErrors = Partial<Record<keyof PasswordForm, string>>;

const EMPTY_FORM: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const outletId = user?.outletId || "";

  const { data: outlet, isLoading: isLoadingOutlet } = useOutletInfo(outletId);
  const { data: banks } = useQuery({
    queryKey: ["banks"],
    queryFn: listBanks,
    enabled: !!outletId,
  });

  const [bankForm, setBankForm] = useState({
    businessName: "",
    bankCode: "",
    accountNumber: "",
  });
  const [bankErrors, setBankErrors] = useState<{
    businessName?: string;
    bankCode?: string;
    accountNumber?: string;
  }>({});
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [resolvedAccountName, setResolvedAccountName] = useState("");
  const [resolvingName, setResolvingName] = useState(false);
  const [resolveError, setResolveError] = useState("");

  useEffect(() => {
    const isAccountNumberValid = /^\d{10}$/.test(bankForm.accountNumber);
    if (!bankForm.bankCode || !isAccountNumberValid) {
      Promise.resolve().then(() => {
        setResolvedAccountName("");
        setResolveError("");
      });
      return;
    }

    let active = true;
    const delayDebounce = setTimeout(async () => {
      setResolvingName(true);
      setResolvedAccountName("");
      setResolveError("");
      try {
        const res = await resolveBankAccount(bankForm.accountNumber, bankForm.bankCode);
        if (active) {
          setResolvedAccountName(res.accountName);
          setBankForm((current) => ({
            ...current,
            businessName: res.accountName,
          }));
        }
      } catch (err) {
        if (active) {
          setResolveError((err as Error).message);
        }
      } finally {
        if (active) {
          setResolvingName(false);
        }
      }
    }, 500);

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [bankForm.bankCode, bankForm.accountNumber]);

  const provisionMutation = useMutation({
    mutationFn: () => {
      const finalBusinessName =
        bankForm.businessName.trim() || (outlet?.name ? `${outlet.name} Settlement` : "");
      return provisionSubaccount(outletId, {
        ...bankForm,
        businessName: finalBusinessName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outletAdminKeys.outlet.detail(outletId) });
      toastBus.emit("Bank account registered successfully!", "success");
      setIsEditingBank(false);
    },
    onError: (err: Error) => {
      toastBus.emit(err.message, "error");
    },
  });

  function updateBankField(field: keyof typeof bankForm, value: string) {
    setBankForm((current) => ({ ...current, [field]: value }));
    setBankErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validateBank(): boolean {
    const nextErrors: typeof bankErrors = {};
    const finalBusinessName =
      bankForm.businessName.trim() || (outlet?.name ? `${outlet.name} Settlement` : "");
    if (!finalBusinessName) {
      nextErrors.businessName = "Business name is required";
    }
    if (!bankForm.bankCode) {
      nextErrors.bankCode = "Bank selection is required";
    }
    if (!/^\d{10}$/.test(bankForm.accountNumber)) {
      nextErrors.accountNumber = "Account number must be exactly 10 digits";
    }
    setBankErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleBankSubmit() {
    if (!validateBank()) return;
    provisionMutation.mutate();
  }

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<PasswordForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const changePassword = useChangePassword();

  function updateField(field: keyof PasswordForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (changePassword.isError) changePassword.reset();
  }

  function validate(): boolean {
    const nextErrors: PasswordErrors = {};
    if (!form.currentPassword) {
      nextErrors.currentPassword = "Current password is required";
    }
    if (form.newPassword.length < 8) {
      nextErrors.newPassword = "New password must be at least 8 characters";
    } else if (form.newPassword.length > 128) {
      nextErrors.newPassword = "New password must be 128 characters or fewer";
    }
    if (!form.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your new password";
    } else if (form.confirmPassword !== form.newPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    changePassword.mutate(
      {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          setErrors({});
          setIsEditing(false);
        },
      },
    );
  }

  function handleCancel() {
    if (changePassword.isPending) return;
    setForm(EMPTY_FORM);
    setErrors({});
    changePassword.reset();
    setIsEditing(false);
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--rsc-main)_10%,white)] text-[var(--rsc-main)]">
              <ShieldCheck size={21} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Password security</h2>
              <p className="mt-1 text-sm text-slate-500">
                Use a strong password that you do not use elsewhere.
              </p>
            </div>
          </div>

          {!isEditing && (
            <Button
              tone="navy"
              type="button"
              className="shrink-0 gap-2"
              onClick={() => setIsEditing(true)}
            >
              <KeyRound size={17} aria-hidden="true" />
              Change password
            </Button>
          )}
        </div>

        {isEditing ? (
          <form className="space-y-5 p-5 sm:p-6" onSubmit={handleSubmit} noValidate>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Set a new password</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Your new password must contain at least 8 characters.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                disabled={changePassword.isPending}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rsc-main)] disabled:opacity-50"
                aria-label="Cancel password change"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <PasswordInput
                  id="current-password"
                  label="Current password"
                  value={form.currentPassword}
                  onChange={(event) => updateField("currentPassword", event.target.value)}
                  error={errors.currentPassword}
                  autoComplete="current-password"
                  disabled={changePassword.isPending}
                />
              </div>
              <PasswordInput
                id="new-password"
                label="New password"
                value={form.newPassword}
                onChange={(event) => updateField("newPassword", event.target.value)}
                error={errors.newPassword}
                autoComplete="new-password"
                disabled={changePassword.isPending}
              />
              <PasswordInput
                id="confirm-password"
                label="Confirm new password"
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                error={errors.confirmPassword}
                autoComplete="new-password"
                disabled={changePassword.isPending}
              />
            </div>

            {changePassword.isError && (
              <p
                className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {changePassword.error.message}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Button
                tone="quiet"
                type="button"
                onClick={handleCancel}
                disabled={changePassword.isPending}
              >
                Cancel
              </Button>
              <Button tone="navy" type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Changing password…" : "Update password"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-5 sm:p-6">
            <p className="text-sm leading-6 text-slate-500">
              Changing your password helps protect outlet operations and order data from
              unauthorized access.
            </p>
          </div>
        )}
      </section>

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
                  Register your bank details to automatically receive payments from unified customer
                  carts.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {isLoadingOutlet ? (
              <p className="text-sm text-slate-500">Loading settlement details...</p>
            ) : outlet?.settlementSubaccountCode && !isEditingBank ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-600 mt-0.5">
                    <CheckCircle2 size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900">Settlements are active</h3>
                    <p className="mt-1 text-xs text-emerald-700 leading-5">
                      Your payout bank account is linked to settlement subaccount:{" "}
                      <code className="bg-emerald-100/80 px-1.5 py-0.5 rounded font-mono text-emerald-950 font-semibold">
                        {outlet.settlementSubaccountCode}
                      </code>
                    </p>
                    {/* <p className="mt-2 text-xs text-slate-500 leading-5">
                      Settlements for orders from this outlet will be paid out net of 10% platform
                      commission.
                    </p> */}
                    <div className="mt-3">
                      <Button tone="quiet" type="button" onClick={() => setIsEditingBank(true)}>
                        Change Settlement Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleBankSubmit();
                }}
              >
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-600 mt-0.5">
                      <AlertCircle size={18} />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-amber-900">
                        Missing settlement details
                      </h3>
                      <p className="mt-1 text-xs text-amber-700 leading-5">
                        Please register your bank account below to enable split payments and
                        automatic payouts.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      className="block text-sm font-bold text-slate-700 mb-1"
                      htmlFor="bank-business-name"
                    >
                      Registered Business / Account Name
                    </label>
                    <input
                      id="bank-business-name"
                      type="text"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--rsc-main)] focus:outline-none"
                      placeholder="e.g. Farfallino Lekki Settlement"
                      value={
                        bankForm.businessName || (outlet?.name ? `${outlet.name} Settlement` : "")
                      }
                      onChange={(e) => updateBankField("businessName", e.target.value)}
                      disabled={provisionMutation.isPending}
                    />
                    {bankErrors.businessName && (
                      <span className="text-xs text-red-600 mt-1 block">
                        {bankErrors.businessName}
                      </span>
                    )}
                  </div>

                  <div>
                    <label
                      className="block text-sm font-bold text-slate-700 mb-1"
                      htmlFor="bank-select"
                    >
                      Select Bank
                    </label>
                    <select
                      id="bank-select"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[var(--rsc-main)] focus:outline-none"
                      value={bankForm.bankCode}
                      onChange={(e) => updateBankField("bankCode", e.target.value)}
                      disabled={provisionMutation.isPending}
                    >
                      <option value="">-- Choose your bank --</option>
                      {banks?.map((bank) => (
                        <option key={bank.code} value={bank.code}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                    {bankErrors.bankCode && (
                      <span className="text-xs text-red-600 mt-1 block">{bankErrors.bankCode}</span>
                    )}
                  </div>

                  <div>
                    <label
                      className="block text-sm font-bold text-slate-700 mb-1"
                      htmlFor="bank-account-number"
                    >
                      Account Number (10 digits)
                    </label>
                    <input
                      id="bank-account-number"
                      type="text"
                      maxLength={10}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--rsc-main)] focus:outline-none font-mono"
                      placeholder="0123456789"
                      value={bankForm.accountNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        updateBankField("accountNumber", val);
                      }}
                      disabled={provisionMutation.isPending}
                    />
                    {bankErrors.accountNumber && (
                      <span className="text-xs text-red-600 mt-1 block">
                        {bankErrors.accountNumber}
                      </span>
                    )}
                    {resolvingName && (
                      <span className="text-xs text-slate-500 mt-1 block animate-pulse">
                        Verifying bank details...
                      </span>
                    )}
                    {resolvedAccountName && (
                      <span className="text-xs text-emerald-600 mt-1 block font-semibold">
                        Verified Name: {resolvedAccountName}
                      </span>
                    )}
                    {resolveError && (
                      <span className="text-xs text-red-600 mt-1 block">{resolveError}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  {outlet?.settlementSubaccountCode && (
                    <Button
                      tone="quiet"
                      type="button"
                      disabled={provisionMutation.isPending}
                      onClick={() => setIsEditingBank(false)}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button tone="navy" type="submit" disabled={provisionMutation.isPending}>
                    {provisionMutation.isPending ? "Registering Account…" : "Register Bank Account"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
