"use client";

export default function CartPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-2">
      <p className="text-2xl">🛒</p>
      <h1 className="font-bold text-lg text-rsc-ink">Your cart is empty</h1>
      <p className="text-sm text-rsc-muted">Add items from a kitchen to get started</p>
    </div>
  );
}
