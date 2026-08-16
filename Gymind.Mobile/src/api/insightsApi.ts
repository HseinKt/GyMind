import { BodyInsights } from "@/types/insights";
import { getJson } from "./apiClient";
import { endpoints } from "./endpoints";
import { mapInsights } from "./mappers";

export async function getInsights(): Promise<BodyInsights> {
  return mapInsights(await getJson(endpoints.insights));
}
