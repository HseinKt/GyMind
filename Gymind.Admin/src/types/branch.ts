export interface Branch {
  id: number;
  gymId?: number | null;
  name: string;
  address?: string | null;
  city?: string;
  phone?: string | null;
  rangeKm?: number | null;
  capacity?: number | null;
  areaSqm?: number | null;
  lat?: number | null;
  lng?: number | null;
  openTime?: string | null;
  closeTime?: string | null;
  status?: string;
  isActive?: boolean;
  members?: number;
  revenue?: number;
  activeToday?: number;
  manager?: string;
}
