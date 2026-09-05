import { LISTINGS } from '@/data/seed';
import type { Listing, ListingFilters, SortOption } from '@/data/types';
import { formatNaira } from '@/lib/format';

export const SORT_OPTIONS: SortOption[] = ['Newest', 'Lowest price', 'Highest price'];

export const DEFAULT_FILTERS: ListingFilters = {
  department: '',
  category: '',
  brand: '',
  size: '',
  condition: '',
  priceMin: '',
  priceMax: '',
  sort: 'Newest',
};

export function parseAmount(raw: string) {
  const n = Number(String(raw).replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function priceFilterLabel(min: string, max: string) {
  const lo = parseAmount(min);
  const hi = parseAmount(max);
  if (lo && hi) return `${formatNaira(lo)}–${formatNaira(hi)}`;
  if (lo) return `From ${formatNaira(lo)}`;
  if (hi) return `Up to ${formatNaira(hi)}`;
  return '';
}

export function hasSearchCriteria(query: string, filters: ListingFilters) {
  return Boolean(
    query.trim() ||
      filters.department ||
      filters.category ||
      filters.brand ||
      filters.size ||
      filters.condition ||
      filters.priceMin ||
      filters.priceMax,
  );
}

export function appliedFilterCount(filters: ListingFilters) {
  return [
    filters.department,
    filters.category,
    filters.brand,
    filters.size,
    filters.condition,
    filters.priceMin || filters.priceMax,
  ].filter(Boolean).length;
}

function matchesSize(listingSize: string, filterSize: string) {
  if (!filterSize) return true;
  const size = listingSize.trim();
  if (filterSize === 'One size') {
    return !size || size === '—' || size.toLowerCase() === 'one size';
  }
  return size.toLowerCase() === filterSize.toLowerCase();
}

export function filterListings(
  listings: Listing[] = LISTINGS,
  options: {
    query?: string;
    department?: string;
    category?: string;
    brand?: string;
    size?: string;
    condition?: string;
    priceMin?: string;
    priceMax?: string;
    sort?: SortOption;
  } = {},
) {
  const query = options.query?.trim().toLowerCase() ?? '';
  const min = parseAmount(options.priceMin ?? '');
  const max = parseAmount(options.priceMax ?? '');
  const matched = listings.filter((listing) => {
    if (listing.status !== 'available') return false;
    if (options.department && listing.department !== options.department) return false;
    if (options.category && listing.category !== options.category) return false;
    if (options.brand && listing.brand !== options.brand) return false;
    if (options.size && !matchesSize(listing.size, options.size)) return false;
    if (options.condition && listing.condition !== options.condition) return false;
    if (min && listing.price < min) return false;
    if (max && listing.price > max) return false;
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
