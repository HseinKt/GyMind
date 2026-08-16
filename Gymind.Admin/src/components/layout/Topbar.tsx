import { LogOut } from "lucide-react";
import { Button } from "../ui/Button";
import type { AuthUser } from "../../types/auth";
import { cleanLabel, roleLabel } from "../../utils/formatters";

export function Topbar({
  user,
  gymName,
  branchName,
  onLogout
}: {
  user: AuthUser;
  gymName?: string;
  branchName?: string;
  onLogout: () => void;
}) {
  const gymLabel = gymName ?? (user.gymId ? `#${user.gymId}` : "All");
  const branchLabel = branchName ?? (user.branchId ? `#${user.branchId}` : "All");

  return (
    <header className="sticky top-0 z-20 border-b border-forge-border bg-forge-bg/90 px-3 py-3 backdrop-blur lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-950">{cleanLabel(user.fullName, "Unknown User")}</p>
          <p className="truncate text-xs text-forge-muted">
            {roleLabel(user.role)} / Gym {cleanLabel(gymLabel, "Not assigned")} / Branch {cleanLabel(branchLabel, "No branch")}
          </p>
        </div>
        <Button className="shrink-0 px-3" variant="secondary" onClick={onLogout}><LogOut size={16} /><span className="hidden sm:inline">Logout</span></Button>
      </div>
    </header>
  );
}
