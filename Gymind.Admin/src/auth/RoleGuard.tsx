import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../types/auth";

export function RoleGuard({ allowed }: { allowed: Role[] }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (!allowed.includes(session.user.role)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
