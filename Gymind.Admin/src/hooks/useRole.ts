import { useAuth } from "./useAuth";

export function useRole() {
  return useAuth().session?.user.role ?? null;
}
