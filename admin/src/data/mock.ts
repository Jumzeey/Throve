export type MockUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  status: 'Active' | 'Restricted' | 'Suspended' | 'Deactivated' | 'Banned';
  seller: boolean;
  payoutVerified: boolean;
  kycStatus: 'Verified' | 'Pending' | 'Failed' | 'None' | 'Rejected';
  payoutAccountMasked: string;
  liveHost: 'None' | 'Pending' | 'Approved' | 'Revoked';
  flags: number;
  listingsActive: number;
  listingsHidden?: number;
  ordersSold: number;
  ordersBought?: number;
  streams: number;
  reviewAvg?: number;
  reviewCount?: number;
  location?: string;
  joined: string;
  department: string;
  aiPriority: 'High' | 'Med' | 'Low';
  aiSummary: string;
  relatedReports: string[];
  relatedDisputes: string[];
  history: { at: string; text: string }[];
  /** Pending permanent-ban recommendation from Trust & Safety (Super Admin executes). */
  banRecommendation?: { by: string; role: string; reason: string; at: string };
  /** Another admin changed this record while it was open (concurrency demo). */
  recordStale?: { by: string; action: string; at: string };
  /** Enforcement already applied — no further action taken. */
  actionAlreadyApplied?: { action: string; by: string; at: string };
};

export type MockListing = {
  id: string;
  title: string;
  seller: string;
  department: string;
  category: string;
  condition: string;
  price: number;
  status: 'Available' | 'Reserved' | 'Sold' | 'Hidden' | 'Draft';
  reports: number;
  brand: string;
  size: string;
  reservedOrderId?: string;
  aiSignal: string;
  catalogReadonly: { label: string; value: string }[];
};

export type MockReport = {
  id: string;
  route: 'User' | 'Listing' | 'Live' | 'Live comment';
  reason: string;
  target: string;
  reporter: string;
  status: 'Awaiting' | 'Linked' | 'Action taken' | 'Dismissed';
  priority: 'P1' | 'P2' | 'P3';
  assigned: string;
  department: string;
  createdAt: string;
  evidenceCount: number;
  evidenceRestricted: boolean;
  aiSummary: string;
  routingHint: string;
};

export type MockLive = {
  id: string;
  host: string;
  title: string;
  status: 'Live' | 'Upcoming' | 'Ended' | 'Incident';
  viewers: number;
  reports: number;
  startedAt: string;
  hostApproved: boolean;
  appointedMods: string[];
  flaggedComments: { id: string; user: string; text: string; reason: string }[];
  timeline: { id: string; at: string; title: string; detail?: string; tone?: 'default' | 'warn' | 'danger' | 'ok' }[];
};

export type MockOrder = {
  id: string;
  listing: string;
  listingId: string;
  buyer: string;
  seller: string;
  itemPrice: number;
  deliveryFee: number;
  total: number;
  status: 'Paid' | 'Dispatched' | 'Completed' | 'Cancelled' | 'Disputed';
  delivery: string;
  createdAt: string;
  paymentId: string;
  disputeId?: string;
  timeline: { id: string; at: string; title: string; detail?: string; tone?: 'default' | 'warn' | 'danger' | 'ok' }[];
};

export type MockDispute = {
  id: string;
  orderId: string;
  listingId?: string;
  paymentId?: string;
  reason: string;
  status: 'Open' | 'With T&S' | 'Approved for refund' | 'Denied' | 'Closed';
  /** Queue chip the case belongs to in the Disputes Hi-Fi. */
  queue: 'open' | 'decision_ready' | 'evidence_incomplete' | 'awaiting_buyer';
  openedAt: string;
  openLabel: string;
  buyer: string;
  seller: string;
  amount: number;
  priority: 'P1' | 'P2' | 'P3';
  aiPriority: 'High' | 'Med' | 'Low';
  payoutOnHold: boolean;
  evidenceComplete: boolean;
  decisionReady: boolean;
  aiSummary: string;
  aiRecommendation: string;
  aiConfidence: 'high' | 'medium' | 'low';
  suggestedOutcome: string;
  statements: { party: 'buyer' | 'seller'; handle: string; at: string; text: string }[];
  evidenceThumbs: { id: string; label: string; missing?: boolean }[];
  evidenceLinks: { id: string; label: string; disabled?: boolean }[];
  evidence: { id: string; label: string; restricted?: boolean }[];
  timeline: { id: string; at: string; title: string; detail?: string; tone?: 'default' | 'warn' | 'danger' | 'ok' }[];
  history: { at: string; text: string; by: string }[];
  decision?: 'Refund buyer' | 'Release to seller' | 'Partial refund' | 'Close';
  defaultReason?: string;
  /** Unassigned / new case in queue. */
  unassigned?: boolean;
  evidenceBlockReason?: string;
  awaitingBuyerSince?: string;
  recordStale?: { by: string; action: string; at: string };
  actionAlreadyApplied?: { action: string; by: string; at: string };
  decidedBy?: string;
  decidedAt?: string;
};

export type MockPayment = {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: 'Captured' | 'Pending' | 'Failed' | 'Attention';
  at: string;
  providerRefMasked: string;
  attentionReason?: string;
  aiDuplicateRisk?: string;
  breakdown: { label: string; amount: number }[];
};

export type MockRefund = {
  id: string;
  orderId: string;
  amount: number;
  status: 'Approved' | 'Executed' | 'Failed';
  approvedBy: string;
  itemAmount: number;
  deliveryAmount: number;
  includeDelivery: boolean;
  components: { label: string; amount: number }[];
};

export type MockPayout = {
  id: string;
  seller: string;
  amount: number;
  status: 'Queued' | 'Paid' | 'On hold';
  period: string;
  saleTotal: number;
  commission: number;
  fees: number;
  net: number;
  commissionRate: number;
  holdReason?: string;
  promoZeroCommission?: boolean;
};

export type MockReview = {
  id: string;
  orderId: string;
  seller: string;
  buyer: string;
  rating: number;
  comment: string;
  status: 'Visible' | 'Hidden' | 'Flagged';
  aiSummary: string;
  createdAt: string;
};

export type MockAudit = {
  id: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  at: string;
  sensitivity: 'Standard' | 'Sensitive' | 'Finance';
  detail: string;
  visibleTo: Array<'super_admin' | 'trust_safety' | 'support' | 'finance'>;
};

