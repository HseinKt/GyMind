import { get } from "./apiClient";

export interface AuditLog {
  id: number;
  userId?: number | null;
  userName?: string | null;
  action?: string | null;
  tableName?: string | null;
  recordId?: number | null;
  createdAt?: string | null;
}

export interface AuditActorActionCount {
  actor: string;
  action: string;
  count: number;
}

export const auditLogsApi = {
  getAuditLogs: (params?: Record<string, unknown>) => get<AuditLog[]>("/audit-logs", params),
  getActorActionCounts: (params?: Record<string, unknown>) => get<AuditActorActionCount[]>("/audit-logs/actor-actions", params)
};
