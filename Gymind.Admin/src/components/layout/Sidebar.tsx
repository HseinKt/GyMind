import type { Role } from "../../types/auth";
import { RoleBasedMenu } from "./RoleBasedMenu";

export function Sidebar({
  role,
  collapsed,
  onToggleCollapsed
}: {
  role: Role;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <aside
      className={`hidden shrink-0 bg-forge-sidebar text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:border-r lg:border-white/10 lg:transition-all lg:duration-300 ${collapsed ? "lg:w-20 lg:px-3 lg:py-5" : "lg:w-72 lg:p-5"}`}
    >
      <div className={`mb-8 flex ${collapsed ? "flex-col items-center gap-3" : "items-start gap-3"}`}>
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapsed}
          className={`group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg font-black tracking-tight text-white shadow-lg shadow-black/10 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-black/20 focus-ring ${collapsed ? "self-end" : ""}`}
        >
          FH
        </button>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-black tracking-tight">Gymind</div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Admin OS</div>
          </div>
        ) : null}
      </div>
      <div className="flex-1">
        <RoleBasedMenu role={role} collapsed={collapsed} />
      </div>
    </aside>
  );
}