export const mockUsers: MockUser[] = [
  {
    id: 'USR-2201',
    username: 'lagos_luxe',
    name: 'Bisi Adeleke',
    email: 'bisi@lagosluxe.ng',
    status: 'Active',
    seller: true,
    payoutVerified: true,
    kycStatus: 'Verified',
    payoutAccountMasked: 'Provider token ···· 4417',
    liveHost: 'Approved',
    flags: 2,
    listingsActive: 24,
    listingsHidden: 3,
    ordersSold: 41,
    ordersBought: 12,
    streams: 9,
    reviewAvg: 4.6,
    reviewCount: 38,
    location: 'Lagos',
    joined: '14 Mar 2026',
    department: 'Women',
    aiPriority: 'Med',
    aiSummary:
      '2 reports in 30 days, both alleging item not as described. One open dispute. Pattern is below the repeat-risk threshold; no linked accounts detected.',
    relatedReports: ['RPT-2188 · not as described', 'RPT-2091 · not as described'],
    relatedDisputes: ['DSP-4471 · never arrived'],
    history: [
      { at: '2026-08-24 11:02', text: 'Internal note added — by A. Nwosu (Customer Support)' },
      { at: '2026-08-12 09:20', text: 'Warning issued — listing accuracy — by O. Bello (Trust & Safety)' },
      { at: '2026-04-02 10:00', text: 'Payout verification approved' },
    ],
    recordStale: {
      by: 'O. Bello',
      action: 'suspended this account',
      at: 'moments ago',
    },
  },
  {
    id: 'USR-1044',
    username: 'vintage_ng',
    name: 'Nkem Ide',
    email: 'nkem@example.com',
    status: 'Restricted',
    seller: true,
    payoutVerified: false,
    kycStatus: 'Pending',
    payoutAccountMasked: '•••• 1190',
    liveHost: 'None',
    flags: 1,
    listingsActive: 8,
    listingsHidden: 1,
    ordersSold: 18,
    ordersBought: 2,
    streams: 0,
    reviewAvg: 4.1,
    reviewCount: 14,
    location: 'Abuja',
    joined: 'Jan 2026',
    department: 'Women',
    aiPriority: 'High',
    aiSummary: 'Restricted after incomplete KYC. One open flag on listing accuracy. Hold live host until payout clears.',
    relatedReports: ['RPT-902'],
    relatedDisputes: [],
    history: [
      { at: '2026-08-20 16:40', text: 'Account restricted — incomplete KYC' },
      { at: '2026-08-18 09:10', text: 'KYC documents requested' },
    ],
  },
  {
    id: 'USR-1102',
    username: 'ada_e',
    name: 'Ada Eze',
    email: 'ada.e@example.com',
    status: 'Active',
    seller: false,
    payoutVerified: false,
    kycStatus: 'None',
    payoutAccountMasked: '—',
    liveHost: 'None',
    flags: 0,
    listingsActive: 0,
    ordersSold: 0,
    ordersBought: 7,
    streams: 0,
    location: 'Lagos',
    joined: 'Feb 2026',
    department: '—',
    aiPriority: 'Low',
    aiSummary: 'Buyer-only account. One open dispute as buyer. No enforcement history.',
    relatedReports: [],
    relatedDisputes: ['DSP-4471'],
    history: [{ at: '2026-08-28 11:02', text: 'Opened dispute DSP-4471' }],
  },
  {
    id: 'USR-1001',
    username: 'kemi_curates',
    name: 'Kemi Ogun',
    email: 'kemi@throve.dev',
    status: 'Active',
    seller: true,
    payoutVerified: true,
    kycStatus: 'Verified',
    payoutAccountMasked: '•••• 4821',
    liveHost: 'Approved',
    flags: 1,
    listingsActive: 31,
    listingsHidden: 0,
    ordersSold: 96,
    ordersBought: 4,
    streams: 14,
    reviewAvg: 4.8,
    reviewCount: 72,
    location: 'Lagos',
    joined: 'Nov 2025',
    department: 'Women',
    aiPriority: 'Low',
    aiSummary: 'High-volume seller with strong review average. One historical flag, closed. Low enforcement priority.',
    relatedReports: ['RPT-1801'],
    relatedDisputes: [],
    history: [
      { at: '2026-07-02 11:00', text: 'Payout KYC verified' },
      { at: '2025-12-01 08:00', text: 'Live host approved' },
    ],
  },
  {
    id: 'USR-1188',
    username: 'fastdeals_ng',
    name: 'Femi Okoro',
    email: 'femi@fastdeals.ng',
    status: 'Suspended',
    seller: true,
    payoutVerified: false,
    kycStatus: 'Rejected',
    payoutAccountMasked: '•••• 3301',
    liveHost: 'None',
    flags: 4,
    listingsActive: 0,
    listingsHidden: 7,
    ordersSold: 7,
    ordersBought: 0,
    streams: 0,
    location: 'Ibadan',
    joined: 'Jun 2026',
    department: 'Men',
    aiPriority: 'High',
    aiSummary: 'Suspended 7 days for repeated counterfeit signals. KYC rejected. Recommend permanent ban review if pattern continues.',
    relatedReports: ['RPT-902', 'RPT-904', 'RPT-911'],
    relatedDisputes: ['DSP-4402', 'DSP-4410'],
    history: [
      { at: '2026-08-26 10:00', text: 'Suspended 7 days — to 2 Sep — by O. Bello (Trust & Safety)' },
      { at: '2026-08-24 16:02', text: 'Listings hidden after counterfeit cluster' },
      { at: '2026-08-22 09:40', text: 'Permanent ban recommended — by O. Bello (Trust & Safety)' },
    ],
    banRecommendation: {
      by: 'O. Bello',
      role: 'Trust & Safety',
      reason: 'Repeated counterfeit listings after warning — 4 upheld reports.',
      at: '2026-08-22 09:40',
    },
    actionAlreadyApplied: {
      action: 'Suspension',
      by: 'O. Bello',
      at: '18:20 yesterday',
    },
  },
  {
    id: 'USR-1304',
    username: 'tolu.a',
    name: 'Tolu Ajayi',
    email: 'tolu@example.com',
    status: 'Deactivated',
    seller: false,
    payoutVerified: false,
    kycStatus: 'None',
    payoutAccountMasked: '—',
    liveHost: 'None',
    flags: 0,
    listingsActive: 0,
    ordersSold: 0,
    ordersBought: 3,
    streams: 0,
    location: 'Lagos',
    joined: 'Mar 2026',
    department: '—',
    aiPriority: 'Low',
    aiSummary: 'User-initiated deactivation. No open enforcement items.',
    relatedReports: [],
    relatedDisputes: [],
    history: [{ at: '2026-08-30 14:20', text: 'Deactivated by user' }],
  },
  {
    id: 'USR-1410',
    username: 'resell_bot',
    name: 'Unknown',
    email: 'resell@blocked.invalid',
    status: 'Banned',
    seller: true,
    payoutVerified: false,
    kycStatus: 'Rejected',
    payoutAccountMasked: '—',
    liveHost: 'None',
    flags: 9,
    listingsActive: 0,
    listingsHidden: 12,
    ordersSold: 0,
    ordersBought: 0,
    streams: 0,
    location: '—',
    joined: 'Jul 2026',
    department: '—',
    aiPriority: 'High',
    aiSummary: 'Banned by Super Admin after coordinated resale abuse. Linked accounts under review.',
    relatedReports: ['RPT-950', 'RPT-951', 'RPT-952'],
    relatedDisputes: [],
    history: [{ at: '2026-08-25 18:00', text: 'Permanently banned by Super Admin' }],
  },
];

