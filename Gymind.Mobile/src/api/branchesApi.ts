import { BranchAccess } from "@/types/branch";
import { getJson } from "./apiClient";
import { endpoints } from "./endpoints";
import { mapBranchAccess } from "./mappers";

export async function getBranchAccess(): Promise<BranchAccess[]> {
  const data = await getJson<any[]>(endpoints.branchAccess);
  return Array.isArray(data) ? data.map(mapBranchAccess) : [];
}
