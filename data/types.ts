export type Department = 'Women' | 'Men' | 'Kids';
export type ListingStatus = 'available' | 'reserved' | 'sold' | 'draft' | 'hidden';
export type LiveStatus = 'live' | 'upcoming' | 'ended';
export type PriceBand = 'Under 15k' | '15k-30k' | 'Over 30k';
export type SortOption = 'Newest' | 'Lowest price' | 'Highest price';

export type Listing = {
  id: string;
  title: string;
  brand: string;
  price: number;
  size: string;
  condition: string;
  department: Department;
  category: string;
  seller: string;
  status: ListingStatus;
  description: string;
  shipping: string;
  photoCount: number;
  createdAt: string;
  colour?: string;
  savedBy: string[];
};

export type ListingFilters = {
  department: string;
  category: string;
  brand: string;
  condition: string;
  price: string;
  sort: SortOption;
};

export type LiveConnection = 'live' | 'lost' | 'ended';

export type LiveComment = {
  id: string;
  user: string;
  text: string;
};

export type LiveClaim = {
  sessionId: string;
  listingId: string;
  username: string;
  expiresAt: number;
};

export type LiveSession = {
  id: string;
  host: string;
  title: string;
  status: LiveStatus;
  viewers?: number;
  scheduledAt?: string;
  pinnedListingId?: string;
  department?: Department;
  description?: string;
  featuredListingIds?: string[];
};

export type Review = {
  buyer: string;
  rating: number;
  comment: string;
  date: string;
};

export type DeliveryMethod = 'Standard' | 'Express';

export type Order = {
  id: string;
  listingId: string;
  listingTitle: string;
  buyer: string;
  seller: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  deliveryFee: number;
  itemPrice: number;
  total: number;
  fromLiveId: string | null;
  createdAt: string;
};

export type CheckoutDraft = {
  listingId: string;
  liveSessionId: string | null;
  buyer: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  expiresAt: number;
};

export type UserProfile = {
  userId: string;
  email: string;
  name: string;
  username: string;
  dob: string;
  bio: string;
  location: string;
  photoUri?: string;
  setupComplete: boolean;
  canHostLive?: boolean;
};
