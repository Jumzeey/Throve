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
  category?: string;
  department?: string;
  size?: string;
  condition?: string;
};

export type LiveSession = {
  id: string;
  host: string;
  hostPhotoUrl?: string;
  title: string;
  status: LiveStatus;
  viewers?: number;
  scheduledAt?: string;
  pinnedListingId?: string;
  pinnedProductId?: string;
  department?: Department;
  category?: string;
  description?: string;
  featuredListingIds?: string[];
  livekitRoomName?: string;
  thumbnailUrl?: string;
  startedAt?: string;
  endedAt?: string;
  peakViewers?: number;
  productsShown?: number;
  products?: LiveStreamProduct[];
  moderators?: string[];
};

export type LiveSessionSummary = {
  sessionId: string;
  title: string;
  durationMinutes: number;
  peakViewers: number;
  productsShown: number;
  productsSold: number;
  endedReason?: 'host' | 'connection';
};

export type LiveMediaProvider = 'livekit' | 'ivs' | 'simulated';

/** Provider-agnostic media join credentials (LiveKit now; IVS later). */
export type LiveMediaCredentials = {
  provider: LiveMediaProvider;
  role: 'host' | 'viewer';
  canPublish: boolean;
  token?: string;
  url?: string;
  roomName?: string;
  ingestEndpoint?: string;
  streamKey?: string;
  playbackUrl?: string;
  rtmpsUrl?: string;
};

/** @deprecated Use LiveMediaCredentials */
export type LiveKitCredentials = LiveMediaCredentials & {
  token: string;
  url: string;
  roomName: string;
};

export type Review = {
  buyer: string;
  rating: number;
  comment: string;
  date: string;
};

export type DeliveryMethod = 'Standard' | 'Express';
export type OrderStatus = 'paid' | 'dispatched' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';

export type PayoutStatus =
  | 'not_yet_eligible'
  | 'eligible'
  | 'processing'
  | 'paid_out'
  | 'on_hold'
  | 'failed';

export type DisputeStatus = 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'closed';

export type OrderDispute = {
  id: string;
  orderId: string;
  reason: string;
  status: DisputeStatus;
  buyerNote: string;
  sellerResponse: string;
  evidenceUrls: string[];
  createdAt: string;
  resolvedAt?: string | null;
};

export type OrderPayout = {
  itemSalePrice: number;
  commissionRate: number;
  commission: number;
  processingFee: number;
  netPayout: number;
  status: PayoutStatus;
  verificationRequired: boolean;
};

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
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  paidAt?: string | null;
  dispatchedAt?: string | null;
  inTransitAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  autoCompleteAt?: string | null;
  payoutStatus?: PayoutStatus;
  dispute?: OrderDispute | null;
  payout?: OrderPayout;
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
  /** Recipient device received the message. */
  deliveredAt?: number | null;
  /** Recipient opened the conversation. */
  readAt?: number | null;
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
  notifLive?: boolean;
  notifListings?: boolean;
  notifOrders?: boolean;
  notifPushEnabled?: boolean;
  notifMessageTone?: 'default' | 'note' | 'chime' | 'soft' | 'none';
  lastSeenAt?: number;
  preferredLoginMethod?: PreferredLoginMethod;
  hasPassword?: boolean;
};

export type PublicProfile = {
  username: string;
  userId?: string;
  bio: string;
  location: string;
  photoUri?: string;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  lastSeenAt?: number | null;
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
