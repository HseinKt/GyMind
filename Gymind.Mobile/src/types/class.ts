export interface GymClass {
  id: number;
  classId?: number | undefined;
  bookingId?: number | null | undefined;
  title: string;
  coach?: string | undefined;
  trainerName?: string | undefined;
  startAt?: string | undefined;
  endAt?: string | undefined;
  availableSpots?: number | undefined;
  capacity?: number | undefined;
  booked?: boolean | undefined;
  description?: string | undefined;
  branchId?: number | undefined;
  branchName?: string | undefined;
}

export interface Booking {
  id: number;
  bookingId?: number | null | undefined;
  classId: number;
  title: string;
  coach?: string | undefined;
  startAt?: string | undefined;
  endAt?: string | undefined;
  availableSpots?: number | undefined;
  capacity?: number | undefined;
  booked?: boolean | undefined;
  branchId?: number | undefined;
  branchName?: string | undefined;
}
