import { useQuery } from "@tanstack/react-query";

export interface OrderFeedItem {
  id: string;
  createdAt: string;
  customerName: string;
  fulfillmentType: "DELIVERY" | "TAKEOUT";
  subOrderCount: number;
  grandTotalMinor: number;
  currency: "NGN";
  paymentStatus: "PAID" | "PENDING" | "FAILED";
}

export function useOrdersFeed(query: string) {
  return useQuery({
    queryKey: ["admin", "orders", { query }],
    queryFn: async (): Promise<OrderFeedItem[]> => {
      // TODO: replace with apiClient.listMasterOrders({ query }) when endpoint is ready
      return [];
    },
    staleTime: 0,
    refetchInterval: 10_000,
  });
}