export const mockListings: MockListing[] = [
  {
    id: 'LST-51872',
    title: 'Vintage Levi’s Jacket',
    seller: 'ada.thrifts',
    department: 'Women',
    category: 'Outerwear',
    condition: 'Good',
    price: 18500,
    status: 'Available',
    reports: 3,
    brand: 'Levi’s',
    size: 'M',
    aiSignal: 'Cluster of 3 “counterfeit” reports in 48h. Photo authenticity review recommended before remove.',
    catalogReadonly: [
      { label: 'Brand', value: 'Levi’s' },
      { label: 'Size', value: 'M' },
      { label: 'Colour', value: 'Indigo' },
      { label: 'Posted', value: '12 Aug 2026' },
    ],
  },
  {
    id: 'LST-51901',
    title: 'Nike Dunk Low Panda',
    seller: 'kemi.closet',
    department: 'Men',
    category: 'Shoes',
    condition: 'Like new',
    price: 42000,
    status: 'Reserved',
    reports: 0,
    brand: 'Nike',
    size: '42',
    reservedOrderId: 'ORD1048',
    aiSignal: 'Reserved against open dispute. Do not remove while order is disputed — pause fulfillment instead.',
    catalogReadonly: [
      { label: 'Brand', value: 'Nike' },
      { label: 'Size', value: '42' },
      { label: 'Colour', value: 'Black/White' },
      { label: 'Posted', value: '28 Aug 2026' },
    ],
  },
  {
    id: 'LST-52011',
    title: 'Zara Linen Set',
    seller: 'ada.thrifts',
    department: 'Women',
    category: 'Sets',
    condition: 'Excellent',
    price: 12000,
    status: 'Sold',
    reports: 0,
    brand: 'Zara',
    size: 'S',
    aiSignal: 'No risk signals. Catalog record only.',
    catalogReadonly: [
      { label: 'Brand', value: 'Zara' },
      { label: 'Size', value: 'S' },
      { label: 'Colour', value: 'Sand' },
      { label: 'Posted', value: '5 Aug 2026' },
    ],
  },
  {
    id: 'LST-52100',
    title: 'Counterfeit-looking Tee',
    seller: 'shade.vintage',
    department: 'Men',
    category: 'Tops',
    condition: 'Fair',
    price: 3500,
    status: 'Hidden',
    reports: 5,
    brand: 'Unknown',
    size: 'L',
    aiSignal: 'Already hidden. Restore only if seller provides provenance.',
    catalogReadonly: [
      { label: 'Brand', value: 'Unknown' },
      { label: 'Size', value: 'L' },
      { label: 'Colour', value: 'White' },
      { label: 'Posted', value: '18 Aug 2026' },
    ],
  },
];

export const mockReports: MockReport[] = [
  {
    id: 'RPT-901',
    route: 'Listing',
    reason: 'Suspected counterfeit',
    target: 'LST-51872',
    reporter: 'tunde.buys',
    status: 'Awaiting',
    priority: 'P1',
    assigned: 'Unassigned',
    department: 'Women',
    createdAt: '2026-08-24 14:12',
    evidenceCount: 4,
    evidenceRestricted: false,
    aiSummary: 'Language matches prior counterfeit cluster. Route to Listings for photo review.',
    routingHint: 'Act in Listings · associate evidence to LST-51872',
  },
  {
    id: 'RPT-902',
    route: 'User',
    reason: 'Harassment in chat',
    target: 'USR-1188',
    reporter: 'kemi.closet',
    status: 'Linked',
    priority: 'P2',
    assigned: 'O. Bello',
    department: 'Trust',
    createdAt: '2026-08-24 15:01',
    evidenceCount: 2,
    evidenceRestricted: true,
    aiSummary: 'Chat excerpts include banned phrases. Linked user already suspended — close or escalate audit.',
    routingHint: 'Act in Users · review suspension scope',
  },
  {
    id: 'RPT-903',
    route: 'Live comment',
    reason: 'Hate speech',
    target: 'LVE-220',
    reporter: 'ada.thrifts',
    status: 'Awaiting',
    priority: 'P1',
    assigned: 'Unassigned',
    department: 'Live',
    createdAt: '2026-08-25 19:40',
    evidenceCount: 1,
    evidenceRestricted: false,
    aiSummary: 'Single flagged comment during active stream. Prefer comment remove before ending Live.',
    routingHint: 'Act in Live · review flagged comments',
  },
  {
    id: 'RPT-904',
    route: 'Live',
    reason: 'Unsafe behaviour',
    target: 'LVE-218',
    reporter: 'tunde.buys',
    status: 'Action taken',
    priority: 'P1',
    assigned: 'O. Bello',
    department: 'Live',
    createdAt: '2026-08-23 21:10',
    evidenceCount: 6,
    evidenceRestricted: false,
    aiSummary: 'Session ended; host revoked. Report can be closed after audit note.',
    routingHint: 'Closed path · audit already written',
  },
];

