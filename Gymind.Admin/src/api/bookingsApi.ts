import { get, post, put } from "./apiClient";
import type { ClassBooking } from "../types/class";

export const bookingsApi = {
  getClassBookings: (classId: number) => get<ClassBooking[]>("/classbookings", { classId }),
  createBooking: (classId: number, memberId: number) => post<ClassBooking>("/classbookings", { classId, memberId, status: "BOOKED" }),
  cancelBooking: (id: number) => put<ClassBooking>(`/classbookings/${id}/status`, { status: "CANCELLED" })
};
