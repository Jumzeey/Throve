import type { Department, Listing, LiveComment, LiveSession, Order, Review, UserProfile } from '@/data/types';

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

export const FILTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'One size'];

export const DEFAULT_SHIPPING = 'Buyer pays shipping · 3–5 days within Nigeria';

function listing(
  item: Omit<Listing, 'shipping' | 'photoCount' | 'savedBy'> & Partial<Pick<Listing, 'shipping' | 'photoCount' | 'savedBy' | 'colour'>>,
): Listing {
  return {
    shipping: DEFAULT_SHIPPING,
    photoCount: 3,
    savedBy: [],
    ...item,
  };
}

export const LISTINGS: Listing[] = [
  listing({
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
    description: 'Floral wrap dress, worn twice, true to size. Soft viscose blend with a side tie; no pulls, and the hem sits just below the knee.',
    colour: 'Floral print',
    photoCount: 4,
    createdAt: '2026-08-09',
    savedBy: ['funke_b', 'chidinma.o'],
  }),
  listing({
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
    description: 'Classic Air Max, minor scuffing on the toe. Cushioning still springy; original insoles included. Photographed in natural light.',
    colour: 'White / grey',
    photoCount: 5,
    createdAt: '2026-08-08',
    savedBy: ['ada.thrifts'],
  }),
  listing({
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
    description: '90s wash denim jacket, some fading on the collar and cuffs. All buttons present; lining intact. A relaxed vintage fit.',
    colour: 'Indigo',
    photoCount: 3,
    createdAt: '2026-07-28',
  }),
  listing({
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
    description: 'Custom-tailored Ankara set, never worn. Crop top and high-waist trousers with a concealed zip. Stored flat, no odour.',
    colour: 'Gold / navy',
    photoCount: 4,
    createdAt: '2026-08-06',
  }),
  listing({
    id: 'l5',
    title: 'Coach Shoulder Bag',
    brand: 'Coach',
    price: 48000,
    size: 'One size',
    condition: 'Good',
    department: 'Women',
    category: 'Bags',
    seller: 'lagos.preloved',
    status: 'available',
    description: 'Structured leather shoulder bag with dust bag. Corners and hardware are clean; interior slip pocket and magnetic closure. Worn a handful of times.',
    colour: 'Tan',
    photoCount: 4,
    createdAt: '2026-08-05',
    savedBy: ['ada.thrifts'],
  }),
  listing({
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
    description: 'Party dress for girls, tags attached. Tulle overlay with a satin lining and back button close. Ready for a celebration.',
    colour: 'Blush pink',
    photoCount: 3,
    createdAt: '2026-08-04',
  }),
  listing({
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
    description: 'Classic shell-toe, lightly worn. Soles have life left; no yellowing on the leather. Comes without the original box.',
    colour: 'White',
    photoCount: 3,
    createdAt: '2026-07-20',
  }),
  listing({
    id: 'l8',
    title: 'Beaded Clutch Bag',
    brand: 'Unbranded',
    price: 9500,
    size: 'One size',
    condition: 'Good',
    department: 'Women',
    category: 'Accessories',
    seller: 'lagos.preloved',
    status: 'available',
    description: 'Hand-beaded evening clutch. Beads are secure, lining is clean, and it fits a phone plus a cardholder. Chain strap included.',
    colour: 'Gold',
    photoCount: 2,
    createdAt: '2026-08-03',
  }),
  listing({
    id: 'l9',
    title: 'Silk Headwrap Set',
    brand: 'Unbranded',
    price: 6000,
    size: 'One size',
    condition: 'New with tags',
    department: 'Women',
    category: 'Accessories',
    seller: 'ada.thrifts',
    status: 'available',
    description: 'Set of three silk headwraps, unused with tags. Lightweight satin that holds a wrap without slipping. Mixed print pack as photographed.',
    colour: 'Mixed prints',
    photoCount: 3,
    createdAt: '2026-08-02',
    savedBy: ['ken.eze'],
  }),
  listing({
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
    description: 'Short-sleeve Ankara print shirt, dry-cleaned. Straight cut with a camp collar. No stains; colour still vivid.',
    colour: 'Teal print',
    photoCount: 3,
    createdAt: '2026-08-01',
  }),
  listing({
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
    description: 'Block-heel ankle boots, light scuffing on the toe. Zip still smooth; heels have been recapped. Pair with dresses or trousers.',
    colour: 'Black',
    photoCount: 3,
    createdAt: '2026-07-18',
  }),
  listing({
    id: 'l12',
    title: 'Grooming Kit — Beard & Skin',
    brand: 'Unbranded',
    price: 8500,
    size: 'One size',
    condition: 'New without tags',
    department: 'Men',
    category: 'Grooming',
    seller: 'tolu.styles',
    status: 'available',
    description: 'Beard oil, balm and trimmer set, opened once. Bottles still full; trimmer includes the original guard and charging cable.',
    colour: 'Black / wood',
    photoCount: 2,
    createdAt: '2026-07-30',
  }),
  listing({
    id: 'l13',
    title: 'Fenty Gloss Bomb Duo',
    brand: 'Fenty',
    price: 16000,
    size: 'One size',
    condition: 'New with tags',
    department: 'Women',
    category: 'Beauty',
    seller: 'ada.thrifts',
    status: 'available',
    description: 'Unopened gloss duo, shade Fussy and Hot Chocolit. Sealed, stored away from heat. A full-size pair, not minis.',
    colour: 'Nude / cocoa',
    photoCount: 2,
    createdAt: '2026-08-16',
  }),
  listing({
    id: 'l14',
    title: 'Leather Messenger Bag',
    brand: 'Unbranded',
    price: 24500,
    size: 'One size',
    condition: 'Very good',
    department: 'Men',
    category: 'Bags',
    seller: 'lagos.preloved',
    status: 'available',
    description: 'Crossbody messenger, fits a 13-inch laptop. Soft cognac leather with an outer pocket and adjustable strap. Hardware is unmarked.',
    colour: 'Cognac',
    photoCount: 4,
    createdAt: '2026-08-15',
  }),
  listing({
    id: 'l15',
    title: 'Kids Canvas Sneakers',
    brand: 'Nike',
    price: 14000,
    size: 'UK 12 kids',
    condition: 'Good',
    department: 'Kids',
    category: 'Shoes',
    seller: 'sneakerspot.ng',
    status: 'available',
    description: 'Lightly worn court sneakers, original box included. Insole print still crisp; no odour. A practical school pair.',
    colour: 'Navy',
    photoCount: 3,
    createdAt: '2026-08-14',
  }),
  listing({
    id: 'l16',
    title: 'Zara Block-Heel Mules',
    brand: 'Zara',
    price: 17500,
    size: '39',
    condition: 'Very good',
    department: 'Women',
    category: 'Shoes',
    seller: 'ada.thrifts',
    status: 'available',
    description: 'Worn twice to events, soles still clean. Cushioned insole, stable block heel. A small mark on the inner left has been noted in photos.',
    colour: 'Nude',
    photoCount: 4,
    createdAt: '2026-08-13',
  }),
  listing({
    id: 'l17',
    title: 'Beaded Bracelet Set',
    brand: 'Unbranded',
    price: 4500,
    size: 'One size',
    condition: 'New without tags',
    department: 'Men',
    category: 'Accessories',
    seller: 'vintagevault.ng',
    status: 'available',
    description: 'Three-piece wooden bead bracelet set. Stretch fit, unworn. Packed as a set of three complementary tones.',
    colour: 'Brown / black',
    photoCount: 2,
    createdAt: '2026-08-12',
  }),
  listing({
    id: 'l18',
    title: 'Kids Mini Backpack',
    brand: 'Unbranded',
    price: 8000,
    size: 'One size',
    condition: 'Good',
    department: 'Kids',
    category: 'Bags',
    seller: 'tolu.styles',
    status: 'available',
    description: 'School backpack with chest strap, one scuff on the base. Two compartments and a water-bottle pocket. Zippers run smoothly.',
    colour: 'Red',
    photoCount: 3,
    createdAt: '2026-08-11',
  }),
  listing({
    id: 'l19',
    title: 'Kids Hair Bow Pack',
    brand: 'Unbranded',
    price: 3500,
    size: 'One size',
    condition: 'New with tags',
    department: 'Kids',
    category: 'Accessories',
    seller: 'ada.thrifts',
    status: 'available',
    description: 'Pack of six satin bows, unused with tags. Clips attached; colours match the pastel mix photographed.',
    colour: 'Pastel mix',
    photoCount: 1,
    createdAt: '2026-08-10',
  }),
];

