import { NotificationItem } from "@/types/notification";
import { getJson, putJson } from "./apiClient";
import { endpoints } from "./endpoints";
import { mapNotification } from "./mappers";

export async function getNotifications(): Promise<NotificationItem[]> {
  const data = await getJson<any[]>(endpoints.notifications);
  return Array.isArray(data) ? data.map(mapNotification) : [];
}

export async function markNotificationRead(notificationId: number) {
  return putJson(endpoints.readNotification(notificationId), {});
}
