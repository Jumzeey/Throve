import type { ListingForm } from '@/data/types';
import { apiFetch } from '@/lib/api';

export type ListingCatalog = {
  departments: string[];
  categories: Record<string, string[]>;
  conditions: string[];
  sizes: { value: string; label: string }[];
  sizeRequiredCategories: string[];
  photo: { min: number; max: number };
  titleMax: number;
  descriptionMax: number;
  shipping: { value: string; label: string; eta: string; fee: number }[];
  defaultShipping: string;
  hints: {
    photos: string;
    photosEmpty: string;
    category: string;
    size: string;
  };
};

let cached: ListingCatalog | null = null;
let inflight: Promise<ListingCatalog> | null = null;

export function getCachedListingCatalog() {
  return cached;
}

export async function fetchListingCatalog(force = false) {
  if (cached && !force) return cached;
  if (inflight && !force) return inflight;
  inflight = apiFetch<ListingCatalog>('/listings/catalog')
    .then((data) => {
      cached = data;
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function categoriesForDepartment(catalog: ListingCatalog, department: string) {
  return catalog.categories[department] ?? [];
}

export function sizeIsRequired(catalog: ListingCatalog, category: string) {
  return catalog.sizeRequiredCategories.includes(category);
}

export function listingFormIssues(form: ListingForm, catalog: ListingCatalog) {
  const issues: string[] = [];
  if ((form.photoUris?.length ?? form.photoCount) < catalog.photo.min) issues.push('At least one photograph');
  if (!form.title.trim()) issues.push('Item title');
  if (!form.department.trim()) issues.push('Department');
  if (!form.category.trim()) issues.push('Category');
  if (!form.condition.trim()) issues.push('Condition');
  const price = Number(form.price.replace(/[^\d]/g, ''));
  if (!Number.isFinite(price) || price <= 0) issues.push('Price');
  if (sizeIsRequired(catalog, form.category) && !form.size.trim()) issues.push('Size');
  return issues;
}

export function shippingOption(catalog: ListingCatalog, value?: string) {
  return catalog.shipping.find((option) => option.value === value) ?? catalog.shipping[0];
}
