import type { Role } from "./auth";

export interface User {
  id: number;
  gymId?: number | null;
  branchId?: number | null;
  roleId?: number;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: Role | string;
  title?: string;
  workspace?: string;
  isActive?: boolean;
}
