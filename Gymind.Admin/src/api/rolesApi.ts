import { get } from "./apiClient";

export interface PlatformRole {
  id: number;
  name: string;
}

export const rolesApi = {
  getRoles: () => get<PlatformRole[]>("/roles")
};
