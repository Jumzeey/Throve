export type Department = 'Women' | 'Men' | 'Kids';
export type ListingStatus = 'available' | 'reserved' | 'sold' | 'draft' | 'hidden' | 'removed';
export type LiveStatus = 'live' | 'upcoming' | 'ended';
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
  photoUrls?: string[];
  createdAt: string;
  colour?: string;
  savedBy: string[];
};

export type ListingForm = {
  id?: string;
  photoCount: number;
  /** Local file URIs and/or remote https URLs for listing photos. */
  photoUris: string[];
  title: string;
  department: string;
  category: string;
  brand: string;
  condition: string;
  productType: string;
  size: string;
  colour: string;
  price: string;
  description: string;
  shippingMethod: string;
};

export type ListingFilters = {
  department: string;
  category: string;
  brand: string;
  size: string;
  condition: string;
  priceMin: string;
  priceMax: string;
  sort: SortOption;
};

export type LiveConnection = 'live' | 'reconnecting' | 'lost' | 'ended';

export type LiveComment = {
  id: string;
  user: string;
  text: string;
  clientId?: string;
};

export type LiveClaimStatus = 'active' | 'converted' | 'expired' | 'released';

export type LiveClaim = {
  id: string;
  sessionId: string;
  productId: string;
  listingId: string;
  username: string;
  quantity: number;
  status: LiveClaimStatus;
  expiresAt: number;
};

export type LiveStreamProduct = {
  id: string;
  liveSessionId: string;
  listingId: string;
  livePrice: number;
  stock: number;
  reservedCount: number;
  soldCount: number;
  available: number;
  isPinned: boolean;
  sortOrder: number;
  title?: string;
  photoUrls?: string[];
};

export type LiveSession = {
  id: string;
  host: string;
  title: string;
  status: LiveStatus;
  viewers?: number;
  scheduledAt?: string;
  pinnedListingId?: string;
  pinnedProductId?: string;
  department?: Department;
  description?: string;
  featuredListingIds?: string[];
  livekitRoomName?: string;
  thumbnailUrl?: string;
  startedAt?: string;
  endedAt?: string;
  products?: LiveStreamProduct[];
  moderators?: string[];
};

export type LiveKitCredentials = {
  token: string;
  url: string;
  roomName: string;
  role: 'host' | 'viewer';
  canPublish: boolean;
};

export type Review = {
  buyer: string;
  rating: number;
  comment: string;
  date: string;
};

export type DeliveryMethod = 'Standard' | 'Express';
export type OrderStatus = 'paid' | 'dispatched' | 'in_transit' | 'completed' | 'cancelled';

export type Order = {
  id: string;
  listingId: string;
  listingTitle: string;
  buyer: string;
  seller: string;
  name: string;
  address: string;
  city: string;
  state?: string | null;
  phone: string;
  deliveryMethod: DeliveryMethod;
  deliveryFee: number;
  protectionFee?: number;
  itemPrice: number;
  listedPrice?: number | null;
  offerId?: string | null;
  total: number;
  fromLiveId: string | null;
  createdAt: string;
  status: OrderStatus;
  reviewed: boolean;
  cancelReason?: string;
};

export type CheckoutDraft = {
  listingId: string;
  liveSessionId: string | null;
  liveStreamProductId?: string | null;
  claimId?: string | null;
  offerId?: string | null;
  itemPrice?: number;
  listedPrice?: number | null;
  buyer: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  deliveryNote: string;
  deliveryMethod: DeliveryMethod | null;
  expiresAt: number;
};

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
export type OfferInitiator = 'buyer' | 'seller';

export type Offer = {
  id: string;
  listingId: string;
  buyer: string;
  seller: string;
  amount: number;
  previousAmount?: number | null;
  status: OfferStatus;
  createdAt: number;
  expiresAt: number;
  initiator: OfferInitiator;
};

export type Conversation = {
  id: string;
  listingId: string;
  participants: [string, string];
  lastMessage: string;
  updatedAt: number;
  unreadBy: string[];
};

export type ChatMessage = {
  id: string;
  from: string;
  text: string;
  imageUrl?: string | null;
  createdAt: number;
};

export type PreferredLoginMethod = 'password' | 'magic_link';

export type UserProfile = {
  userId: string;
  email: string;
  name: string;
  username: string;
  dob: string;
  bio: string;
  location: string;
  photoUri?: string;
  phone?: string;
  setupComplete: boolean;
  canHostLive?: boolean;
  deactivated?: boolean;
  notifOffers?: boolean;
  notifMessages?: boolean;
  preferredLoginMethod?: PreferredLoginMethod;
  hasPassword?: boolean;
};

export type PublicProfile = {
  username: string;
  bio: string;
  location: string;
  photoUri?: string;
};

export type AppNotification = {
  id: string;
  category: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  deepLink?: string;
  readAt?: number;
  createdAt: number;
};
