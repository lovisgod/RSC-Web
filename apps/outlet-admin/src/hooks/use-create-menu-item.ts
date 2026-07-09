import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMenuItem, uploadMenuItemImage, type CreateMenuItemBody } from "../lib/api";
import { outletAdminKeys } from "../lib/query-keys";
import { toastBus } from "../lib/toast-bus";

interface CreateMenuItemArgs {
  body: CreateMenuItemBody;
  imageFile?: File;
}

export function useCreateMenuItem(outletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ body, imageFile }: CreateMenuItemArgs) => {
      const item = await createMenuItem(body);
      if (imageFile) {
        await uploadMenuItemImage(item.id, imageFile);
      }
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outletAdminKeys.outlet.root(outletId) });
      toastBus.emit("Menu item created", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
