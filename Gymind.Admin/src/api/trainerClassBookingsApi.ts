import { get, patch } from "./apiClient";

export interface TrainerClassBooking {
  bookingId: number;
  classId?: number | null;
  memberId?: number | null;
  memberName: string;
  memberPhone?: string | null;
  memberEmail?: string | null;
  status?: string | null;
  bookedAt?: string | null;
  attended: boolean;
  attendedAt?: string | null;
}

export const trainerClassBookingsApi = {
  getClassBookings: (classId: number) => get<TrainerClassBooking[]>(`/trainer/classes/${classId}/bookings`),
  updateAttendance: (bookingId: number, attended: boolean) =>
    patch<TrainerClassBooking>(`/trainer/class-bookings/${bookingId}/attendance`, { attended })
};
