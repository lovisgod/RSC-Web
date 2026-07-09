import { useAuth } from "../hooks/use-auth";
import { useOutletInfo } from "../hooks/use-outlet-info";

export function OutletPageHeader() {
  const { user } = useAuth();
  const outletId = user?.outletId ?? "";
  const { data: outlet } = useOutletInfo(outletId);

  const outletName = outlet?.name ?? "Outlet";
  const isOnline = outlet?.isOnline ?? false;

  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-4">
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
        <span aria-hidden="true">🔥</span>
        {outletName} POS Dashboard
      </h1>

      <div
        role="status"
        className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
          isOnline
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-500"
        }`}
        aria-label={`Outlet is ${isOnline ? "online" : "offline"}`}
      >
        <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
        {isOnline ? "Online" : "Offline"}
      </div>
    </div>
  );
}
