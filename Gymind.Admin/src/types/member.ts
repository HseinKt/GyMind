export interface Member {
  id: number;
  gymId?: number | null;
  branchId?: number | null;
  homeBranchId?: number | null;
  branchName?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  planId?: string;
  trainerId?: number | null;
  trainerName?: string;
  status?: string;
  paymentStatus?: string;
  attendanceToday?: string;
  joinedAt?: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
  lastCheckIn?: string | null;
  isActive?: boolean;
}

export interface StaffMemberDetails extends Member {
  totalPaid?: number;
  lastPaymentAmount?: number;
  lastPaymentAt?: string | null;
  lastPaymentMethod?: string;
  recentPayments?: Array<{
    id: number;
    amount?: string | number;
    amountValue?: number | null;
    method?: string | null;
    paymentType?: string;
    paidAt?: string | null;
    at?: string;
    status?: string;
  }>;
  recentCheckIns?: Array<{
    id: number;
    branchName?: string;
    memberName?: string;
    status?: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    at?: string;
    source?: string;
  }>;
}

export interface MemberPersonalInfo {
  bloodType?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactAltPhone?: string | null;
  medicalConditions?: string | null;
  allergies?: string | null;
  injuries?: string | null;
  medications?: string | null;
  doctorClearanceRequired?: boolean;
  healthNotes?: string | null;
  updatedAt?: string | null;
}
