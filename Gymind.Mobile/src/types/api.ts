export interface ApiErrorShape {
  message: string;
  statusCode?: number;
  details?: unknown;
}

export type Nullable<T> = T | null | undefined;
