"use client";

import { useOutlets } from "@/src/hooks/use-outlets";
import { OutletCard } from "@/src/components/outlets/outlet-card";

function OutletSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="h-36 sm:h-44 bg-gray-200" />
      <div className="p-3 sm:p-4 space-y-2">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-3 w-32 bg-gray-100 rounded" />
        <div className="h-3 w-20 bg-gray-100 rounded mt-3" />
      </div>
    </div>
  );
}

export function OutletsView() {
  const { data: outlets, isPending, isError } = useOutlets();

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <OutletSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError || !outlets?.length) {
    return (
      <p className="text-sm text-gray-400 py-12 text-center">
        No kitchens available right now. Please try again later.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {outlets.map((outlet) => (
        <OutletCard key={outlet.id} outlet={outlet} />
      ))}
    </div>
  );
}
