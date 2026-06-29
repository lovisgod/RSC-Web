import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastBus } from "../lib/toast-bus";

export function useDeleteOutlet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/outlets/${id}`, {
        method: "DELETE",
      });

      const payload: { message?: string } = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message ?? `Request failed (${res.status})`);
      }

      return payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "outlets"] });
      toastBus.emit(data.message ?? "Outlet removed", "success");
    },
    onError: (error: Error) => {
      toastBus.emit(error.message, "error");
    },
  });
}