export const mockLive: MockLive[] = [
  {
    id: 'LVE-220',
    host: 'ada.thrifts',
    title: 'Sunday thrift haul',
    status: 'Live',
    viewers: 128,
    reports: 1,
    startedAt: '2026-09-02 20:05',
    hostApproved: true,
    appointedMods: ['mod.joy', 'mod.kai'],
    flaggedComments: [
      { id: 'C-1', user: 'anon.shop', text: '[redacted hate speech]', reason: 'Hate speech' },
      { id: 'C-2', user: 'buyer.x', text: 'Spam link promo', reason: 'Spam' },
    ],
    timeline: [
      { id: 't1', at: '20:05', title: 'Session started', tone: 'ok' },
      { id: 't2', at: '20:22', title: 'Comment flagged', detail: 'Hate speech · RPT-903', tone: 'warn' },
      { id: 't3', at: '20:31', title: 'Moderator joined', detail: '@mod.joy' },
    ],
  },
  {
    id: 'LVE-221',
    host: 'kemi.closet',
    title: 'Sneaker drops',
    status: 'Upcoming',
    viewers: 0,
    reports: 0,
    startedAt: '2026-09-03 18:00',
    hostApproved: false,
    appointedMods: [],
    flaggedComments: [],
    timeline: [
      { id: 't1', at: 'Scheduled', title: 'Upcoming session', detail: 'Host pending approval', tone: 'warn' },
    ],
  },
  {
    id: 'LVE-218',
    host: 'shade.vintage',
    title: 'Warehouse clearout',
    status: 'Incident',
    viewers: 0,
    reports: 4,
    startedAt: '2026-08-23 20:40',
    hostApproved: false,
    appointedMods: [],
    flaggedComments: [],
    timeline: [
      { id: 't1', at: '20:40', title: 'Session started' },
      { id: 't2', at: '21:05', title: 'Unsafe behaviour reported', tone: 'danger' },
      { id: 't3', at: '21:12', title: 'Live ended by T&S', tone: 'danger' },
      { id: 't4', at: '21:40', title: 'Host revoked', tone: 'ok' },
    ],
  },
];

export const mockOrders: MockOrder[] = [
  {
    id: 'ORD1042',
    listing: 'Vintage Levi’s Jacket',
    listingId: 'LST-51872',
    buyer: 'tunde.buys',
    seller: 'ada.thrifts',
    itemPrice: 18500,
    deliveryFee: 2500,
    total: 21000,
    status: 'Dispatched',
    delivery: 'Express',
    createdAt: '2026-08-28',
    paymentId: 'PAY-771',
    timeline: [
      { id: 'o1', at: '28 Aug 11:02', title: 'Paid', tone: 'ok' },
      { id: 'o2', at: '28 Aug 14:10', title: 'Seller confirmed' },
      { id: 'o3', at: '29 Aug 09:00', title: 'Dispatched', detail: 'Express · tracking mock', tone: 'ok' },
    ],
  },
  {
    id: 'ORD1048',
    listing: 'Nike Dunk Low Panda',
    listingId: 'LST-51901',
    buyer: 'tunde.buys',
    seller: 'kemi.closet',
    itemPrice: 42000,
    deliveryFee: 2500,
    total: 44500,
    status: 'Disputed',
    delivery: 'Standard',
    createdAt: '2026-08-30',
    paymentId: 'PAY-780',
    disputeId: 'DSP-44',
    timeline: [
      { id: 'o1', at: '30 Aug 16:44', title: 'Paid', tone: 'ok' },
      { id: 'o2', at: '31 Aug 10:00', title: 'Dispatched' },
      { id: 'o3', at: '1 Sep 13:22', title: 'Dispute opened', detail: 'DSP-44 · item not as described', tone: 'danger' },
      { id: 'o4', at: '1 Sep 13:23', title: 'Fulfillment paused', detail: 'Hold while disputed', tone: 'warn' },
    ],
  },
  {
    id: 'ORD1051',
    listing: 'Zara Linen Set',
    listingId: 'LST-52011',
    buyer: 'kemi.closet',
    seller: 'ada.thrifts',
    itemPrice: 12000,
    deliveryFee: 2500,
    total: 14500,
    status: 'Completed',
    delivery: 'Standard',
    createdAt: '2026-08-20',
    paymentId: 'PAY-760',
    timeline: [
      { id: 'o1', at: '20 Aug 12:00', title: 'Paid', tone: 'ok' },
      { id: 'o2', at: '21 Aug 09:30', title: 'Dispatched' },
      { id: 'o3', at: '23 Aug 18:00', title: 'Delivered', tone: 'ok' },
      { id: 'o4', at: '24 Aug 10:00', title: 'Completed', tone: 'ok' },
    ],
  },
];

