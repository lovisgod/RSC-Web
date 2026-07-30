import type { Metadata } from "next";

import { MenuItemDetailPage } from "@/src/components/menu-search/menu-item-detail-page";

export const metadata: Metadata = { title: "Menu item" };

export default async function MenuItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <MenuItemDetailPage id={id} />;
}
