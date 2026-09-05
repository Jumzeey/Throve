import { apiFetch } from '@/lib/api';
import type { Listing, ListingFilters } from '@/data/types';

export type SearchSeller = {
  username: string;
  photoUri?: string;
  location: string;
  avg: number;
  count: number;
};

export type SearchBrand = {
  name: string;
  count: number;
};

export type CatalogSearchResult = {
  items: Listing[];
  sellers: SearchSeller[];
  brands: SearchBrand[];
};

export async function searchCatalog(
  query: string,
  filters: ListingFilters,
  signal?: AbortSignal,
): Promise<CatalogSearchResult> {
  const params = new URLSearchParams();
  const q = query.trim();
  if (q) params.set('q', q);
  if (filters.department) params.set('department', filters.department);
  if (filters.category) params.set('category', filters.category);
  if (filters.brand) params.set('brand', filters.brand);
  if (filters.size) params.set('size', filters.size);
  if (filters.condition) params.set('condition', filters.condition);
  if (filters.priceMin) params.set('priceMin', filters.priceMin);
  if (filters.priceMax) params.set('priceMax', filters.priceMax);
  if (filters.sort && filters.sort !== 'Newest') params.set('sort', filters.sort);

  const data = await apiFetch<CatalogSearchResult>(`/listings/search?${params.toString()}`, { signal });
  return {
    items: Array.isArray(data.items) ? data.items : [],
    sellers: Array.isArray(data.sellers) ? data.sellers : [],
    brands: Array.isArray(data.brands) ? data.brands : [],
  };
}
