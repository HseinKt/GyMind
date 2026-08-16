import { get } from "./apiClient";

const fallbackCities = [
  "Ablah",
  "Aley",
  "Baalbek",
  "Beiru",
  "Beirut",
  "Batroun",
  "Bcharre",
  "Bhamdoun",
  "Byblos",
  "Damour",
  "Jbail",
  "Jbeil",
  "Jounieh",
  "Nabatieh",
  "Saida",
  "Sidon",
  "Sour",
  "Tripoli",
  "Tyre",
  "Zahle"
];

export interface NominatimCityResult {
  place_id: number;
  name?: string;
  display_name?: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
  };
}

export const lookupsApi = {
  getCities: async () => {
    try {
      const cities = await get<string[]>("/lookups/cities");
      return cities.length ? cities : fallbackCities;
    } catch {
      return fallbackCities;
    }
  },
  searchCities: (query: string, signal?: AbortSignal) =>
    get<NominatimCityResult[]>("/lookups/cities/search", { q: query }, signal)
};
