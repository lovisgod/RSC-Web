import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateRiderInput, RiderResult } from "@rsc/contracts";

import { createRider } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useOnboardRider() {
  const queryClient = useQueryClient();

  return useMutation<RiderResult, Error, CreateRiderInput>({
    mutationFn: createRider,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["riders"] });
    },
    onError: (err) => toastBus.emit(err.message, "error"),
  });
}
