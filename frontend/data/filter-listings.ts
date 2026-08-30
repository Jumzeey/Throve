import { LISTINGS } from '@/data/seed';
import type { Listing, ListingFilters, PriceBand, SortOption } from '@/data/types';

export const PRICE_BANDS: PriceBand[] = ['Under 15k', '15k-30k', 'Over 30k'];
export const SORT_OPTIONS: SortOption[] = ['Newest', 'Lowest price', 'Highest price'];

export const DEFAULT_FILTERS: ListingFilters = {
  department: '',
  category: '',
  brand: '',
  condition: '',
  price: '',
  sort: 'Newest',
};

export function hasSearchCriteria(query: string, filters: ListingFilters) {
  return Boolean(query.trim() || filters.department || filters.brand || filters.condition || filters.price);
}

function matchesPrice(price: number, band: string) {
  if (band === 'Under 15k') return price < 15000;
  if (band === '15k-30k') return price >= 15000 && price <= 30000;
  if (band === 'Over 30k') return price > 30000;
  return true;
}

export function filterListings(
  listings: Listing[] = LISTINGS,
  options: {
    query?: string;
    department?: string;
    category?: string;
    brand?: string;
    condition?: string;
    price?: string;
    sort?: SortOption;
  } = {},
) {
  const query = options.query?.trim().toLowerCase() ?? '';
  const matched = listings.filter((listing) => {
    if (listing.status !== 'available') return false;
    if (options.department && listing.department !== options.department) return false;
    if (options.category && listing.category !== options.category) return false;
    if (options.brand && listing.brand !== options.brand) return false;
    if (options.condition && listing.condition !== options.condition) return false;
    if (options.price && !matchesPrice(listing.price, options.price)) return false;
    if (query) {
      const haystack = [listing.title, listing.brand, listing.seller, listing.category, listing.department]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const sort = options.sort ?? 'Newest';
  return matched.sort((a, b) => {
    if (sort === 'Lowest price') return a.price - b.price;
    if (sort === 'Highest price') return b.price - a.price;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
