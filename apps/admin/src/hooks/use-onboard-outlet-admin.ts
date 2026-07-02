import { useMutation } from "@tanstack/react-query";
import type { AdminResult, CreateAdminInput } from "@rsc/contracts";

import { createOutletAdmin } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useOnboardOutletAdmin() {
  return useMutation<AdminResult, Error, CreateAdminInput>({
    mutationFn: createOutletAdmin,
    onError: (err) => toastBus.emit(err.message, "error"),
  });
}
