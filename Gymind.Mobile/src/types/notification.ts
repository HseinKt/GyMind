export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  priority?: string;
  createdAt?: string;
  readAt?: string | null;
  isRead: boolean;
}
