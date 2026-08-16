import { get, post, put } from "./apiClient";
import type { CreateNotificationPayload, Notification, NotificationTargets } from "../types/notification";

export interface PagedNotifications {
  items: Notification[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const notificationsApi = {
  getNotifications: () => get<Notification[]>("/notifications"),
  getNotificationsPage: (params?: Record<string, unknown>) => get<PagedNotifications>("/notifications", params),
  getTargets: () => get<NotificationTargets>("/notifications/targets"),
  createNotification: (data: CreateNotificationPayload) => post<Notification>("/notifications", data),
  markAsRead: (id: number, userId: number) => put(`/notifications/${id}/read`, { userId })
};
