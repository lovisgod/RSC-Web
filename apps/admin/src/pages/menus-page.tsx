import type { MenuItem } from "@rsc/contracts";
import { Button, formatMoney } from "@rsc/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, Power } from "lucide-react";

import { listMenuItems, updateMenuItemAvailability } from "../lib/api";

const menuItemsQueryKey = ["menu-items"] as const;

export function MenusPage() {
  const queryClient = useQueryClient();
  const menuItems = useQuery({
    queryKey: menuItemsQueryKey,
    queryFn: listMenuItems,
  });
  const items = menuItems.data ?? [];
  const availability = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      updateMenuItemAvailability(id, { isAvailable }),
    onMutate: async ({ id, isAvailable }) => {
      await queryClient.cancelQueries({ queryKey: menuItemsQueryKey });
      const previous = queryClient.getQueryData<MenuItem[]>(menuItemsQueryKey);

      queryClient.setQueryData<MenuItem[]>(menuItemsQueryKey, (items) =>
        items?.map((item) => (item.id === id ? { ...item, isAvailable } : item)),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(menuItemsQueryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: menuItemsQueryKey }),
  });

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="kicker">Live inventory</p>
          <h1>Menu availability</h1>
          <p>Availability toggles write directly to the API and update this view immediately.</p>
        </div>
        <Button tone="quiet" onClick={() => void menuItems.refetch()}>
          Refresh
        </Button>
      </section>

      <section className="panel panel--full">
        <div className="panel__heading">
          <div>
            <p className="kicker">Menu items</p>
            <h2>Availability controls</h2>
          </div>
        </div>

        {menuItems.isLoading ? (
          <div className="state-row">
            <Loader2 aria-hidden="true" className="spin" size={18} />
            <span>Loading menu items</span>
          </div>
        ) : menuItems.isError ? (
          <div className="state-row state-row--error">
            <AlertCircle aria-hidden="true" size={18} />
            <span>Menu items could not be loaded.</span>
          </div>
        ) : items.length === 0 ? (
          <div className="state-row">
            <span>No menu items have been configured yet.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Inventory</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isPending =
                    availability.isPending && availability.variables?.id === item.id;

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small className="table-note">{item.description ?? "No description"}</small>
                      </td>
                      <td>
                        {formatMoney({ amountMinor: item.priceMinor, currency: item.currency })}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${item.isAvailable ? "status-pill--on" : "status-pill--off"}`}
                        >
                          {item.isAvailable ? (
                            <CheckCircle2 aria-hidden="true" size={15} />
                          ) : (
                            <Power aria-hidden="true" size={15} />
                          )}
                          {item.isAvailable ? "Available" : "Sold out"}
                        </span>
                      </td>
                      <td>
                        <label className="switch-control">
                          <input
                            type="checkbox"
                            checked={item.isAvailable}
                            disabled={isPending}
                            onChange={(event) =>
                              availability.mutate({
                                id: item.id,
                                isAvailable: event.currentTarget.checked,
                              })
                            }
                          />
                          <span aria-hidden="true" />
                          <small>{isPending ? "Saving" : item.isAvailable ? "On" : "Off"}</small>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
