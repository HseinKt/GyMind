export interface Notification {
  id: number;
  gymId?: number | null;
  branchId?: number | null;
  title?: string | null;
  message?: string | null;
  read?: boolean;
  createdAt?: string | null;
}

export interface NotificationTargets {
  targetTypes: string[];
  gyms: Array<{ id: number; name: string }>;
  branches: Array<{ id: number; name: string; gymId?: number | null }>;
  roles: string[];
  users: Array<{ id: number; fullName: string; email: string; role: string; gymId?: number | null; branchId?: number | null }>;
  members: Array<{ id: number; fullName: string; email: string; gymId?: number | null; branchId?: number | null }>;
}

export interface CreateNotificationPayload {
  targetType: string;
  gymId?: number | null;
  branchId?: number | null;
  role?: string | null;
  userIds?: number[];
  memberIds?: number[];
  classId?: number | null;
  title: string;
  message: string;
  priority?: string;
}
