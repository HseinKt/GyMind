import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../types/auth";

const adminRoles: Role[] = ["SuperAdmin", "GymOwner", "BranchManager", "Staff", "Trainer"];

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-forge-muted">Checking session...</div>;
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!adminRoles.includes(session.user.role)) {
    return <Navigate to="/access-denied" replace />;
  }
  return <Outlet />;
}
