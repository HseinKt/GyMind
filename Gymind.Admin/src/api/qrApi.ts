import { get, post } from "./apiClient";

export interface BranchQrPayload {
  branchId: number;
  branchName: string;
  qrPayload: string;
  isActive: boolean;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
}

export const qrApi = {
  getBranchQr: (branchId: number) =>
    get<BranchQrPayload>(`/qr/branch/${branchId}`),
  regenerateBranchQr: (branchId: number) =>
    post<BranchQrPayload>(`/qr/branch/${branchId}/regenerate`)
};
