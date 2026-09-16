import type { Metadata } from "next";

import { DailySpecialsView } from "@/src/components/daily-specials/daily-specials-view";

export const metadata: Metadata = { title: "Daily specials" };

export default function DailySpecialsPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
      <DailySpecialsView />
    </div>
  );
}
