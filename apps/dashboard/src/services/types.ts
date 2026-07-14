export interface QueryParams {
  page?: number;
  perPage?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filter?: Record<string, string>;
}
