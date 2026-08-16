export interface Gym {
  id: number;
  name: string;
  ownerUserId?: number | null;
  ownerName?: string;
  owners?: GymOwnerSummary[];
  ownerCount?: number;
  ownerEmails?: string[];
  ownerPhones?: string[];
  logoUrl?: string | null;
  city?: string | null;
  branches?: number;
  members?: number;
  monthlyRevenue?: number;
  status?: string;
  isActive?: boolean;
  createdAt?: string | null;
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  subscriptionDueDate?: string | null;
}

export interface GymOwnerSummary {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
}
