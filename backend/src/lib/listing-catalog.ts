const CLOTHING_SIZES = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'Small' },
  { value: 'M', label: 'Medium' },
  { value: 'L', label: 'Large' },
  { value: 'XL', label: 'XL' },
] as const;

const SHOE_SIZES = [
  { value: 'EU 35', label: 'EU 35' },
  { value: 'EU 36', label: 'EU 36' },
  { value: 'EU 37', label: 'EU 37' },
  { value: 'EU 38', label: 'EU 38' },
  { value: 'EU 39', label: 'EU 39' },
  { value: 'EU 40', label: 'EU 40' },
  { value: 'EU 41', label: 'EU 41' },
  { value: 'EU 42', label: 'EU 42' },
  { value: 'EU 43', label: 'EU 43' },
  { value: 'EU 44', label: 'EU 44' },
  { value: 'EU 45', label: 'EU 45' },
  { value: 'EU 46', label: 'EU 46' },
] as const;

const ONE_SIZE = [{ value: 'One size', label: 'One size' }] as const;

export const LISTING_CATALOG = {
  departments: ['Women', 'Men', 'Kids'] as const,
  categories: {
    Women: ['Clothing', 'Shoes', 'Bags', 'Accessories', 'Beauty'],
    Men: ['Clothing', 'Shoes', 'Bags', 'Accessories', 'Grooming'],
    Kids: ['Clothing', 'Shoes', 'Bags', 'Accessories'],
  },
  conditions: ['New with tags', 'New without tags', 'Very good', 'Good', 'Satisfactory'],
  /** Seeded brand list for create-listing search; admin dashboard can manage later. */
  brands: [
    'Unbranded',
    'Adidas',
    'Aldo',
    'ASOS',
    'Birkenstock',
    'Chanel',
    'Coach',
    'Converse',
    'Dior',
    'Fenty',
    'Gucci',
    'H&M',
    'Hermès',
    'Jordan',
    "Levi's",
    'Louis Vuitton',
    'Mango',
    'Michael Kors',
    'New Balance',
    'Nike',
    'Prada',
    'Puma',
    'Reebok',
    'Steve Madden',
    'Tommy Hilfiger',
    'Topshop',
    'UGG',
    'Vans',
    'Zara',
  ],
  /** Drives which size options appear on create listing. */
  productTypes: ['Clothing', 'Shoes', 'Bags', 'Accessories', 'Beauty', 'Grooming'] as const,
  sizesByProductType: {
    Clothing: CLOTHING_SIZES,
    Shoes: SHOE_SIZES,
    Bags: ONE_SIZE,
    Accessories: ONE_SIZE,
    Beauty: ONE_SIZE,
    Grooming: ONE_SIZE,
  },
  /** Flat size list for filters / legacy clients. */
  sizes: [...CLOTHING_SIZES, ...SHOE_SIZES, ...ONE_SIZE],
  sizeRequiredProductTypes: ['Clothing', 'Shoes'] as const,
  /** @deprecated prefer sizeRequiredProductTypes */
  sizeRequiredCategories: ['Clothing', 'Shoes'] as const,
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
    productType: 'Product type sets the size chart. Clothing and Shoes require a size.',
    size: 'Required for Clothing and Shoes. Optional for Bags, Accessories and Beauty.',
  },
} as const;

export type ListingCatalog = typeof LISTING_CATALOG;
export type CatalogDepartment = (typeof LISTING_CATALOG.departments)[number];
export type CatalogShippingValue = (typeof LISTING_CATALOG.shipping)[number]['value'];
export type CatalogProductType = (typeof LISTING_CATALOG.productTypes)[number];

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

/** 5% of item price, ₦300 minimum, ₦2,500 maximum. Never on delivery. */
export function buyerProtectionFee(itemPrice: number) {
  const raw = Math.round(itemPrice * 0.05);
  return Math.min(2500, Math.max(300, raw));
}

export function categoriesForDepartment(department: string): string[] {
  if (department === 'Women' || department === 'Men' || department === 'Kids') {
    return [...LISTING_CATALOG.categories[department]];
  }
  return [];
}

export function sizesForProductType(productType: string): { value: string; label: string }[] {
  const map = LISTING_CATALOG.sizesByProductType as Record<string, readonly { value: string; label: string }[]>;
  return [...(map[productType] ?? [])];
}

export function sizeIsRequiredForProductType(productType: string) {
  return (LISTING_CATALOG.sizeRequiredProductTypes as readonly string[]).includes(productType);
}
