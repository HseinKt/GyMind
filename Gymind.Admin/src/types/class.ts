export interface GymClass {
  id: number;
  gymId?: number | null;
  branchId?: number | null;
  trainerUserId?: number | null;
  trainerId?: number | null;
  trainerName?: string;
  name: string;
  capacity?: number | null;
  booked?: number;
  status?: string;
  startTime?: string | null;
  endTime?: string | null;
  time?: string;
}

export interface ClassBooking {
  id: number;
  classId?: number | null;
  memberId?: number | null;
  status?: string | null;
  bookedAt?: string | null;
}