export const mockDisputes: MockDispute[] = [
  {
    id: 'DSP-4471',
    orderId: 'ORD-88213',
    listingId: 'LST-51244',
    paymentId: 'PAY-9911',
    reason: 'Item never arrived',
    status: 'With T&S',
    queue: 'decision_ready',
    openedAt: '2026-08-25',
    openLabel: '41h open',
    buyer: 'ada_e',
    seller: 'lagos_luxe',
    amount: 34000,
    priority: 'P1',
    aiPriority: 'High',
    payoutOnHold: true,
    evidenceComplete: true,
    decisionReady: true,
    aiSummary:
      'Buyer reported non-delivery. Tracking shows a recorded delivery location that does not match the order delivery details. Seller provided no supporting delivery document. Evidence noted as missing: seller proof of delivery.',
    aiRecommendation:
      'Suggested outcome: refund buyer. Confidence: medium. AI cannot finalise — Trust & Safety or Super Admin must authorise.',
    aiConfidence: 'medium',
    suggestedOutcome: 'refund buyer',
    statements: [
      {
        party: 'buyer',
        handle: 'ada_e',
        at: '25 Aug 16:12',
        text: 'Tracking says delivered but nothing arrived at my address. I did not agree to any delivery change.',
      },
      {
        party: 'seller',
        handle: 'lagos_luxe',
        at: '25 Aug 21:40',
        text: 'Item was handed to delivery the same day. Tracking confirms delivery on my side.',
      },
    ],
    evidenceThumbs: [
      { id: 't1', label: 'Listing photo 1' },
      { id: 't2', label: 'Listing photo 2' },
      { id: 't3', label: 'Buyer screenshot — tracking' },
      { id: 't4', label: 'No seller file', missing: true },
    ],
    evidenceLinks: [
      { id: 'l1', label: 'Original listing LST-51244' },
      { id: 'l2', label: 'Throve chat — 14 messages' },
      { id: 'l3', label: 'Tracking record' },
      { id: 'l4', label: 'No related Live record', disabled: true },
    ],
    evidence: [
      { id: 'e1', label: 'Listing photos (2)' },
      { id: 'e2', label: 'Buyer screenshot — tracking' },
      { id: 'e3', label: 'Chat transcript', restricted: true },
    ],
    timeline: [
      { id: 'tl1', at: '22 Aug', title: 'Payment received', detail: 'Order placed · PAY-9911', tone: 'ok' },
      { id: 'tl2', at: '22 Aug', title: 'Seller dispatched item', detail: 'Courier booked same day' },
      {
        id: 'tl3',
        at: '24 Aug',
        title: 'Marked Delivered',
        detail: 'Location does not match order delivery details',
        tone: 'warn',
      },
      {
        id: 'tl4',
        at: '25 Aug',
        title: 'Dispute opened',
        detail: '48-hour completion clock paused · payout held',
        tone: 'danger',
      },
      { id: 'tl5', at: '26 Aug', title: 'Case assigned', detail: 'F. Adeyemi · Trust & Safety' },
    ],
    history: [
      { at: '26 Aug', text: 'Payout hold placed', by: 'System' },
      { at: '26 Aug', text: 'Seller information requested', by: 'F. Adeyemi' },
      { at: '26 Aug', text: 'Internal note added', by: 'A. Nwosu (Customer Support)' },
    ],
    defaultReason:
      'Delivery scan location does not match the order address and the seller has not provided a delivery document.',
    recordStale: {
      by: 'O. Bello',
      action: 'updated evidence notes',
      at: 'moments ago',
    },
  },
  {
    id: 'DSP-4468',
    orderId: 'ORD-88190',
    listingId: 'LST-51002',
    paymentId: 'PAY-9880',
    reason: 'Item not as described',
    status: 'With T&S',
    queue: 'decision_ready',
    openedAt: '2026-08-26',
    openLabel: '28h open',
    buyer: 'funke_b',
    seller: 'vintage_ng',
    amount: 18500,
    priority: 'P1',
    aiPriority: 'High',
    payoutOnHold: true,
    evidenceComplete: true,
    decisionReady: true,
    aiSummary: 'Buyer photos show condition below listing grade. Seller contesting wear as normal.',
    aiRecommendation: 'Suggested outcome: refund buyer. Confidence: high.',
    aiConfidence: 'high',
    suggestedOutcome: 'refund buyer',
    statements: [
      {
        party: 'buyer',
        handle: 'funke_b',
        at: '26 Aug 10:02',
        text: 'Listed as Like new but soles are heavily worn.',
      },
      {
        party: 'seller',
        handle: 'vintage_ng',
        at: '26 Aug 14:20',
        text: 'Wear is consistent with Like new for this brand.',
      },
    ],
    evidenceThumbs: [
      { id: 't1', label: 'Buyer unboxing 1' },
      { id: 't2', label: 'Buyer unboxing 2' },
      { id: 't3', label: 'Listing photo' },
    ],
    evidenceLinks: [
      { id: 'l1', label: 'Original listing LST-51002' },
      { id: 'l2', label: 'Throve chat — 6 messages' },
    ],
    evidence: [
      { id: 'e1', label: 'Buyer unboxing photos (4)' },
      { id: 'e2', label: 'Listing photos (3)' },
    ],
    timeline: [
      { id: 'tl1', at: '24 Aug', title: 'Payment received', tone: 'ok' },
      { id: 'tl2', at: '25 Aug', title: 'Marked Delivered' },
      { id: 'tl3', at: '26 Aug', title: 'Dispute opened', tone: 'danger' },
    ],
    history: [
      { at: '26 Aug', text: 'Payout hold placed', by: 'System' },
      { at: '26 Aug', text: 'Case assigned', by: 'F. Adeyemi' },
    ],
    defaultReason: 'Buyer evidence shows condition below the stated listing grade.',
  },
  {
    id: 'DSP-4455',
    orderId: 'ORD-88011',
    paymentId: 'PAY-9701',
    reason: 'Wrong item shipped',
    status: 'Open',
    queue: 'evidence_incomplete',
    openedAt: '2026-08-27',
    openLabel: '18h open',
    buyer: 'chidinma.o',
    seller: 'kemi_curates',
    amount: 22000,
    priority: 'P2',
    aiPriority: 'Med',
    payoutOnHold: true,
    evidenceComplete: false,
    decisionReady: false,
    aiSummary: 'Buyer alleges wrong SKU. Seller has not uploaded dispatch photos yet.',
    aiRecommendation: 'Hold decision until seller evidence arrives. Confidence: low.',
    aiConfidence: 'low',
    suggestedOutcome: 'await evidence',
    statements: [
      {
        party: 'buyer',
        handle: 'chidinma.o',
        at: '27 Aug 09:10',
        text: 'Received a different colour than the listing.',
      },
    ],
    evidenceThumbs: [
      { id: 't1', label: 'Buyer photo' },
      { id: 't2', label: 'No seller file', missing: true },
    ],
    evidenceLinks: [
      { id: 'l1', label: 'Original listing' },
      { id: 'l2', label: 'Throve chat — 3 messages' },
    ],
    evidence: [
      { id: 'e1', label: 'Buyer photo' },
      { id: 'e2', label: 'Seller delivery document', restricted: true },
    ],
    timeline: [
      { id: 'tl1', at: '25 Aug', title: 'Payment received', tone: 'ok' },
      { id: 'tl2', at: '27 Aug', title: 'Dispute opened', tone: 'danger' },
    ],
    history: [{ at: '27 Aug', text: 'Seller information requested', by: 'System' }],
    evidenceBlockReason: 'Buyer photographs and seller response are outstanding. Request information before deciding.',
  },
  {
    id: 'DSP-4440',
    orderId: 'ORD-87902',
    paymentId: 'PAY-9600',
    reason: 'Non-delivery',
    status: 'Open',
    queue: 'awaiting_buyer',
    openedAt: '2026-08-28',
    openLabel: '9h open',
    buyer: 'ijeoma.a',
    seller: 'sneakerspot.ng',
    amount: 41000,
    priority: 'P2',
    aiPriority: 'Med',
    payoutOnHold: true,
    evidenceComplete: false,
    decisionReady: false,
    aiSummary: 'Awaiting buyer response to clarification on delivery window.',
    aiRecommendation: 'Do not decide until buyer replies. Confidence: low.',
    aiConfidence: 'low',
    suggestedOutcome: 'await buyer',
    statements: [
      {
        party: 'seller',
        handle: 'sneakerspot.ng',
        at: '28 Aug 11:00',
        text: 'Courier attempted delivery twice. Buyer unreachable.',
      },
    ],
    evidenceThumbs: [{ id: 't1', label: 'Tracking export' }],
    evidenceLinks: [
      { id: 'l1', label: 'Tracking record' },
      { id: 'l2', label: 'Throve chat — 2 messages' },
    ],
    evidence: [{ id: 'e1', label: 'Carrier tracking export' }],
    timeline: [
      { id: 'tl1', at: '26 Aug', title: 'Payment received', tone: 'ok' },
      { id: 'tl2', at: '28 Aug', title: 'Dispute opened', tone: 'danger' },
      { id: 'tl3', at: '28 Aug', title: 'Buyer clarification requested', tone: 'warn' },
    ],
    history: [{ at: '28 Aug', text: 'Buyer information requested', by: 'System' }],
    awaitingBuyerSince: '28 Aug 11:40',
  },
  {
    id: 'DSP-4410',
    orderId: 'ORD-87820',
    paymentId: 'PAY-9555',
    reason: 'Counterfeit claim',
    status: 'With T&S',
    queue: 'decision_ready',
    openedAt: '2026-08-24',
    openLabel: '3d open',
    buyer: 'ken.eze',
    seller: 'fastdeals_ng',
    amount: 52000,
    priority: 'P1',
    aiPriority: 'High',
    payoutOnHold: true,
    evidenceComplete: true,
    decisionReady: true,
    aiSummary: 'Authentication markers inconsistent with brand norms. Seller has prior counterfeit flags.',
    aiRecommendation: 'Suggested outcome: refund buyer. Confidence: high.',
    aiConfidence: 'high',
    suggestedOutcome: 'refund buyer',
    statements: [
      {
        party: 'buyer',
        handle: 'ken.eze',
        at: '24 Aug 15:00',
        text: 'Stitching and label do not match authentic product.',
      },
      {
        party: 'seller',
        handle: 'fastdeals_ng',
        at: '24 Aug 19:22',
        text: 'Item is authentic. Buyer is mistaken.',
      },
    ],
    evidenceThumbs: [
      { id: 't1', label: 'Buyer label photo' },
      { id: 't2', label: 'Listing photo' },
      { id: 't3', label: 'Auth reference' },
    ],
    evidenceLinks: [
      { id: 'l1', label: 'Original listing' },
      { id: 'l2', label: 'Linked report RPT-911' },
    ],
    evidence: [
      { id: 'e1', label: 'Buyer authenticity photos' },
      { id: 'e2', label: 'Listing photos' },
    ],
    timeline: [
      { id: 'tl1', at: '22 Aug', title: 'Payment received', tone: 'ok' },
      { id: 'tl2', at: '24 Aug', title: 'Dispute opened', tone: 'danger' },
    ],
    history: [
      { at: '24 Aug', text: 'Payout hold placed', by: 'System' },
      { at: '25 Aug', text: 'Linked to report cluster', by: 'O. Bello' },
    ],
    defaultReason: 'Authenticity evidence and prior seller flags support a buyer refund.',
  },
  {
    id: 'DSP-41',
    orderId: 'ORD-1033',
    paymentId: 'PAY-8200',
    reason: 'Non-delivery',
    status: 'Approved for refund',
    queue: 'open',
    openedAt: '2026-08-22',
    openLabel: 'Closed path',
    buyer: 'tunde.buys',
    seller: 'shade.vintage',
    amount: 16000,
    priority: 'P2',
    aiPriority: 'Med',
    payoutOnHold: false,
    evidenceComplete: true,
    decisionReady: false,
    aiSummary: 'Carrier confirms no scan after 14 days.',
    aiRecommendation: 'Outcome already decided: refund buyer — Finance execute.',
    aiConfidence: 'high',
    suggestedOutcome: 'refund buyer',
    statements: [],
    evidenceThumbs: [{ id: 't1', label: 'Carrier tracking export' }],
    evidenceLinks: [{ id: 'l1', label: 'Tracking record' }],
    evidence: [{ id: 'e1', label: 'Carrier tracking export' }],
    timeline: [
      { id: 'tl1', at: '8 Aug', title: 'Payment received', tone: 'ok' },
      { id: 'tl2', at: '22 Aug', title: 'Decision recorded — refund buyer', tone: 'ok' },
    ],
    history: [{ at: '22 Aug', text: 'Decision recorded — refund buyer', by: 'O. Bello (T&S)' }],
    decision: 'Refund buyer',
    decidedBy: 'O. Adeyemi · Trust & Safety',
    decidedAt: '22 Aug 08:47',
    actionAlreadyApplied: {
      action: 'Decision',
      by: 'O. Adeyemi',
      at: '08:47',
    },
  },
  {
    id: 'DSP-6679',
    orderId: 'ORD-89001',
    paymentId: 'PAY-10002',
    reason: 'Item never arrived',
    status: 'Open',
    queue: 'open',
    openedAt: '2026-09-02',
    openLabel: '2h open',
    buyer: 'maya.k',
    seller: 'tolu.styles',
    amount: 12500,
    priority: 'P3',
    aiPriority: 'Low',
    payoutOnHold: true,
    evidenceComplete: false,
    decisionReady: false,
    unassigned: true,
    aiSummary: 'New case. No reviewer assigned yet.',
    aiRecommendation: 'Assign to Trust & Safety before requesting evidence.',
    aiConfidence: 'low',
    suggestedOutcome: 'assign reviewer',
    statements: [],
    evidenceThumbs: [],
    evidenceLinks: [{ id: 'l1', label: 'Original listing' }],
    evidence: [],
    timeline: [{ id: 'tl1', at: '2 Sep', title: 'Dispute opened', tone: 'danger' }],
    history: [{ at: '2 Sep', text: 'Case created', by: 'System' }],
  },
  {
    id: 'DSP-4390',
    orderId: 'ORD-87710',
    paymentId: 'PAY-9444',
    reason: 'Fit / preference',
    status: 'Closed',
    queue: 'open',
    openedAt: '2026-08-18',
    openLabel: 'Closed',
    buyer: 'femi.k',
    seller: 'lagos_luxe',
    amount: 9800,
    priority: 'P3',
    aiPriority: 'Low',
    payoutOnHold: false,
    evidenceComplete: true,
    decisionReady: false,
    aiSummary: 'Claim falls outside Buyer Protection (change of mind / fit).',
    aiRecommendation: 'Close with no financial change.',
    aiConfidence: 'high',
    suggestedOutcome: 'close',
    statements: [],
    evidenceThumbs: [{ id: 't1', label: 'Buyer photo' }],
    evidenceLinks: [{ id: 'l1', label: 'Original listing' }],
    evidence: [{ id: 'e1', label: 'Buyer photo' }],
    timeline: [
      { id: 'tl1', at: '16 Aug', title: 'Payment received', tone: 'ok' },
      { id: 'tl2', at: '18 Aug', title: 'Closed — outside protection', tone: 'ok' },
    ],
    history: [{ at: '18 Aug', text: 'Closed with no financial change', by: 'F. Adeyemi' }],
    decision: 'Close',
    decidedBy: 'F. Adeyemi · Trust & Safety',
    decidedAt: '18 Aug',
  },
  {
    id: 'DSP-4388',
    orderId: 'ORD-87600',
    paymentId: 'PAY-9333',
    reason: 'Non-delivery',
    status: 'Denied',
    queue: 'open',
    openedAt: '2026-08-15',
    openLabel: 'Closed',
    buyer: 'ada_e',
    seller: 'vintage_ng',
    amount: 21000,
    priority: 'P2',
    aiPriority: 'Med',
    payoutOnHold: false,
    evidenceComplete: true,
    decisionReady: false,
    aiSummary: 'Tracking and seller proof supported delivery. Seller payout released.',
    aiRecommendation: 'Release / continue seller payout.',
    aiConfidence: 'high',
    suggestedOutcome: 'release to seller',
    statements: [],
    evidenceThumbs: [
      { id: 't1', label: 'Tracking export' },
      { id: 't2', label: 'Seller POD' },
    ],
    evidenceLinks: [{ id: 'l1', label: 'Tracking record' }],
    evidence: [
      { id: 'e1', label: 'Tracking export' },
      { id: 'e2', label: 'Seller proof of delivery' },
    ],
    timeline: [
      { id: 'tl1', at: '12 Aug', title: 'Payment received', tone: 'ok' },
      { id: 'tl2', at: '15 Aug', title: 'Seller wins — payout released', tone: 'ok' },
    ],
    history: [{ at: '15 Aug', text: 'Release / continue seller payout', by: 'O. Bello' }],
    decision: 'Release to seller',
    decidedBy: 'O. Bello · Trust & Safety',
    decidedAt: '15 Aug',
  },
];

