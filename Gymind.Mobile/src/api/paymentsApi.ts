import { PaymentItem } from "@/types/payment";
import { getJson } from "./apiClient";
import { endpoints } from "./endpoints";
import { mapPayment } from "./mappers";

export async function getPayments(): Promise<PaymentItem[]> {
  const data = await getJson<any[]>(endpoints.payments);
  return Array.isArray(data) ? data.map(mapPayment) : [];
}
