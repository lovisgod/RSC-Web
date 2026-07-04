import { useMutation } from "@tanstack/react-query";

import { changePassword } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toastBus.emit("Password changed successfully", "success");
    },
    onError: (error: Error) => {
      toastBus.emit(error.message, "error");
    },
  });
}
