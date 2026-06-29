import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastBus } from "../lib/toast-bus";

interface EditOutletInput {
  id: string;
  formData: FormData;
}

export function useEditOutlet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, formData }: EditOutletInput) => {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/outlets/${id}`, {
        method: "PATCH",
        body: formData,
      });

      const payload: { message?: string } = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message ?? `Request failed (${res.status})`);
      }

      return payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "outlets"] });
      toastBus.emit(data.message ?? "Outlet updated", "success");
    },
    onError: (error: Error) => {
      toastBus.emit(error.message, "error");
    },
  });
}
