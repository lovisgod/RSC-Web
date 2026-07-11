import { useMutation } from "@tanstack/react-query";
import type { CreateRiderInput, RiderResult } from "@rsc/contracts";

import { createRider } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useOnboardRider() {
  return useMutation<RiderResult, Error, CreateRiderInput>({
    mutationFn: createRider,
    onError: (err) => toastBus.emit(err.message, "error"),
  });
}
