import { ChangePasswordPanel } from "@rsc/ui";
import { Eye, EyeOff, KeyRound, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

import { useChangePassword } from "../hooks/use-change-password";

export function SettingsPage() {
  const changePassword = useChangePassword();
  const [passwordResetSignal, setPasswordResetSignal] = useState(0);

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
    </div>
  );
}
