import { useMutation } from "@tanstack/react-query";

import { createRider, type CreateRiderInput, type RiderResult } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useOnboardRider() {
  return useMutation<RiderResult, Error, CreateRiderInput>({
    mutationFn: createRider,
    onError: (err) => toastBus.emit(err.message, "error"),
  });
}
