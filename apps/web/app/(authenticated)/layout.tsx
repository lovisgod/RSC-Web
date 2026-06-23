"use client";

// TODO: Re-enable auth guard once backend session API is integrated
// import { useEffect } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { LoadingSpinner } from "@rsc/ui";
// import { UserSession } from "@rsc/contracts";

import { BottomNav } from "@/components/BottomNav";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  // TODO: Restore this block when /api/auth/session is live
  // const { data: user, isPending, isError } = useQuery<typeof UserSession>({
  //   queryKey: ["auth-session"],
  //   queryFn: async () => {
  //     const response = await fetch("/api/auth/session");
  //     if (!response.ok) throw new Error("Unauthorized Session");
  //     return response.json();
  //   },
  //   retry: false,
  //   staleTime: 5 * 60 * 1000,
  // });

  // useEffect(() => {
  //   if (!isPending && (isError || !user)) {
  //     window.location.href = "/signIn";
  //   }
  // }, [isPending, isError, user]);

  // if (isPending) return <LoadingSpinner show={true} fullScreen={true} />;
  // if (isError || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-rsc-ink max-w-l mx-auto relative pb-24 shadow-2xl">
      <main className="px-4 pt-6 animate-fadeIn">{children}</main>
      <BottomNav />
    </div>
  );
}