export const LIVE_SESSIONS: LiveSession[] = [
  {
    id: 'live1',
    host: 'ada.thrifts',
    title: 'Friday Thrift Pull',
    status: 'live',
    viewers: 128,
    pinnedListingId: 'l1',
    department: 'Women',
    featuredListingIds: ['l1', 'l9', 'l13'],
  },
  {
    id: 'live2',
    host: 'sneakerspot.ng',
    title: 'Sneaker Restock',
    status: 'upcoming',
    scheduledAt: 'Tomorrow, 6:00 PM',
    department: 'Men',
  },
];

export const LIVE_COMMENTS: Record<string, LiveComment[]> = {
  live1: [
    { id: 'c1', user: 'funke_b', text: 'Is the wrap dress still available?' },
    { id: 'c2', user: 'chidinma.o', text: 'Love this pull' },
    { id: 'c3', user: 'ijeoma.a', text: 'Size M please!' },
  ],
};

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

export const SEED_SELLERS = Array.from(new Set(LISTINGS.map((item) => item.seller)));

export const FILTER_BRANDS = Array.from(
  new Set(LISTINGS.map((item) => item.brand).filter((brand) => brand && brand !== 'Unbranded')),
).sort();

export const DEMO_USER: UserProfile = {
  userId: 'u-ada',
  email: 'ada.nwosu@gmail.com',
  name: 'Ada Nwosu',
  username: 'ada.thrifts',
  dob: '12/03/1994',
  bio: 'Curating pre-loved fashion finds. Fast shipping, honest condition notes.',
  location: 'Lagos, NG',
  phone: '+234 803 123 4567',
  setupComplete: true,
  canHostLive: true,
  notifOffers: true,
  notifMessages: true,
  preferredLoginMethod: 'password',
  hasPassword: true,
};

