import { useAuth } from "../hooks/use-auth";
import { useOutletInfo, useToggleOutletOnline } from "../hooks/use-outlet-info";

export function OutletPageHeader() {
  const { user } = useAuth();
  const outletId = user?.outletId ?? "";
  const { data: outlet } = useOutletInfo(outletId);
  const { mutate: toggleOnline, isPending } = useToggleOutletOnline(outletId);

  const outletName = outlet?.name ?? "Outlet";
  const isOnline = outlet?.isOnline ?? false;

  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-4">
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
        <span aria-hidden="true">🔥</span>
        {outletName} POS Dashboard
      </h1>

      <button
        type="button"
        disabled={isPending || !outletId}
        onClick={() => outletId && toggleOnline(!isOnline)}
        className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
          isOnline
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
        } disabled:cursor-not-allowed disabled:opacity-60`}
        aria-label={isOnline ? "Go offline" : "Go online"}
      >
        <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
        {isOnline ? "Online" : "Offline"}
      </button>
    </div>
  );
}
