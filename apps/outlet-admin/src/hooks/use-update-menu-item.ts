import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMenuItem, uploadMenuItemImage, type UpdateMenuItemBody } from "../lib/api";
import { outletAdminKeys } from "../lib/query-keys";
import { toastBus } from "../lib/toast-bus";

interface UpdateMenuItemArgs {
  itemId: string;
  body: UpdateMenuItemBody;
  imageFile?: File;
}

export function useUpdateMenuItem(outletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, body, imageFile }: UpdateMenuItemArgs) => {
      let imageUrl = body.imageUrl;
      if (imageFile) {
        const uploaded = await uploadMenuItemImage(itemId, imageFile);
        imageUrl = uploaded.imageUrl ?? imageUrl;
      }
      return updateMenuItem(itemId, {
        ...body,
        ...(imageUrl ? { imageUrl } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outletAdminKeys.outlet.root(outletId) });
      queryClient.invalidateQueries({ queryKey: outletAdminKeys.menuItem.root() });
      toastBus.emit("Menu item updated", "success");
    },
    onError: (err: Error) => toastBus.emit(err.message, "error"),
  });
}