export function sellerRatingInfo(username: string, reviews: Record<string, Review[]> = REVIEWS) {
  const list = reviews[username] ?? [];
  if (!list.length) return { avg: 0, count: 0 };
  const sum = list.reduce((total, review) => total + review.rating, 0);
  return { avg: sum / list.length, count: list.length };
}

export function getPublicSeller(username: string) {
  if (username === DEMO_USER.username) {
    return { username, bio: DEMO_USER.bio, location: DEMO_USER.location };
  }
  return { username, bio: 'Trusted Throve seller.', location: 'Lagos, NG' };
}

export const SEED_ORDERS: Order[] = [
  {
    id: 'ORD1000',
    listingId: 'l11',
    listingTitle: 'Leather Ankle Boots',
    buyer: 'ijeoma.a',
    seller: 'ada.thrifts',
    name: 'Ijeoma Adeyemi',
    address: '14 Admiralty Way, Lekki',
    city: 'Lagos',
    phone: '+234 802 555 0101',
    deliveryMethod: 'Standard',
    deliveryFee: 2500,
    itemPrice: 21000,
    total: 23500,
    fromLiveId: null,
    createdAt: '2026-07-20T10:00:00.000Z',
    status: 'paid',
    reviewed: false,
  },
];

export const CANCEL_REASONS = ['Changed my mind', 'Unable to fulfil order', 'Item unavailable', 'Other'];

export function getListing(id: string) {
  return LISTINGS.find((item) => item.id === id);
}

export function getAvailableListings() {
  return LISTINGS.filter((item) => item.status === 'available');
}

export function getCategoriesForDepartment(department: string) {
  if (department === 'Women' || department === 'Men' || department === 'Kids') {
    return CATEGORY_MAP[department];
  }
  return [];
}

export function getListingsForSeller(username: string) {
  return LISTINGS.filter((item) => item.seller === username);
}
