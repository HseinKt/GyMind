import { NavLink } from "react-router-dom";
import { menuByRole } from "../../routes/menuConfig";
import type { Role } from "../../types/auth";

export function RoleBasedMenu({
  role,
  compact = false,
  collapsed = false
}: {
  role: Role;
  compact?: boolean;
  collapsed?: boolean;
}) {
  const isCollapsed = collapsed && !compact;
  return (
    <nav className={compact ? "flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "space-y-1"}>
      {menuByRole[role].map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            aria-label={isCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              compact
                ? `flex min-w-[76px] flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-bold ${isActive ? "bg-forge-primary text-white" : "text-slate-500"}`
                : isCollapsed
                  ? `flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold transition ${isActive ? "bg-forge-primary text-white shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"}`
                  : `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`
            }
          >
            <Icon size={compact ? 18 : isCollapsed ? 20 : 17} />
            <span className={isCollapsed ? "sr-only" : compact ? "truncate" : ""}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
