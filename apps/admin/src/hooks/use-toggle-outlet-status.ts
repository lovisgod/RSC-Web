import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastBus } from "../lib/toast-bus";

interface ToggleInput {
  id: string;
  isOnline: boolean;
}

export function useToggleOutletStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isOnline }: ToggleInput) => {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/outlets/${id}/online-status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isOnline }),
        },
      );

      const payload: { message?: string } = await res.json().catch(() => ({}));

      if (res.status !== 200) {
        throw new Error(payload.message ?? `Request failed (${res.status})`);
      }

      return payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "outlets"] });
      toastBus.emit(data.message ?? "Outlet status updated", "success");
    },
    onError: (error: Error) => {
      toastBus.emit(error.message, "error");
    },
  });
}
