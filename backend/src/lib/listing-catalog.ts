export const LISTING_CATALOG = {
  departments: ['Women', 'Men', 'Kids'] as const,
  categories: {
    Women: ['Clothing', 'Shoes', 'Bags', 'Accessories', 'Beauty'],
    Men: ['Clothing', 'Shoes', 'Bags', 'Accessories', 'Grooming'],
    Kids: ['Clothing', 'Shoes', 'Bags', 'Accessories'],
  },
  conditions: ['New with tags', 'New without tags', 'Very good', 'Good', 'Satisfactory'],
  sizes: [
    { value: 'XS', label: 'XS' },
    { value: 'S', label: 'Small' },
    { value: 'M', label: 'Medium' },
    { value: 'L', label: 'Large' },
    { value: 'XL', label: 'XL' },
    { value: 'One size', label: 'One size' },
  ],
  sizeRequiredCategories: ['Clothing', 'Shoes'],
  photo: { min: 1, max: 8 },
  titleMax: 80,
  descriptionMax: 1000,
  shipping: [
    { value: 'Standard', label: 'Standard delivery', eta: '2–5 working days', fee: 2500 },
    { value: 'Express', label: 'Express delivery', eta: '1–2 working days', fee: 4000 },
  ],
  defaultShipping: 'Standard',
  hints: {
    photos:
      'Press and hold a photo to reorder. The first photo is your main image. Tap a photo to replace or remove it.',
    photosEmpty: 'at least one photograph is required.',
    category: 'Category choices follow your Department. Both are stored separately on the listing.',
    size: 'Required for Clothing and Shoes. Optional for Bags, Accessories and Beauty.',
  },
} as const;

export type ListingCatalog = typeof LISTING_CATALOG;
export type CatalogDepartment = (typeof LISTING_CATALOG.departments)[number];
export type CatalogShippingValue = (typeof LISTING_CATALOG.shipping)[number]['value'];

export function shippingOption(value?: string) {
  return LISTING_CATALOG.shipping.find((option) => option.value === value) ?? LISTING_CATALOG.shipping[0];
}

export function shippingSummary(value?: string) {
  const option = shippingOption(value);
  return `${option.label} · ${option.eta}`;
}

export function shippingFee(value?: string) {
  return shippingOption(value).fee;
}

export function categoriesForDepartment(department: string): string[] {
  if (department === 'Women' || department === 'Men' || department === 'Kids') {
    return [...LISTING_CATALOG.categories[department]];
  }
  return [];
}