export const mockPayments: MockPayment[] = [
  {
    id: 'PAY-771',
    orderId: 'ORD1042',
    amount: 21000,
    method: 'Card',
    status: 'Captured',
    at: '2026-08-28 11:02',
    providerRefMasked: 'pi_••••91a2',
    breakdown: [
      { label: 'Item', amount: 18500 },
      { label: 'Delivery', amount: 2500 },
    ],
  },
  {
    id: 'PAY-780',
    orderId: 'ORD1048',
    amount: 44500,
    method: 'Card',
    status: 'Attention',
    at: '2026-08-30 16:44',
    providerRefMasked: 'pi_••••44c8',
    attentionReason: 'Linked to open dispute DSP-44',
    aiDuplicateRisk: 'No duplicate capture detected. Funds held pending dispute outcome.',
    breakdown: [
      { label: 'Item', amount: 42000 },
      { label: 'Delivery', amount: 2500 },
    ],
  },
  {
    id: 'PAY-791',
    orderId: 'ORD1055',
    amount: 9800,
    method: 'Card',
    status: 'Failed',
    at: '2026-09-01 09:18',
    providerRefMasked: 'pi_••••00f1',
    attentionReason: 'Issuer declined',
    breakdown: [
      { label: 'Item', amount: 7800 },
      { label: 'Delivery', amount: 2000 },
    ],
  },
];

