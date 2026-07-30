"use client";

import { Button } from "@rsc/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ItemDetailModal } from "@/src/components/outlet-detail/item-detail-modal";
import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";
import { buildOutletMenu, type MenuItem } from "@/src/lib/data/outlet-menu";
import { toDisplayOutlet } from "@/src/lib/data/outlets";

function findMenuItem(
  summaries: Awaited<ReturnType<typeof OUTLETS_QUERY.queryFn>>,
  itemId: string,
): { item: MenuItem; outletName: string } | null {
  for (const [index, summary] of summaries.entries()) {
    const outlet = toDisplayOutlet(summary, index);
    const menu = buildOutletMenu(outlet, summary);
    const item = menu.items.find((candidate) => candidate.id === itemId);

    if (item) {
      return { item, outletName: outlet.name };
    }
  }

  return null;
}

export function MenuItemDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: outlets = [], isPending, isError } = useQuery(OUTLETS_QUERY);
  const resolved = findMenuItem(outlets, id);

  function closeDetails() {
    router.replace("/menu");
  }

  if (isPending) {
    return (
      <main className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-6 py-12">
        <div className="w-full max-w-md animate-pulse rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="h-52 rounded-2xl bg-gray-100" />
          <div className="mt-4 h-5 w-48 rounded-full bg-gray-200" />
          <div className="mt-3 h-4 w-64 rounded-full bg-gray-100" />
          <div className="mt-6 h-12 rounded-2xl bg-gray-200" />
        </div>
      </main>
    );
  }

  if (isError || !resolved) {
    return (
      <main className="mx-auto grid min-h-[70vh] w-full max-w-xl place-items-center px-6 py-12 text-center">
        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--rsc-brand)]">
            Menu item unavailable
          </p>
          <h1 className="mt-3 text-2xl font-black text-gray-900">We could not find this item.</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            It may have been removed, turned off, or moved to another kitchen menu.
          </p>
          <Link href="/menu" className="mt-6 inline-flex">
            <Button>Search menu</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <ItemDetailModal item={resolved.item} outletName={resolved.outletName} onClose={closeDetails} />
  );
}
