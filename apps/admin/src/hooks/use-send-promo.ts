import { useMutation } from "@tanstack/react-query";

import { sendPromoNotification } from "../lib/api";
import { toastBus } from "../lib/toast-bus";

export function useSendPromo() {
  return useMutation({
    mutationFn: sendPromoNotification,
    onSuccess: () => toastBus.emit("Campaign broadcast successfully", "success"),
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