export const mockRefunds: MockRefund[] = [
  {
    id: 'REF-12',
    orderId: 'ORD1033',
    amount: 16000,
    status: 'Approved',
    approvedBy: 'O. Bello (T&S)',
    itemAmount: 14000,
    deliveryAmount: 2000,
    includeDelivery: true,
    components: [
      { label: 'Item', amount: 14000 },
      { label: 'Delivery', amount: 2000 },
    ],
  },
  {
    id: 'REF-11',
    orderId: 'ORD1018',
    amount: 8500,
    status: 'Executed',
    approvedBy: 'O. Bello (T&S)',
    itemAmount: 8500,
    deliveryAmount: 0,
    includeDelivery: false,
    components: [{ label: 'Item', amount: 8500 }],
  },
  {
    id: 'REF-09',
    orderId: 'ORD1005',
    amount: 22000,
    status: 'Failed',
    approvedBy: 'A. Okoro (T&S)',
    itemAmount: 20000,
    deliveryAmount: 2000,
    includeDelivery: true,
    components: [
      { label: 'Item', amount: 20000 },
      { label: 'Delivery', amount: 2000 },
    ],
  },
];

export const mockPayouts: MockPayout[] = [
  {
    id: 'PO-301',
    seller: 'ada.thrifts',
    amount: 182400,
    status: 'Queued',
    period: '25–31 Aug',
    saleTotal: 210000,
    commission: 21000,
    fees: 6600,
    net: 182400,
    commissionRate: 0.1,
  },
  {
    id: 'PO-298',
    seller: 'kemi.closet',
    amount: 44100,
    status: 'On hold',
    period: '25–31 Aug',
    saleTotal: 49000,
    commission: 4900,
    fees: 0,
    net: 44100,
    commissionRate: 0.1,
    holdReason: 'Open dispute DSP-44 · incomplete KYC',
  },
  {
    id: 'PO-290',
    seller: 'ada.thrifts',
    amount: 156200,
    status: 'Paid',
    period: '18–24 Aug',
    saleTotal: 156200,
    commission: 0,
    fees: 0,
    net: 156200,
    commissionRate: 0,
    promoZeroCommission: true,
  },
];

export const mockReviews: MockReview[] = [
  {
    id: 'REV-88',
    orderId: 'ORD1051',
    seller: 'ada.thrifts',
    buyer: 'kemi.closet',
    rating: 5,
    comment: 'Exact as described. Fast ship.',
    status: 'Visible',
    aiSummary: 'No policy risk. Rating and comment both clear.',
    createdAt: '2026-08-24',
  },
  {
    id: 'REV-85',
    orderId: 'ORD1040',
    seller: 'shade.vintage',
    buyer: 'tunde.buys',
    rating: 1,
    comment: 'Totally different item. Avoid.',
    status: 'Flagged',
    aiSummary: 'Comment may name individuals harshly but stays within review policy. Hide comment only if harassment confirmed — rating stays.',
    createdAt: '2026-08-19',
  },
  {
    id: 'REV-80',
    orderId: 'ORD1022',
    seller: 'kemi.closet',
    buyer: 'ada.thrifts',
    rating: 4,
    comment: 'Good pair, slight crease.',
    status: 'Visible',
    aiSummary: 'Benign product feedback.',
    createdAt: '2026-08-12',
  },
];

