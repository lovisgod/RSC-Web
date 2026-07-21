import { Button, ChangePasswordPanel } from "@rsc/ui";
import { Eye, EyeOff, KeyRound, Landmark, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useChangePassword } from "../hooks/use-change-password";
import { useOutletsLive } from "../hooks/use-outlets-live";
import { setOutletSubaccountCode } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function SettingsPage() {
  const changePassword = useChangePassword();
  const queryClient = useQueryClient();
  const { data: outlets = [], isLoading: isLoadingOutlets } = useOutletsLive();
  const [passwordResetSignal, setPasswordResetSignal] = useState(0);
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [subaccountCode, setSubaccountCode] = useState("");
  const [subaccountError, setSubaccountError] = useState("");
  const selectedOutlet = useMemo(
    () => outlets.find((outlet) => outlet.id === selectedOutletId),
    [outlets, selectedOutletId],
  );

  const saveSubaccount = useMutation({
    mutationFn: () => {
      const trimmedCode = subaccountCode.trim();
      if (!selectedOutletId) {
        throw new Error("Select an outlet first.");
      }
      if (trimmedCode.length < 2) {
        throw new Error("Enter the settlement subaccount code.");
      }
      if (/\s/.test(trimmedCode)) {
        throw new Error("Settlement subaccount code must not contain spaces.");
      }

      return setOutletSubaccountCode(selectedOutletId, { subaccountCode: trimmedCode });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "outlets"] }),
        selectedOutletId
          ? queryClient.invalidateQueries({ queryKey: ["admin", "outlets", selectedOutletId] })
          : Promise.resolve(),
      ]);
      toastBus.emit("Settlement subaccount code saved", "success");
      setSubaccountCode("");
      setSubaccountError("");
    },
    onError: (error: Error) => {
      setSubaccountError(error.message);
      toastBus.emit(error.message, "error");
    },
  });

  function handleOutletChange(value: string) {
    setSelectedOutletId(value);
    setSubaccountError("");
    const outlet = outlets.find((item) => item.id === value);
    setSubaccountCode(outlet?.settlementSubaccountCode ?? "");
    saveSubaccount.reset();
  }

  return (
    <div className="settings-page">
      <div className="settings-page__head">
        <p className="kicker">Account</p>
        <h1>Settings</h1>
        <p>Manage the security of your central admin account.</p>
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
        idleDescription="Changing your password helps protect central operations, financial review, and platform data from unauthorized access."
        onResetError={() => changePassword.reset()}
        onSubmit={(input) =>
          changePassword.mutate(input, {
            onSuccess: () => setPasswordResetSignal((current) => current + 1),
          })
        }
      />

      <section className="admin-settlement-settings">
        <div className="admin-settlement-settings__head">
          <span className="admin-settlement-settings__icon">
            <Landmark size={21} aria-hidden="true" />
          </span>
          <div>
            <h2>Outlet settlement account</h2>
            <p>
              Add the settlement subaccount code already generated from the payment provider. This
              controls whether an outlet can be visible to customers.
            </p>
          </div>
        </div>

        <form
          className="admin-settlement-settings__form"
          onSubmit={(event) => {
            event.preventDefault();
            setSubaccountError("");
            saveSubaccount.mutate();
          }}
          noValidate
        >
          <label className="admin-settlement-field">
            <span>Outlet</span>
            <select
              value={selectedOutletId}
              disabled={isLoadingOutlets || saveSubaccount.isPending}
              onChange={(event) => handleOutletChange(event.target.value)}
            >
              <option value="">{isLoadingOutlets ? "Loading outlets…" : "Select outlet"}</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-settlement-field">
            <span>Settlement subaccount code</span>
            <input
              type="text"
              value={subaccountCode}
              disabled={!selectedOutletId || saveSubaccount.isPending}
              placeholder="e.g. ACCT_abc123xyz"
              onChange={(event) => {
                setSubaccountCode(event.target.value);
                setSubaccountError("");
              }}
            />
            <small>Paste the provider-generated code.</small>
          </label>

          {selectedOutlet && (
            <div
              className={`admin-settlement-status${
                selectedOutlet.settlementSubaccountCode ? " admin-settlement-status--active" : ""
              }`}
            >
              <strong>
                {selectedOutlet.settlementSubaccountCode
                  ? "Settlement configured"
                  : "Settlement pending"}
              </strong>
              <span>
                {selectedOutlet.settlementSubaccountCode
                  ? selectedOutlet.settlementSubaccountCode
                  : "This outlet will remain hidden from customers until a code is saved."}
              </span>
            </div>
          )}

          {subaccountError && (
            <p className="admin-settlement-settings__error" role="alert">
              {subaccountError}
            </p>
          )}

          <div className="admin-settlement-settings__actions">
            <Button
              tone="navy"
              type="submit"
              disabled={!selectedOutletId || !subaccountCode.trim() || saveSubaccount.isPending}
            >
              {saveSubaccount.isPending ? "Saving…" : "Save settlement code"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
