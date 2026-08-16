export interface CitySelection {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

export function formatCityLabel(city: CitySelection): string;

export interface CityAutocompleteProps {
  onCitySelect: (city: CitySelection | null) => void;
  label?: string;
  placeholder?: string;
  initialDisplayValue?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
}

export function CityAutocomplete(props: CityAutocompleteProps): JSX.Element;
