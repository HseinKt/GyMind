import { del, get, post } from "./apiClient";
import type { Payment } from "../types/payment";

export const paymentsApi = {
  getPayments: (params?: Record<string, unknown>) => get<Payment[]>("/payments", params),
  createPayment: (data: Partial<Payment>) => post<Payment>("/payments", data),
  getRevenueSummary: () => get("/dashboard"),
  deletePayment: (id: number) => del(`/payments/${id}`)
};
