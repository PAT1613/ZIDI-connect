export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type ListParams = Record<string, string | number | boolean | undefined>;
