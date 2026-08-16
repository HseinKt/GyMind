import { Booking, GymClass } from "@/types/class";
import { getJson, postJson } from "./apiClient";
import { endpoints } from "./endpoints";
import { mapBooking, mapClass } from "./mappers";

export async function getClasses(): Promise<GymClass[]> {
  const data = await getJson<any[]>(endpoints.classes);
  return Array.isArray(data) ? data.map(mapClass) : [];
}

export async function getClass(id: number): Promise<GymClass> {
  return mapClass(await getJson(`${endpoints.classes}/${id}`));
}

export async function getBookings(): Promise<Booking[]> {
  const data = await getJson<any[]>(endpoints.bookings);
  return Array.isArray(data) ? data.map(mapBooking) : [];
}

export async function bookClass(classId: number) {
  return postJson(endpoints.bookClass(classId), {});
}

export async function cancelBooking(bookingId: number) {
  return postJson(endpoints.cancelBooking(bookingId), {});
}

export async function cancelClassBooking(classId: number) {
  return postJson(endpoints.cancelClassBooking(classId), {});
}
