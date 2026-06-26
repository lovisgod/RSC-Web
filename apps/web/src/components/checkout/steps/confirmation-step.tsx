"use client";

import { Button } from "@rsc/ui";
import Link from "next/link";

export function ConfirmationStep({ orderId }: { orderId: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center space-y-5">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Order confirmed</h2>
        <p className="text-sm text-gray-500">
          RSC kitchens received your order. Track each kitchen below.
        </p>
      </div>

      <p className="text-4xl font-bold" style={{ color: "var(--rsc-main)" }}>
        {orderId}
      </p>

      <Link href="/tracking">
        <Button tone="primary">Track order</Button>
      </Link>
    </div>
  );
}