export const mockAudit: MockAudit[] = [
  {
    id: 'AUD-1',
    actor: 'O. Bello',
    role: 'Trust & Safety',
    action: 'Hidden listing LST-52100',
    target: 'LST-52100',
    at: '2026-08-24 16:02',
    sensitivity: 'Sensitive',
    detail: 'Reason: counterfeit cluster · irreversible until restore',
    visibleTo: ['super_admin', 'trust_safety'],
  },
  {
    id: 'AUD-2',
    actor: 'A. Okoro',
    role: 'Finance',
    action: 'Executed refund REF-11',
    target: 'ORD1018',
    at: '2026-08-23 10:41',
    sensitivity: 'Finance',
    detail: 'Amount ₦8,500 · provider ref masked in UI',
    visibleTo: ['super_admin', 'finance', 'trust_safety'],
  },
  {
    id: 'AUD-3',
    actor: 'O. Bello',
    role: 'Trust & Safety',
    action: 'Approved live host ada.thrifts',
    target: 'USR-1001',
    at: '2026-08-12 09:15',
    sensitivity: 'Standard',
    detail: 'KYC clear · prior streams clean',
    visibleTo: ['super_admin', 'trust_safety', 'support'],
  },
  {
    id: 'AUD-4',
    actor: 'S. Mensah',
    role: 'Support',
    action: 'Opened dispute DSP-44',
    target: 'ORD1048',
    at: '2026-09-01 13:22',
    sensitivity: 'Standard',
    detail: 'Escalated to Trust & Safety queue',
    visibleTo: ['super_admin', 'trust_safety', 'support', 'finance'],
  },
  {
    id: 'AUD-5',
    actor: 'System',
    role: 'System',
    action: 'Payout hold PO-298',
    target: 'PO-298',
    at: '2026-09-01 13:25',
    sensitivity: 'Finance',
    detail: 'Auto-hold on dispute link',
    visibleTo: ['super_admin', 'finance'],
  },
];

export type MockOpsCase = {
  id: string;
  subject: string;
  detail: string;
  category: string;
  age: string;
  ageUrgent?: boolean;
  aiPriority: 'High' | 'Medium' | 'Normal';
  payout: 'On Hold' | '—';
  urgent: boolean;
  evidenceIncomplete: boolean;
  href: string;
  role: 'ts' | 'support' | 'finance' | 'all';
};

export const mockOpsCases: MockOpsCase[] = [
  {
    id: 'DSP-4471',
    subject: 'Item never arrived · ORD-88213',
    detail: 'Buyer @ada_e · Seller @lagos_luxe',
    category: 'Never arrived',
    age: '41h',
    ageUrgent: true,
    aiPriority: 'High',
    payout: 'On Hold',
    urgent: true,
    evidenceIncomplete: false,
    href: '/disputes',
    role: 'all',
  },
  {
    id: 'DSP-4468',
    subject: 'Materially different from listing · ORD-88190',
    detail: 'Buyer @tolu.a · Seller @vintage_ng',
    category: 'Not as described',
    age: '33h',
    aiPriority: 'High',
    payout: 'On Hold',
    urgent: true,
    evidenceIncomplete: false,
    href: '/disputes',
    role: 'all',
  },
  {
    id: 'DSP-4465',
    subject: 'Possible counterfeit · ORD-88144',
    detail: 'Buyer @chidi_o · Seller @thrift_house',
    category: 'Counterfeit review',
    age: '28h',
    aiPriority: 'Medium',
    payout: 'On Hold',
    urgent: true,
    evidenceIncomplete: true,
    href: '/disputes',
    role: 'all',
  },
  {
    id: 'RPT-2210',
    subject: 'Prohibited item reported · LST-51872',
    detail: '3 linked reports · Seller @style_by_k',
    category: 'Listing report',
    age: '19h',
    aiPriority: 'High',
    payout: '—',
    urgent: true,
    evidenceIncomplete: false,
    href: '/reports',
    role: 'ts',
  },
  {
    id: 'LIV-0338',
    subject: 'Incident reported during live stream',
    detail: 'Host @kemi_curates · stream active',
    category: 'Live incident',
    age: '12m',
    aiPriority: 'High',
    payout: '—',
    urgent: true,
    evidenceIncomplete: false,
    href: '/live',
    role: 'ts',
  },
  {
    id: 'DSP-4459',
    subject: 'Wrong item received · ORD-88061',
    detail: 'Awaiting seller information',
    category: 'Wrong item',
    age: '21h',
    aiPriority: 'Normal',
    payout: 'On Hold',
    urgent: true,
    evidenceIncomplete: true,
    href: '/disputes',
    role: 'all',
  },
  {
    id: 'REF-12',
    subject: 'Refund approved · awaiting execution',
    detail: 'ORD1033 · approved by O. Bello (T&S)',
    category: 'Refund',
    age: '6h',
    aiPriority: 'Medium',
    payout: '—',
    urgent: false,
    evidenceIncomplete: false,
    href: '/refunds',
    role: 'finance',
  },
];

/** @deprecated use mockOpsCases */
export const mockOpsQueue = mockOpsCases.map((c) => ({
  id: c.id,
  priority: c.aiPriority === 'High' ? 'P1' : c.aiPriority === 'Medium' ? 'P2' : 'P3',
  title: c.subject,
  module: c.href.replace('/', '') || 'operations',
  role: c.role,
}));

export const mockSensitiveActions = [
  {
    id: 'SA-1',
    title: 'Dispute decided — buyer wins, refund approved',
    detail: 'DSP-4452 · by F. Adeyemi (Trust & Safety) · 08:52 · AI-assisted',
  },
  {
    id: 'SA-2',
    title: 'Payout hold placed',
    detail: 'PAY-9911 · by F. Adeyemi (Trust & Safety) · 08:47 · reason: active dispute',
  },
  {
    id: 'SA-3',
    title: 'Account suspended — 7 days',
    detail: '@fastdeals_ng · by O. Bello (Trust & Safety) · yesterday 18:20',
  },
  {
    id: 'SA-4',
    title: 'Permanent ban executed',
    detail: '@resell_bot · by M. Okafor (Super Admin) · yesterday 15:04 · reason recorded',
  },
];

export const mockBadgeCounts = {
  listings: 5,
  reports: 14,
  live: 2,
  disputes: 23,
  refunds: 4,
};

export function formatNaira(amount: number) {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}
