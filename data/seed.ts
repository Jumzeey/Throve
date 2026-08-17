import type { Department, Listing, LiveSession, Review, UserProfile } from '@/data/types';

export const DEPARTMENTS: Department[] = ['Women', 'Men', 'Kids'];

export const CATEGORY_MAP: Record<Department, string[]> = {
  Women: ['Clothing', 'Shoes', 'Bags', 'Accessories', 'Beauty'],
  Men: ['Clothing', 'Shoes', 'Bags', 'Accessories', 'Grooming'],
  Kids: ['Clothing', 'Shoes', 'Bags', 'Accessories'],
};

export const CONDITIONS = [
  'New with tags',
  'New without tags',
  'Very good',
  'Good',
  'Satisfactory',
];

export const LISTINGS: Listing[] = [
  {
    id: 'l1',
    title: 'Zara Wrap Dress',
    brand: 'Zara',
    price: 18500,
    size: 'M',
    condition: 'Very good',
    department: 'Women',
    category: 'Clothing',
    seller: 'ada.thrifts',
    status: 'available',
    description: 'Floral wrap dress, worn twice, true to size.',
    savedBy: ['funke_b', 'chidinma.o'],
  },
  {
    id: 'l2',
    title: 'Nike Air Max Trainers',
    brand: 'Nike',
    price: 32000,
    size: 'UK 9',
    condition: 'Good',
    department: 'Men',
    category: 'Shoes',
    seller: 'sneakerspot.ng',
    status: 'available',
    description: 'Classic Air Max, minor scuffing on the toe.',
    savedBy: [],
  },
  {
    id: 'l3',
    title: 'Vintage Denim Jacket',
    brand: "Levi's",
    price: 14500,
    size: 'L',
    condition: 'Satisfactory',
    department: 'Women',
    category: 'Clothing',
    seller: 'vintagevault.ng',
    status: 'reserved',
    description: '90s wash denim jacket, some fading.',
    savedBy: [],
  },
  {
    id: 'l4',
    title: 'Ankara Two-Piece Set',
    brand: 'Unbranded',
    price: 22000,
    size: 'M',
    condition: 'New without tags',
    department: 'Women',
    category: 'Clothing',
    seller: 'tolu.styles',
    status: 'available',
    description: 'Custom-tailored Ankara set, never worn.',
    savedBy: [],
  },
  {
    id: 'l5',
    title: 'Coach Shoulder Bag',
    brand: 'Coach',
    price: 48000,
    size: '—',
    condition: 'Good',
    department: 'Women',
    category: 'Bags',
    seller: 'lagos.preloved',
    status: 'available',
    description: 'Structured leather shoulder bag with dust bag.',
    savedBy: [],
  },
  {
    id: 'l6',
    title: 'Kids Occasion Dress',
    brand: 'Unbranded',
    price: 12000,
    size: '5–6 yrs',
    condition: 'New with tags',
    department: 'Kids',
    category: 'Clothing',
    seller: 'tolu.styles',
    status: 'available',
    description: 'Party dress for girls, tags attached.',
    savedBy: [],
  },
  {
    id: 'l7',
    title: 'Adidas Superstar Sneakers',
    brand: 'Adidas',
    price: 27000,
    size: 'UK 8',
    condition: 'Very good',
    department: 'Men',
    category: 'Shoes',
    seller: 'sneakerspot.ng',
    status: 'sold',
    description: 'Classic shell-toe, lightly worn.',
    savedBy: [],
  },
  {
    id: 'l8',
    title: 'Beaded Clutch Bag',
    brand: 'Unbranded',
    price: 9500,
    size: '—',
    condition: 'Good',
    department: 'Women',
    category: 'Accessories',
    seller: 'lagos.preloved',
    status: 'available',
    description: 'Hand-beaded evening clutch.',
    savedBy: [],
  },
  {
    id: 'l9',
    title: 'Silk Headwrap Set',
    brand: 'Unbranded',
    price: 6000,
    size: '—',
    condition: 'New with tags',
    department: 'Women',
    category: 'Accessories',
    seller: 'ada.thrifts',
    status: 'available',
    description: 'Set of three silk headwraps, unused.',
    savedBy: ['ken.eze'],
  },
  {
    id: 'l10',
    title: "Men's Ankara Shirt",
    brand: 'Unbranded',
    price: 13500,
    size: 'L',
    condition: 'Very good',
    department: 'Men',
    category: 'Clothing',
    seller: 'tolu.styles',
    status: 'available',
    description: 'Short-sleeve Ankara print shirt, dry-cleaned.',
    savedBy: [],
  },
  {
    id: 'l11',
    title: 'Leather Ankle Boots',
    brand: 'Unbranded',
    price: 21000,
    size: '40',
    condition: 'Good',
    department: 'Women',
    category: 'Shoes',
    seller: 'ada.thrifts',
    status: 'sold',
    description: 'Block-heel ankle boots, light scuffing on the toe.',
    savedBy: [],
  },
  {
    id: 'l12',
    title: 'Grooming Kit — Beard & Skin',
    brand: 'Unbranded',
    price: 8500,
    size: '—',
    condition: 'New without tags',
    department: 'Men',
    category: 'Grooming',
    seller: 'tolu.styles',
    status: 'available',
    description: 'Beard oil, balm and trimmer set, opened once.',
    savedBy: [],
  },
];

export const LIVE_SESSIONS: LiveSession[] = [
  {
    id: 'live1',
    host: 'ada.thrifts',
    title: 'Friday Thrift Pull',
    status: 'live',
    viewers: 128,
    pinnedListingId: 'l1',
  },
  {
    id: 'live2',
    host: 'sneakerspot.ng',
    title: 'Sneaker Restock',
    status: 'upcoming',
    scheduledAt: 'Tomorrow, 6:00 PM',
  },
];

export const REVIEWS: Record<string, Review[]> = {
  'ada.thrifts': [
    { buyer: 'ijeoma.a', rating: 5, comment: 'Exactly as described, fast shipping.', date: '3 weeks ago' },
    { buyer: 'chidinma.o', rating: 4, comment: 'Nice dress, slightly small.', date: '1 month ago' },
  ],
  'sneakerspot.ng': [{ buyer: 'femi.k', rating: 5, comment: 'Great sneakers, true to size.', date: '2 weeks ago' }],
  'lagos.preloved': [],
  'vintagevault.ng': [
    { buyer: 'ada.thrifts', rating: 3, comment: 'Item had more wear than expected.', date: '1 month ago' },
  ],
  'tolu.styles': [],
};

export const SEED_SELLERS = Array.from(new Set(LISTINGS.map((listing) => listing.seller)));

export const DEMO_USER: UserProfile = {
  userId: 'u-ada',
  email: 'ada.nwosu@gmail.com',
  name: 'Ada Nwosu',
  username: 'ada.thrifts',
  dob: '12/03/1994',
  bio: 'Curating pre-loved fashion finds. Fast shipping, honest condition notes.',
  location: 'Lagos, NG',
  setupComplete: true,
};

export function getListing(id: string) {
  return LISTINGS.find((listing) => listing.id === id);
}

export function getAvailableListings() {
  return LISTINGS.filter((listing) => listing.status === 'available');
}

export function getCategoriesForDepartment(department: string) {
  if (department === 'Women' || department === 'Men' || department === 'Kids') {
    return CATEGORY_MAP[department];
  }
  return [];
}
