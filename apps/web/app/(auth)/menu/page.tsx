import type { Metadata } from "next";

import { MenuSearchView } from "@/src/components/menu-search/menu-search-view";

export const metadata: Metadata = { title: "Search menu" };

export default function MenuPage() {
  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col min-h-full">
      <MenuSearchView />
    </div>
  );
}
