export interface BranchAccess {
  branchId: number;
  branchName: string;
  address: string;
  openTime?: string;
  closeTime?: string;
  isOpenNow: boolean;
  capacity: number;
  currentOccupancy: number;
  remainingSpots: number;
  capacityPercentage: number;
  status: string;
  canCheckIn: boolean;
  membershipAccess: boolean;
  lat?: number | null;
  lng?: number | null;
}
