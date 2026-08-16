export interface ApiError {
  message: string;
  status?: number;
}

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface EntityRecord {
  id: number | string;
  [key: string]: unknown;
}
