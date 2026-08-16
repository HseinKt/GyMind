import type { Role } from "../../types/auth";
import { RoleBasedMenu } from "./RoleBasedMenu";

export function MobileNav({ role }: { role: Role }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-forge-border bg-white p-2 shadow-2xl lg:hidden">
      <RoleBasedMenu role={role} compact />
    </div>
  );
}
