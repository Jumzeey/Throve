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
  description: string;
  seller: string;
  department: string;
  category: string;
  condition: string;
  price: number;
  status: 'Available' | 'Reserved' | 'Sold' | 'Hidden' | 'Removed' | 'Draft' | 'Pending review' | 'Rejected';
  reports: number;
  brand: string;
  colour: string;
  size?: string;
  updatedAt: string;
  /** Queued under Reported · N when true or reports > 0. */
  flagged?: boolean;
  photoCount: number;
  reservedOrderId?: string;
  activeOrderId?: string | null;
  aiSignal: string;
  aiPriority?: string;
  aiNextStep?: string;
  linkedReports: { id: string; label: string }[];
  history: { id: string; at: string; title: string; detail?: string; tone?: 'default' | 'warn' | 'danger' | 'ok' }[];
  catalogReadonly: { label: string; value: string }[];
};

export type MockReport = {
  id: string;
  route: 'User' | 'Listing' | 'Live' | 'Live comment';
  reason: string;
  target: string;
  reporter: string;
  status: 'New' | 'Under review' | 'Escalated' | 'Action taken' | 'Closed';
  /** Legacy P-tier retained for filters that still reference it. */
  priority: 'P1' | 'P2' | 'P3';
  aiPriority: 'High' | 'Medium' | 'Normal';
  assigned: string;
  assignedToMe?: boolean;
  department: string;
  category: string;
  objectTitle: string;
  objectMeta: string;
  ageLabel: string;
  createdAt: string;
  evidenceCount: number;
  evidenceRestricted: boolean;
  aiSummary: string;
  aiNextStep?: string;
  aiUnavailable?: boolean;
  routingHint: string;
  reporterStatement: string;
  linkedReports: { id: string; label: string }[];
  isRepeat?: boolean;
  history: { id: string; at: string; title: string; detail?: string; tone?: 'default' | 'warn' | 'danger' | 'ok' }[];
  actionTakenNote?: string;
};

export type MockLive = {
  id: string;
  host: string;
  title: string;
  status: 'Live' | 'Upcoming' | 'Ended' | 'Incident';
  viewers: number;
  reports: number;
  startedAt: string;
  /** Right-aligned list meta, e.g. "Started 09:12 · 34m" */
  timeLabel?: string;
  scheduledAt?: string;
  hostApproved: boolean;
  appointedMods: string[];
  productCount: number;
  aiPriority: 'High' | 'Medium' | 'Normal';
  aiSummary: string;
  aiNextStep?: string;
  evidenceRestricted?: boolean;
  actionTaken?: boolean;
  connectionIssue?: boolean;
  flaggedComments: {
    id: string;
    user: string;
    text: string;
    reason: string;
    at?: string;
    action?: string;
  }[];
  pinnedProducts: {
    id: string;
    title: string;
    price: number;
    status: 'Available' | 'Reserved' | 'Sold';
  }[];
  linkedIncidents: { id: string; label: string; target?: string }[];
  internalAdmin?: string;
  timeline: { id: string; at: string; title: string; detail?: string; tone?: 'default' | 'warn' | 'danger' | 'ok' }[];
};

export type MockOrderFlag = 'dispute' | 'hold' | 'cancellable' | 'payout' | 'refund' | 'verify';

export type MockOrder = {
  id: string;
  listing: string;
  listingId: string;
  buyer: string;
  seller: string;
  itemPrice: number;
  buyerProtection: number;
  deliveryFee: number;
  total: number;
  status: 'Paid' | 'Awaiting dispatch' | 'In transit' | 'Delivered' | 'Completed' | 'Cancelled' | 'Disputed';
  paymentStatus: 'Confirmed' | 'Uncertain';
  delivery: string;
  deliveryMethod: string;
  deliveryLabel: string;
  deliveryArea?: string;
  addressRestricted?: boolean;
  createdAt: string;
  placedAt: string;
  paymentId: string;
  payoutId?: string;
  refundId?: string;
  disputeId?: string;
  department: string;
  category: string;
  condition: string;
  flags: MockOrderFlag[];
  needsAssistance: boolean;
  completionPaused?: boolean;
  cancellableBy?: string;
  aiSummary: string;
  aiNextStep?: string;
  linkedRecords: { id: string; kind: 'dispute' | 'payment' | 'payout' | 'refund' | 'listing'; label: string; financeOnly?: boolean }[];
  recordStale?: { by: string; action: string; at: string };
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
  buyer: string;
  itemTitle: string;
  itemPrice: number;
  deliveryFee: number;
  deliveryMethod: string;
  buyerProtection: number;
  amount: number;
  status:
    | 'Status uncertain'
    | 'Duplicate risk'
    | 'Confirmed failed'
    | 'Successful'
    | 'Cancelled'
    | 'Initiated';
  needsAttention: boolean;
  at: string;
  placedLabel: string;
  providerRefMasked: string;
  verification: 'Pending' | 'Verified' | 'Failed' | 'Not required';
  environment: string;
  aiSummary?: string;
  aiNextStep?: string;
  attentionTitle?: string;
  attentionBody?: string;
  timeline: { id: string; at: string; title: string; detail?: string }[];
  relatedAttempts: {
    id: string;
    at: string;
    amount: number;
    status: string;
    kind: 'payment' | 'order';
  }[];
  history: { id: string; at: string; title: string; detail?: string }[];
  linkedRefundId?: string;
  linkedRefundLabel?: string;
  orderStatusLabel?: string;
  recordStale?: { title: string; body: string };
  failedConfirmedAt?: string;
};

export type MockRefund = {
  id: string;
  orderId: string;
  buyer: string;
  createdAt: string;
  status: 'Awaiting Finance' | 'Ready to execute' | 'Processing' | 'Completed' | 'Status uncertain' | 'Failed';
  origin: 'Eligible dispute' | 'Valid cancellation' | 'Seller failure to fulfill';
  originDetail: string;
  decisionId?: string;
  decidedBy?: string;
  decidedAt?: string;
  itemAmount: number;
  buyerProtectionAmount: number;
  buyerProtectionIncluded: boolean;
  buyerProtectionNote?: string;
  deliveryAmount: number;
  deliveryStatus: 'include' | 'exclude' | 'in_question' | 'not_applicable';
  deliveryNote?: string;
  totalFinal?: number;
  totalLabel: string;
  needsDeliveryDetermination: boolean;
  paymentId: string;
  payoutId?: string;
  disputeId?: string;
  orderStatusLabel: string;
  whyExists: string;
  linkedRecords: {
    id: string;
    kind: 'dispute' | 'order' | 'payment' | 'payout';
    label: string;
    openLabel: string;
  }[];
  history: { id: string; at: string; title: string; detail?: string }[];
  processingAt?: string;
  processingBy?: string;
  completedAt?: string;
  completedBy?: string;
  failedRetryAvailable?: boolean;
  recordStale?: { title: string; body: string };
  notEligible?: boolean;
};

export type MockPayout = {
  id: string;
  seller: string;
  orderId: string;
  createdAt: string;
  status:
    | 'Eligible'
    | 'On Hold'
    | 'Verification required'
    | 'Processing'
    | 'Failed'
    | 'Paid out'
    | 'Not yet eligible';
  verification: 'Approved' | 'Pending' | 'Not required';
  saleTotal: number;
  commission: number;
  fees: number;
  net: number;
  commissionRate: number;
  feeRate: number;
  headerStatus: string;
  promoZeroCommission?: boolean;
  promoSaleOf?: string;
  holdReason?: string;
  holdSellerFacing?: string;
  holdAuto?: boolean;
  disputeId?: string;
  eligibility: { label: string; ok: boolean }[];
  notYetEligibleNote?: string;
  verificationBlocked?: boolean;
  processingAt?: string;
  processingBy?: string;
  paidAt?: string;
  paidBy?: string;
  failedRetryAvailable?: boolean;
  destinationMasked: string;
  testReference: string;
  history: { id: string; at: string; title: string; detail?: string }[];
  recordStale?: { by: string; action: string; at: string };
};

export type MockReview = {
  id: string;
  orderId: string;
  seller: string;
  buyer: string;
  rating: number;
  comment: string;
  /** Short table summary under COMMENT */
  commentSummary: string;
  status: 'Under review' | 'Valid' | 'Eligibility anomaly' | 'Duplicate anomaly' | 'Hidden';
  flagged: boolean;
  reported: boolean;
  hasComment: boolean;
  eligibilityAnomaly: boolean;
  duplicateAnomaly: boolean;
  submittedAt: string;
  headerMeta: string;
  aiSummary: string;
  aiNextStep?: string;
  eligibility: { label: string; ok: boolean }[];
  linkedRecords: {
    id: string;
    kind: 'report' | 'order' | 'user';
    label: string;
    openLabel: string;
  }[];
  sellerAvg: number;
  sellerReviewCount: number;
  sellerRatingNote: string;
  history: { id: string; at: string; title: string; detail?: string }[];
  createdAt: string;
};

export type MockAudit = {
  id: string;
  at: string;
  atFull: string;
  actor: string;
  role: string;
  module:
    | 'Users'
    | 'Live'
    | 'Reviews'
    | 'Listings'
    | 'Orders'
    | 'Payments'
    | 'Refunds'
    | 'Payouts'
    | 'Disputes'
    | 'Access'
    | 'Reports';
  action: string;
  recordId: string;
  recordSub?: string;
  result: 'Completed' | 'Denied';
  sensitivity: 'High' | 'Medium' | 'Access' | 'Standard';
  hasAi: boolean;
  aiSummary?: string;
  previousState?: string;
  resultingState?: string;
  reason?: string;
  confirmation?: {
    recommendedBy?: string;
    steps?: string;
    aiAssisted?: boolean;
  };
  relatedEvents?: { id: string; label: string; openLabel: string }[];
  affectedRecordPath?: string | null;
  affectedRecordLabel?: string;
  recordUnavailable?: boolean;
  deniedBanner?: { title: string; body: string };
  /** Who can see this row, and at what depth. */
  visibility: Partial<
    Record<
      'super_admin' | 'trust_safety' | 'support' | 'finance',
      'full' | 'outcome_only' | 'status_only'
    >
  >;
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
    id: 'LST-53014',
    title: 'Cropped linen blazer',
    description:
      'Soft linen blazer, women’s S. Worn twice. Smoke-free home. Price firm — no lowballs.',
    seller: 'ada.thrifts',
    department: 'Women',
    category: 'Outerwear',
    condition: 'Excellent',
    price: 27500,
    status: 'Pending review',
    reports: 0,
    brand: 'Unbranded',
    colour: 'Sand',
    size: 'S',
    updatedAt: 'Submitted 14 Sep · 18:42',
    photoCount: 5,
    aiSignal:
      'Pre-publish review. Photos look clear; check department/category fit and any prohibited brand claims before approving.',
    aiPriority: 'medium',
    aiNextStep: 'approve to go live, or reject with a seller-facing reason',
    linkedReports: [],
    history: [
      {
        id: 'h1',
        at: '14 Sep · 18:42',
        title: 'Submitted for review',
        detail: 'Seller published · awaiting Trust & Safety',
        tone: 'warn',
      },
    ],
    catalogReadonly: [
      { label: 'Brand', value: 'Unbranded' },
      { label: 'Size', value: 'S' },
      { label: 'Colour', value: 'Sand' },
      { label: 'Submitted', value: '14 Sep 2026' },
    ],
  },
  {
    id: 'LST-53022',
    title: 'Kids trainers · EU 30',
    description: 'Lightly used school trainers. Clean soles. Bundle available with other kids shoes.',
    seller: 'mum.market',
    department: 'Kids',
    category: 'Shoes',
    condition: 'Good',
    price: 8500,
    status: 'Pending review',
    reports: 0,
    brand: 'Unbranded',
    colour: 'Navy',
    size: 'EU 30',
    updatedAt: 'Submitted 14 Sep · 17:05',
    photoCount: 3,
    aiSignal: 'Routine pre-publish queue item. No reports. Verify sizing photos match the listed EU 30.',
    aiPriority: 'low',
    aiNextStep: 'approve if photos match size claim',
    linkedReports: [],
    history: [
      {
        id: 'h1',
        at: '14 Sep · 17:05',
        title: 'Submitted for review',
        detail: 'Seller published · awaiting Trust & Safety',
        tone: 'warn',
      },
    ],
    catalogReadonly: [
      { label: 'Brand', value: 'Unbranded' },
      { label: 'Size', value: 'EU 30' },
      { label: 'Colour', value: 'Navy' },
      { label: 'Submitted', value: '14 Sep 2026' },
    ],
  },
  {
    id: 'LST-53031',
    title: 'Luxury-look silk shirt',
    description: 'Same cut as the designer silk shirt. Great gift. No authenticity docs.',
    seller: 'style_by_k',
    department: 'Women',
    category: 'Tops',
    condition: 'Like new',
    price: 42000,
    status: 'Pending review',
    reports: 0,
    brand: 'Stated: unbranded',
    colour: 'Ivory',
    size: 'M',
    updatedAt: 'Submitted 14 Sep · 15:20',
    photoCount: 4,
    aiSignal:
      'Possible prohibited-content signal: description references a designer look without provenance. Prefer reject with a clear seller reason over silent approve.',
    aiPriority: 'high',
    aiNextStep: 'reject for brand/provenance clarity, or escalate seller risk',
    linkedReports: [],
    history: [
      {
        id: 'h1',
        at: '14 Sep · 15:20',
        title: 'Submitted for review',
        detail: 'Seller published · awaiting Trust & Safety',
        tone: 'warn',
      },
    ],
    catalogReadonly: [
      { label: 'Brand', value: 'Stated: unbranded' },
      { label: 'Size', value: 'M' },
      { label: 'Colour', value: 'Ivory' },
      { label: 'Submitted', value: '14 Sep 2026' },
    ],
  },
  {
    id: 'LST-52988',
    title: 'Men’s leather belt',
    description: 'Brown leather belt, size 34. Buckle scratched — priced accordingly.',
    seller: 'kemi.closet',
    department: 'Men',
    category: 'Accessories',
    condition: 'Good',
    price: 6500,
    status: 'Rejected',
    reports: 0,
    brand: 'Unbranded',
    colour: 'Brown',
    size: '34',
    updatedAt: 'Rejected 13 Sep · 11:10',
    photoCount: 2,
    aiSignal: 'Previously rejected for insufficient photos of the buckle wear. Seller can edit and resubmit.',
    aiPriority: 'low',
    aiNextStep: 'no action until seller resubmits',
    linkedReports: [],
    history: [
      {
        id: 'h1',
        at: '13 Sep · 11:10',
        title: 'Rejected · needs changes',
        detail: 'O. Bello (Trust & Safety) · Add close-up of buckle scratch mentioned in description',
        tone: 'danger',
      },
      {
        id: 'h0',
        at: '12 Sep · 19:44',
        title: 'Submitted for review',
        detail: 'Seller published · awaiting Trust & Safety',
      },
    ],
    catalogReadonly: [
      { label: 'Brand', value: 'Unbranded' },
      { label: 'Size', value: '34' },
      { label: 'Colour', value: 'Brown' },
      { label: 'Rejected', value: '13 Sep 2026' },
    ],
  },
  {
    id: 'LST-51872',
    title: 'Designer-look monogram tote',
    description:
      'Barely used monogram tote, same look as the designer original. Comes with dust bag. No returns.',
    seller: 'style_by_k',
    department: 'Women',
    category: 'Bags',
    condition: 'Very good',
    price: 48000,
    status: 'Available',
    reports: 3,
    flagged: true,
    brand: 'Stated: unbranded',
    colour: 'Brown',
    updatedAt: 'Updated 26 Aug · 09:12',
    photoCount: 4,
    aiSignal:
      'Possible prohibited-content signal: title and description reference a protected brand while the seller declares the item unbranded / no authenticity detail. Three reports in 19 hours. Seller has one further listing with near-identical wording.',
    aiPriority: 'high',
    aiNextStep: 'open the linked reports before deciding',
    linkedReports: [
      { id: 'RPT-2210', label: 'prohibited item concern' },
      { id: 'RPT-2205', label: 'potential counterfeit' },
      { id: 'RPT-2199', label: 'potential counterfeit' },
    ],
    history: [
      {
        id: 'h1',
        at: '26 Aug · 08:14',
        title: 'Internal note added',
        detail: 'A. Nwosu (Customer Support)',
      },
      {
        id: 'h2',
        at: '26 Aug · 09:05',
        title: 'Priority raised after third report',
        detail: 'O. Bello (Trust & Safety) · AI-assisted',
        tone: 'warn',
      },
    ],
    catalogReadonly: [
      { label: 'Brand', value: 'Stated: unbranded' },
      { label: 'Colour', value: 'Brown' },
      { label: 'Posted', value: '12 Aug 2026' },
    ],
  },
  {
    id: 'LST-51940',
    title: 'Vintage denim jacket',
    description: 'Soft wash denim jacket, women’s M. Smoke-free home.',
    seller: 'ada.thrifts',
    department: 'Women',
    category: 'Outerwear',
    condition: 'Good',
    price: 34000,
    status: 'Sold',
    reports: 1,
    flagged: true,
    brand: 'Levi’s',
    colour: 'Indigo',
    size: 'M',
    updatedAt: 'Sold 25 Aug · 18:40',
    photoCount: 3,
    aiSignal: 'Single report after sale completed. Review for pattern only — no public visibility action needed.',
    aiPriority: 'low',
    aiNextStep: 'dismiss or link to seller history',
    linkedReports: [{ id: 'RPT-2188', label: 'item not as described' }],
    history: [
      {
        id: 'h1',
        at: '25 Aug · 18:40',
        title: 'Marked sold',
        detail: 'Commerce state · order completed',
        tone: 'ok',
      },
    ],
    catalogReadonly: [
      { label: 'Brand', value: 'Levi’s' },
      { label: 'Size', value: 'M' },
      { label: 'Colour', value: 'Indigo' },
      { label: 'Posted', value: '8 Aug 2026' },
    ],
  },
  {
    id: 'LST-52011',
    title: 'Nike Dunk Low Panda',
    description: 'DS pair, UK 8. Box included. Authenticity tag visible in photos.',
    seller: 'kemi.closet',
    department: 'Men',
    category: 'Shoes',
    condition: 'Like new',
    price: 52000,
    status: 'Reserved',
    reports: 0,
    brand: 'Nike',
    colour: 'Black/White',
    size: '42',
    updatedAt: 'Reserved 26 Aug · 11:02',
    photoCount: 5,
    reservedOrderId: 'ORD-88301',
    activeOrderId: 'ORD-88301',
    aiSignal: 'Reserved against an in-progress order. Removing public visibility does not cancel or refund that order.',
    aiPriority: 'medium',
    aiNextStep: 'coordinate with Orders / Disputes if enforcement is needed',
    linkedReports: [],
    history: [
      {
        id: 'h1',
        at: '26 Aug · 11:02',
        title: 'Claimed in live / checkout',
        detail: 'ORD-88301 · reserved',
        tone: 'warn',
      },
    ],
    catalogReadonly: [
      { label: 'Brand', value: 'Nike' },
      { label: 'Size', value: '42' },
      { label: 'Colour', value: 'Black/White' },
      { label: 'Posted', value: '28 Aug 2026' },
    ],
  },
  {
    id: 'LST-52188',
    title: 'Kids party dress',
    description: 'Worn once. Size 5–6 years.',
    seller: 'mum.market',
    department: 'Kids',
    category: 'Dresses',
    condition: 'Excellent',
    price: 9000,
    status: 'Hidden',
    reports: 2,
    flagged: true,
    brand: 'Unbranded',
    colour: 'Pink',
    size: '5–6Y',
    updatedAt: 'Hidden 24 Aug · 16:18',
    photoCount: 2,
    aiSignal: 'Hidden pending seller response on sizing photos. Restore when evidence clears.',
    aiPriority: 'medium',
    aiNextStep: 'restore only after photo clarification',
    linkedReports: [
      { id: 'RPT-2170', label: 'misleading photos' },
      { id: 'RPT-2168', label: 'size dispute' },
    ],
    history: [
      {
        id: 'h1',
        at: '24 Aug · 16:18',
        title: 'Hidden from marketplace',
        detail: 'O. Bello (Trust & Safety)',
        tone: 'danger',
      },
    ],
    catalogReadonly: [
      { label: 'Brand', value: 'Unbranded' },
      { label: 'Size', value: '5–6Y' },
      { label: 'Colour', value: 'Pink' },
      { label: 'Posted', value: '20 Aug 2026' },
    ],
  },
  {
    id: 'LST-52240',
    title: 'Replica sneakers lot',
    description: 'High quality reps, EU 40–44 mix. Message for sizes.',
    seller: 'shade.vintage',
    department: 'Men',
    category: 'Shoes',
    condition: 'New',
    price: 28000,
    status: 'Removed',
    reports: 4,
    flagged: true,
    brand: 'Replica',
    colour: 'Mixed',
    updatedAt: 'Removed 24 Aug · 15:02',
    photoCount: 4,
    aiSignal: 'Already removed for prohibited replica language. Restore only with Super Admin + provenance.',
    aiPriority: 'high',
    aiNextStep: 'keep removed · escalate seller risk if repeat',
    linkedReports: [
      { id: 'RPT-2155', label: 'prohibited item' },
      { id: 'RPT-2151', label: 'counterfeit cluster' },
    ],
    history: [
      {
        id: 'h1',
        at: '24 Aug · 15:02',
        title: 'Removed from public marketplace',
        detail: 'D. Bello (Trust & Safety) · reason recorded · audit entry created',
        tone: 'danger',
      },
    ],
    catalogReadonly: [
      { label: 'Brand', value: 'Replica' },
      { label: 'Colour', value: 'Mixed' },
      { label: 'Posted', value: '18 Aug 2026' },
    ],
  },
  {
    id: 'LST-52301',
    title: 'Draft silk scarf',
    description: 'Unused draft — not published.',
    seller: 'ada.thrifts',
    department: 'Women',
    category: 'Accessories',
    condition: 'New with tags',
    price: 15000,
    status: 'Draft',
    reports: 0,
    brand: 'Unbranded',
    colour: 'Ivory',
    updatedAt: 'Draft saved 26 Aug · 07:40',
    photoCount: 1,
    aiSignal: 'Draft is not public. No marketplace moderation required until published.',
    linkedReports: [],
    history: [],
    catalogReadonly: [
      { label: 'Brand', value: 'Unbranded' },
      { label: 'Colour', value: 'Ivory' },
      { label: 'Posted', value: 'Not published' },
    ],
  },
];

export const mockReports: MockReport[] = [
  {
    id: 'RPT-2210',
    route: 'Listing',
    reason: 'Potential counterfeit',
    target: 'LST-51872',
    reporter: 'tunde.buys',
    status: 'Under review',
    priority: 'P1',
    aiPriority: 'High',
    assigned: 'O. Bello',
    assignedToMe: true,
    department: 'Women',
    category: 'Potential counterfeit',
    objectTitle: 'Designer-look monogram tote',
    objectMeta: '@style_by_k',
    ageLabel: '19h',
    createdAt: '25 Aug · 14:26',
    evidenceCount: 4,
    evidenceRestricted: false,
    aiSummary:
      'Title and description reference a protected brand look while the seller declares the item unbranded. Three reports in 19 hours from distinct reporters. Treat as one case — no automatic action taken.',
    aiNextStep: 'open the listing in Listings and review linked reports before deciding',
    routingHint: 'Listing concern → Listings',
    reporterStatement:
      'This looks like a fake designer bag. The listing says “designer-look” and “same look as the original” but claims unbranded. Please check.',
    linkedReports: [
      { id: 'RPT-2205', label: 'potential counterfeit' },
      { id: 'RPT-2199', label: 'potential counterfeit' },
    ],
    isRepeat: true,
    history: [
      {
        id: 'h1',
        at: '25 Aug · 14:26',
        title: 'Report received',
        detail: 'Submitted by @tunde.buys',
      },
      {
        id: 'h2',
        at: '25 Aug · 15:02',
        title: 'Assigned · status set to Under review',
        detail: 'O. Bello (Trust & Safety)',
        tone: 'warn',
      },
      {
        id: 'h3',
        at: '26 Aug · 09:05',
        title: 'Two further reports associated',
        detail: 'RPT-2205 · RPT-2199 · AI-assisted',
        tone: 'warn',
      },
    ],
  },
  {
    id: 'RPT-2214',
    route: 'Live comment',
    reason: 'Live behavior',
    target: 'LVE-220',
    reporter: 'ada.thrifts',
    status: 'New',
    priority: 'P1',
    aiPriority: 'High',
    assigned: 'Unassigned',
    department: 'Live',
    category: 'Live behavior',
    objectTitle: 'Sunday thrift haul · comment',
    objectMeta: '@anon.shop on LVE-220',
    ageLabel: '12m',
    createdAt: '26 Aug · 20:22',
    evidenceCount: 1,
    evidenceRestricted: false,
    aiSummary: 'Flagged comment during an active stream. Prefer removing the comment before ending the Live session.',
    aiNextStep: 'open Live and review flagged comments',
    routingHint: 'Live behaviour → Live',
    reporterStatement: 'Hate speech in the chat. Host has not removed it yet.',
    linkedReports: [],
    history: [
      {
        id: 'h1',
        at: '26 Aug · 20:22',
        title: 'Report received',
        detail: 'Submitted by @ada.thrifts',
      },
    ],
  },
  {
    id: 'RPT-2208',
    route: 'User',
    reason: 'Safety concern',
    target: 'USR-1188',
    reporter: 'kemi.closet',
    status: 'New',
    priority: 'P2',
    aiPriority: 'Medium',
    assigned: 'O. Bello',
    assignedToMe: true,
    department: 'Trust',
    category: 'Safety concern',
    objectTitle: 'shade.vintage',
    objectMeta: 'User account',
    ageLabel: '2d 6h',
    createdAt: '24 Aug · 11:40',
    evidenceCount: 2,
    evidenceRestricted: true,
    aiSummary: 'Chat excerpts include banned phrases. Review user enforcement history before suspending.',
    aiNextStep: 'open Users and review related reports',
    routingHint: 'User behaviour → Users',
    reporterStatement: 'This seller sent threatening messages after I asked about authenticity.',
    linkedReports: [{ id: 'RPT-902', label: 'harassment in chat' }],
    history: [
      {
        id: 'h1',
        at: '24 Aug · 11:40',
        title: 'Report received',
        detail: 'Submitted by @kemi.closet',
      },
      {
        id: 'h2',
        at: '24 Aug · 16:05',
        title: 'Assigned · status set to New',
        detail: 'O. Bello (Trust & Safety)',
      },
    ],
  },
  {
    id: 'RPT-2195',
    route: 'Listing',
    reason: 'Misleading photos',
    target: 'LST-52188',
    reporter: 'tunde.buys',
    status: 'Escalated',
    priority: 'P2',
    aiPriority: 'Medium',
    assigned: 'M. Okafor',
    department: 'Kids',
    category: 'Item / listing concern',
    objectTitle: 'Kids party dress',
    objectMeta: '@mum.market',
    ageLabel: '3d',
    createdAt: '23 Aug · 09:12',
    evidenceCount: 3,
    evidenceRestricted: false,
    aiSummary: 'Sizing photos disputed by two buyers. Already hidden pending clarification — escalate for policy consistency.',
    routingHint: 'Listing concern → Listings',
    reporterStatement: 'Photos show a different size label than the listing claims.',
    linkedReports: [{ id: 'RPT-2170', label: 'misleading photos' }],
    isRepeat: true,
    history: [
      {
        id: 'h1',
        at: '23 Aug · 09:12',
        title: 'Report received',
      },
      {
        id: 'h2',
        at: '24 Aug · 16:18',
        title: 'Escalated to Super Admin',
        detail: 'O. Bello (Trust & Safety)',
        tone: 'warn',
      },
    ],
  },
  {
    id: 'RPT-2155',
    route: 'Listing',
    reason: 'Prohibited item',
    target: 'LST-52240',
    reporter: 'ada.thrifts',
    status: 'Action taken',
    priority: 'P1',
    aiPriority: 'High',
    assigned: 'O. Bello',
    assignedToMe: true,
    department: 'Men',
    category: 'Potential counterfeit',
    objectTitle: 'Replica sneakers lot',
    objectMeta: '@shade.vintage',
    ageLabel: '5d',
    createdAt: '21 Aug · 13:00',
    evidenceCount: 4,
    evidenceRestricted: false,
    aiSummary: 'Replica language confirmed. Listing removed in Listings module.',
    routingHint: 'Listing concern → Listings',
    reporterStatement: 'Openly selling replica sneakers.',
    linkedReports: [
      { id: 'RPT-2151', label: 'counterfeit cluster' },
      { id: 'RPT-2148', label: 'prohibited item' },
    ],
    isRepeat: true,
    actionTakenNote: 'Listing removed in Listings module',
    history: [
      {
        id: 'h1',
        at: '21 Aug · 13:00',
        title: 'Report received',
      },
      {
        id: 'h2',
        at: '24 Aug · 15:02',
        title: 'Listing removed from marketplace',
        detail: 'O. Bello (Trust & Safety)',
        tone: 'danger',
      },
      {
        id: 'h3',
        at: '24 Aug · 18:02',
        title: 'Report set to Action taken',
        detail: 'O. Bello (Trust & Safety)',
        tone: 'ok',
      },
    ],
  },
  {
    id: 'RPT-2188',
    route: 'Listing',
    reason: 'Item not as described',
    target: 'LST-51940',
    reporter: 'buyer.x',
    status: 'Closed',
    priority: 'P3',
    aiPriority: 'Normal',
    assigned: 'O. Bello',
    assignedToMe: true,
    department: 'Women',
    category: 'Item / listing concern',
    objectTitle: 'Vintage denim jacket',
    objectMeta: '@ada.thrifts',
    ageLabel: '6d',
    createdAt: '20 Aug · 10:05',
    evidenceCount: 2,
    evidenceRestricted: false,
    aiSummary: 'Single post-sale report. No policy breach after human review of photos vs description.',
    aiUnavailable: false,
    routingHint: 'Listing concern → Listings',
    reporterStatement: 'Colour looked different in person.',
    linkedReports: [],
    history: [
      {
        id: 'h1',
        at: '20 Aug · 10:05',
        title: 'Report received',
      },
      {
        id: 'h2',
        at: '20 Aug · 14:20',
        title: 'Assigned · status set to Under review',
        detail: 'O. Bello (Trust & Safety)',
      },
      {
        id: 'h3',
        at: '22 Aug · 09:56',
        title: 'Closed after human review',
        detail: 'No policy breach found — listing description matched the photographs',
        tone: 'ok',
      },
    ],
  },
  {
    id: 'RPT-2220',
    route: 'Listing',
    reason: 'Unclear category',
    target: 'LST-53014',
    reporter: 'tunde.buys',
    status: 'Under review',
    priority: 'P3',
    aiPriority: 'Normal',
    assigned: 'Unassigned',
    department: 'Women',
    category: 'Item / listing concern',
    objectTitle: 'Cropped linen blazer',
    objectMeta: '@ada.thrifts',
    ageLabel: '4h',
    createdAt: '26 Aug · 16:10',
    evidenceCount: 1,
    evidenceRestricted: false,
    aiSummary: '',
    aiUnavailable: true,
    routingHint: 'Listing concern → Listings',
    reporterStatement: 'Wrong department maybe? Looks like menswear cut.',
    linkedReports: [],
    history: [
      {
        id: 'h1',
        at: '26 Aug · 16:10',
        title: 'Report received',
        detail: 'Submitted by @tunde.buys',
      },
      {
        id: 'h2',
        at: '26 Aug · 16:40',
        title: 'Assigned · status set to Under review',
        detail: 'Queue fallback · no AI classification',
      },
    ],
  },
  {
    id: 'RPT-2218',
    route: 'Live',
    reason: 'Unsafe behaviour',
    target: 'LVE-218',
    reporter: 'mum.market',
    status: 'Under review',
    priority: 'P1',
    aiPriority: 'High',
    assigned: 'S. Mensah',
    department: 'Live',
    category: 'Live behavior',
    objectTitle: 'Late night drops',
    objectMeta: '@shade.vintage host',
    ageLabel: '8h',
    createdAt: '26 Aug · 12:00',
    evidenceCount: 5,
    evidenceRestricted: true,
    aiSummary: 'Multiple viewers flagged unsafe on-camera behaviour. Prefer ending Live if still active.',
    aiNextStep: 'open Live and review incident timeline',
    routingHint: 'Live behaviour → Live',
    reporterStatement: 'Host was showing something that should not be on camera.',
    linkedReports: [{ id: 'RPT-904', label: 'unsafe behaviour' }],
    isRepeat: true,
    history: [
      {
        id: 'h1',
        at: '26 Aug · 12:00',
        title: 'Report received',
      },
      {
        id: 'h2',
        at: '26 Aug · 12:30',
        title: 'Assigned · status set to Under review',
        detail: 'S. Mensah (Customer Support)',
      },
    ],
  },
];

export const mockLive: MockLive[] = [
  {
    id: 'LIV-0338',
    host: 'kemi_curates',
    title: 'The Fashion Edit',
    status: 'Live',
    viewers: 412,
    reports: 1,
    startedAt: '09:12',
    timeLabel: 'Started 09:12 · 34m',
    hostApproved: true,
    appointedMods: ['tolu.a', 'grace.n'],
    productCount: 6,
    aiPriority: 'High',
    actionTaken: true,
    aiSummary:
      '1 report (RPT-2214) at 09:38 about a viewer\'s comments. Appointed moderator removed one comment; host muted the viewer. The same viewer has 2 prior reports in other sessions. Recommended: review before considering End Live.',
    aiNextStep: 'review flagged comments and linked report before ending the session',
    flaggedComments: [
      {
        id: 'C-1',
        user: 'viewer_2213',
        text: '[redacted harassment]',
        reason: 'Harassment',
        at: '09:37',
        action: 'Removed by appointed moderator @tolu.a',
      },
      {
        id: 'C-2',
        user: 'viewer_2213',
        text: '[redacted follow-up]',
        reason: 'Repeat behaviour',
        at: '09:38',
        action: 'AI-highlighted for review · host muted viewer',
      },
    ],
    pinnedProducts: [
      { id: 'P1', title: 'Silk scarf', price: 8000, status: 'Available' },
      { id: 'P2', title: 'Denim jacket', price: 16000, status: 'Reserved' },
      { id: 'P3', title: 'Leather belt', price: 6000, status: 'Sold' },
      { id: 'P4', title: 'Wool coat', price: 52000, status: 'Available' },
    ],
    linkedIncidents: [{ id: 'RPT-2214', label: 'Live comment', target: 'viewer_2213' }],
    internalAdmin: 'F. Adeyemi',
    timeline: [
      {
        id: 't1',
        at: '09:12',
        title: 'Session started',
        detail: '2 appointed moderators active',
        tone: 'ok',
      },
      {
        id: 't2',
        at: '09:37',
        title: 'Comment removed by appointed moderator @tolu.a',
        tone: 'warn',
      },
      {
        id: 't3',
        at: '09:38',
        title: 'Viewer muted by host @kemi_curates',
        detail: 'report RPT-2214 raised',
        tone: 'warn',
      },
      {
        id: 't4',
        at: '09:41',
        title: 'Session opened for review by F. Adeyemi (Trust & Safety)',
      },
    ],
  },
  {
    id: 'LIV-0339',
    host: 'lagos_luxe',
    title: 'Bag Sale',
    status: 'Live',
    viewers: 86,
    reports: 0,
    startedAt: '09:40',
    timeLabel: 'Started 09:40 · 6m',
    hostApproved: true,
    appointedMods: [],
    productCount: 4,
    aiPriority: 'Normal',
    aiSummary: 'Clean session so far. Host is moderating alone with no reports.',
    aiNextStep: 'monitor; no platform action required unless reports escalate',
    flaggedComments: [],
    pinnedProducts: [
      { id: 'P1', title: 'Canvas tote', price: 12000, status: 'Available' },
      { id: 'P2', title: 'Belt bag', price: 18000, status: 'Reserved' },
    ],
    linkedIncidents: [],
    timeline: [
      { id: 't1', at: '09:40', title: 'Session started', detail: '0 of a maximum 2 appointed moderators', tone: 'warn' },
    ],
  },
  {
    id: 'LIV-0341',
    host: 'ada_thrift',
    title: 'Weekend Drop',
    status: 'Upcoming',
    viewers: 0,
    reports: 0,
    startedAt: 'Scheduled 27 Aug · 18:00',
    timeLabel: 'Scheduled 27 Aug 18:00',
    scheduledAt: '27 Aug · 18:00',
    hostApproved: true,
    appointedMods: ['mod.joy'],
    productCount: 0,
    aiPriority: 'Normal',
    aiSummary: 'Upcoming weekend drop. One moderator appointed.',
    flaggedComments: [],
    pinnedProducts: [],
    linkedIncidents: [],
    timeline: [{ id: 't1', at: 'Scheduled', title: 'Upcoming session', detail: '1 appointed moderator' }],
  },
  {
    id: 'LIV-0345',
    host: 'shade.vintage',
    title: 'Warehouse clearout',
    status: 'Upcoming',
    viewers: 0,
    reports: 0,
    startedAt: 'Scheduled 16 Sep · 20:00',
    timeLabel: 'Scheduled 28 Aug 20:00',
    scheduledAt: '28 Aug · 20:00',
    hostApproved: false,
    appointedMods: [],
    productCount: 0,
    aiPriority: 'Normal',
    aiSummary: 'Cannot host Live until administrator approval. Hosting stays limited to approved sellers.',
    flaggedComments: [],
    pinnedProducts: [],
    linkedIncidents: [],
    timeline: [
      { id: 't1', at: 'Scheduled', title: 'Upcoming · host not approved', detail: 'Approval is administrator-controlled', tone: 'warn' },
    ],
  },
  {
    id: 'LIV-0346',
    host: 'kemi.closet',
    title: 'Sneaker drops',
    status: 'Upcoming',
    viewers: 0,
    reports: 0,
    startedAt: 'Scheduled 17 Sep · 18:00',
    timeLabel: 'Scheduled 29 Aug 18:00',
    scheduledAt: '29 Aug · 18:00',
    hostApproved: true,
    appointedMods: ['mod.kai'],
    productCount: 5,
    aiPriority: 'Normal',
    aiSummary: 'Scheduled sneaker session. No open incidents.',
    flaggedComments: [],
    pinnedProducts: [],
    linkedIncidents: [],
    timeline: [{ id: 't1', at: 'Scheduled', title: 'Upcoming session' }],
  },
  {
    id: 'LIV-0320',
    host: 'style_by_k',
    title: 'Designer-look evening',
    status: 'Ended',
    viewers: 0,
    reports: 3,
    startedAt: '12 Sep · 21:00',
    timeLabel: 'Ended 21:44 · 44m',
    hostApproved: true,
    appointedMods: ['grace.n'],
    productCount: 2,
    aiPriority: 'High',
    actionTaken: true,
    aiSummary: 'Three reports in one session. Two name the same viewer. Session already ended by host.',
    evidenceRestricted: true,
    flaggedComments: [
      {
        id: 'C-1',
        user: 'anon.shop',
        text: '[redacted]',
        reason: 'Hate speech',
        at: '21:22',
        action: 'Removed by moderator @grace.n',
      },
    ],
    pinnedProducts: [{ id: 'P1', title: 'Monogram tote', price: 48000, status: 'Sold' }],
    linkedIncidents: [
      { id: 'RPT-2205', label: 'Live behavior', target: 'anon.shop' },
      { id: 'RPT-2206', label: 'Live behavior', target: 'anon.shop' },
      { id: 'RPT-2207', label: 'Live comment', target: 'viewer.z' },
    ],
    timeline: [
      { id: 't1', at: '21:00', title: 'Session started' },
      { id: 't2', at: '21:40', title: 'Multiple reports associated', tone: 'danger' },
      { id: 't3', at: '21:44', title: 'Session ended by the host', tone: 'ok' },
    ],
  },
  {
    id: 'LIV-0312',
    host: 'shade.vintage',
    title: 'Late night drops',
    status: 'Incident',
    viewers: 0,
    reports: 4,
    startedAt: '10 Sep · 20:40',
    timeLabel: 'Ended by T&S · 32m',
    hostApproved: false,
    appointedMods: [],
    productCount: 1,
    aiPriority: 'High',
    connectionIssue: true,
    actionTaken: true,
    aiSummary: 'Prior unsafe behaviour led to forced end and host revoke. Audit trail complete.',
    flaggedComments: [],
    pinnedProducts: [],
    linkedIncidents: [{ id: 'RPT-904', label: 'Unsafe behaviour' }],
    internalAdmin: 'O. Bello',
    timeline: [
      { id: 't1', at: '20:40', title: 'Session started' },
      { id: 't2', at: '21:05', title: 'Unsafe behaviour reported', tone: 'danger' },
      { id: 't3', at: '21:12', title: 'Live ended by T&S', detail: 'Platform safety', tone: 'danger' },
      { id: 't4', at: '21:40', title: 'Host revoked', tone: 'ok' },
    ],
  },
  {
    id: 'LIV-0301',
    host: 'ada.thrifts',
    title: 'Weeknight edit',
    status: 'Ended',
    viewers: 0,
    reports: 0,
    startedAt: '8 Sep · 19:00',
    timeLabel: 'Ended · 48m',
    hostApproved: true,
    appointedMods: ['mod.joy', 'mod.kai'],
    productCount: 3,
    aiPriority: 'Normal',
    aiSummary: 'Clean session. Ended normally. No enforcement history.',
    flaggedComments: [],
    pinnedProducts: [],
    linkedIncidents: [],
    timeline: [
      { id: 't1', at: '19:00', title: 'Session started', tone: 'ok' },
      { id: 't2', at: '20:15', title: 'Session ended by the host', tone: 'ok' },
    ],
  },
];

export const mockOrders: MockOrder[] = [
  {
    id: 'ORD-88213',
    listing: 'Tan leather shoulder bag',
    listingId: 'LST-51244',
    buyer: 'ada_e',
    seller: 'lagos_luxe',
    itemPrice: 34000,
    buyerProtection: 1700,
    deliveryFee: 2500,
    total: 38200,
    status: 'Delivered',
    paymentStatus: 'Confirmed',
    delivery: 'Marked 24 Aug',
    deliveryMethod: 'Standard',
    deliveryLabel: 'Delivered · marked 24 Aug',
    deliveryArea: 'Lagos',
    addressRestricted: true,
    createdAt: '2026-08-22',
    placedAt: '22 Aug · 10:04',
    paymentId: 'PMT-6621',
    payoutId: 'PAY-9911',
    disputeId: 'DSP-4471',
    department: 'Women',
    category: 'Bags',
    condition: 'Good',
    flags: ['dispute', 'hold'],
    needsAssistance: true,
    completionPaused: true,
    aiSummary:
      'Payment confirmed. Seller dispatched and marked delivered. Buyer opened DSP-4471 after delivery was marked. 48-hour completion is paused and seller payout is On Hold. Recommended for support: confirm the case with Trust & Safety before contacting the buyer.',
    aiNextStep:
      'confirm the case with Trust & Safety before contacting the buyer — do not override order status',
    linkedRecords: [
      { id: 'DSP-4471', kind: 'dispute', label: 'under review' },
      { id: 'PMT-6621', kind: 'payment', label: 'payment confirmed', financeOnly: true },
      { id: 'PAY-9911', kind: 'payout', label: 'payout On Hold', financeOnly: true },
      { id: 'LST-51244', kind: 'listing', label: 'Tan leather shoulder bag' },
    ],
    timeline: [
      { id: 'o1', at: '22 Aug 10:04', title: 'Payment confirmed', detail: 'Paid', tone: 'ok' },
      { id: 'o2', at: '22 Aug 10:04', title: 'Awaiting dispatch' },
      { id: 'o3', at: '22 Aug 17:31', title: 'Dispatched', detail: 'handed over for delivery' },
      { id: 'o4', at: '23 Aug 08:12', title: 'In transit' },
      { id: 'o5', at: '24 Aug 14:55', title: 'Marked Delivered', tone: 'ok' },
      {
        id: 'o6',
        at: '25 Aug 16:12',
        title: 'Dispute opened',
        detail: '48-hour clock paused',
        tone: 'danger',
      },
    ],
  },
  {
    id: 'ORD-88301',
    listing: 'Nike Dunk Low Panda',
    listingId: 'LST-52011',
    buyer: 'tunde.buys',
    seller: 'kemi.closet',
    itemPrice: 52000,
    buyerProtection: 2600,
    deliveryFee: 2500,
    total: 57100,
    status: 'Awaiting dispatch',
    paymentStatus: 'Confirmed',
    delivery: 'Not yet dispatched',
    deliveryMethod: 'Express',
    deliveryLabel: 'Awaiting seller dispatch',
    deliveryArea: 'Abuja',
    addressRestricted: true,
    createdAt: '2026-08-26',
    placedAt: '26 Aug · 11:02',
    paymentId: 'PMT-8830',
    department: 'Men',
    category: 'Shoes',
    condition: 'Like new',
    flags: ['cancellable'],
    needsAssistance: true,
    cancellableBy: 'Buyer or seller',
    aiSummary:
      'Paid and awaiting dispatch. Cancellation window still open for buyer or seller. Admins can see history but cannot cancel.',
    aiNextStep: 'advise parties; no admin cancel control on this screen',
    linkedRecords: [
      { id: 'PMT-8830', kind: 'payment', label: 'Confirmed' },
      { id: 'LST-52011', kind: 'listing', label: 'Nike Dunk Low Panda' },
    ],
    timeline: [
      { id: 'o1', at: '26 Aug 11:02', title: 'Payment confirmed', detail: 'Paid', tone: 'ok' },
      { id: 'o2', at: '26 Aug 11:05', title: 'Awaiting dispatch', detail: 'Cancellable by buyer or seller' },
    ],
  },
  {
    id: 'ORD-88240',
    listing: 'Kids party dress',
    listingId: 'LST-51955',
    buyer: 'mum.market',
    seller: 'ada.thrifts',
    itemPrice: 9000,
    buyerProtection: 450,
    deliveryFee: 2000,
    total: 11450,
    status: 'Cancelled',
    paymentStatus: 'Confirmed',
    delivery: 'Cancelled pre-dispatch',
    deliveryMethod: 'Standard',
    deliveryLabel: 'Cancelled before dispatch',
    createdAt: '2026-08-21',
    placedAt: '21 Aug · 09:40',
    paymentId: 'PMT-8240',
    refundId: 'REF-3312',
    department: 'Kids',
    category: 'Dresses',
    condition: 'Excellent',
    flags: ['refund'],
    needsAssistance: true,
    aiSummary:
      'Seller cancelled before dispatch. Listing returned to Available. Refund REF-3312 awaiting Finance.',
    aiNextStep: 'direct Finance to Refunds — order history retained',
    linkedRecords: [
      { id: 'REF-3312', kind: 'refund', label: 'awaiting Finance', financeOnly: true },
      { id: 'PMT-8240', kind: 'payment', label: 'Confirmed' },
      { id: 'LST-51955', kind: 'listing', label: 'Returned to Available' },
    ],
    timeline: [
      { id: 'o1', at: '21 Aug 09:40', title: 'Payment confirmed', tone: 'ok' },
      {
        id: 'o2',
        at: '25 Aug 11:02',
        title: 'Cancelled by seller',
        detail: 'before dispatch',
        tone: 'warn',
      },
      {
        id: 'o3',
        at: '25 Aug 11:02',
        title: 'Listing LST-51955 returned to Available',
        tone: 'ok',
      },
      {
        id: 'o4',
        at: '25 Aug 11:03',
        title: 'Refund REF-3312 created',
        detail: 'awaiting Finance',
        tone: 'warn',
      },
    ],
  },  {
    id: 'ORD-88190',
    listing: 'Cropped linen blazer',
    listingId: 'LST-53014',
    buyer: 'kemi.closet',
    seller: 'ada.thrifts',
    itemPrice: 27500,
    buyerProtection: 1375,
    deliveryFee: 2500,
    total: 31375,
    status: 'Paid',
    paymentStatus: 'Uncertain',
    delivery: 'Not started',
    deliveryMethod: 'Standard',
    deliveryLabel: 'Held until payment verified',
    createdAt: '2026-08-27',
    placedAt: '27 Aug · 08:15',
    paymentId: 'PMT-6702',
    department: 'Women',
    category: 'Outerwear',
    condition: 'Excellent',
    flags: ['verify'],
    needsAssistance: true,
    aiSummary:
      'Order is not Paid. Payment PMT-6702 is being verified. The order does not advance and the buyer is asked not to pay again.',
    aiNextStep: 'wait for provider verification in Payments — do not mark paid here',
    linkedRecords: [
      { id: 'PMT-6702', kind: 'payment', label: 'Verifying', financeOnly: true },
      { id: 'LST-53014', kind: 'listing', label: 'Cropped linen blazer' },
    ],
    timeline: [
      { id: 'o1', at: '27 Aug · 08:15', title: 'Checkout started' },
      { id: 'o2', at: '27 Aug · 08:16', title: 'Payment uncertain', detail: 'PMT-6702 verifying', tone: 'warn' },
    ],
  },
  {
    id: 'ORD-88150',
    listing: 'Vintage denim jacket',
    listingId: 'LST-51940',
    buyer: 'tunde.buys',
    seller: 'ada.thrifts',
    itemPrice: 34000,
    buyerProtection: 1700,
    deliveryFee: 2500,
    total: 38200,
    status: 'In transit',
    paymentStatus: 'Confirmed',
    delivery: 'In transit · Express',
    deliveryMethod: 'Express',
    deliveryLabel: 'Carrier scan · 2 days out',
    deliveryArea: 'Ibadan',
    addressRestricted: true,
    createdAt: '2026-08-24',
    placedAt: '24 Aug · 12:30',
    paymentId: 'PMT-8150',
    department: 'Women',
    category: 'Outerwear',
    condition: 'Good',
    flags: [],
    needsAssistance: false,
    aiSummary: 'Paid, dispatched, in transit. No open disputes or holds.',
    linkedRecords: [
      { id: 'PMT-8150', kind: 'payment', label: 'Confirmed' },
      { id: 'LST-51940', kind: 'listing', label: 'Vintage denim jacket' },
    ],
    timeline: [
      { id: 'o1', at: '24 Aug · 12:30', title: 'Payment confirmed', tone: 'ok' },
      { id: 'o2', at: '24 Aug · 18:00', title: 'Dispatched', detail: 'Express' },
      { id: 'o3', at: '25 Aug · 09:20', title: 'In transit', tone: 'ok' },
    ],
  },
  {
    id: 'ORD-88088',
    listing: 'Silk scarf',
    listingId: 'LST-52301',
    buyer: 'ada_e',
    seller: 'style_by_k',
    itemPrice: 15000,
    buyerProtection: 750,
    deliveryFee: 2000,
    total: 17750,
    status: 'Delivered',
    paymentStatus: 'Confirmed',
    delivery: 'Delivered 26 Aug',
    deliveryMethod: 'Standard',
    deliveryLabel: 'Delivered · awaiting buyer confirm',
    deliveryArea: 'Lagos',
    addressRestricted: true,
    createdAt: '2026-08-23',
    placedAt: '23 Aug · 16:00',
    paymentId: 'PMT-8088',
    payoutId: 'PAY-8088',
    department: 'Women',
    category: 'Accessories',
    condition: 'New with tags',
    flags: ['payout'],
    needsAssistance: false,
    recordStale: {
      by: 'System',
      action: 'The buyer confirmed receipt at 09:44',
      at: '26 Aug · 09:44',
    },
    aiSummary: 'Delivered. Buyer confirmation window open unless already confirmed by another update.',
    linkedRecords: [
      { id: 'PMT-8088', kind: 'payment', label: 'Confirmed' },
      { id: 'PAY-8088', kind: 'payout', label: 'Queued', financeOnly: true },
      { id: 'LST-52301', kind: 'listing', label: 'Silk scarf' },
    ],
    timeline: [
      { id: 'o1', at: '23 Aug 16:00', title: 'Payment confirmed', tone: 'ok' },
      { id: 'o2', at: '24 Aug 10:00', title: 'Dispatched' },
      { id: 'o3', at: '26 Aug 07:10', title: 'Marked delivered', tone: 'ok' },
    ],
  },
  {
    id: 'ORD-87990',
    listing: 'Men’s leather belt',
    listingId: 'LST-52988',
    buyer: 'buyer.x',
    seller: 'kemi.closet',
    itemPrice: 6500,
    buyerProtection: 325,
    deliveryFee: 2000,
    total: 8825,
    status: 'Completed',
    paymentStatus: 'Confirmed',
    delivery: 'Receipt confirmed',
    deliveryMethod: 'Standard',
    deliveryLabel: 'Buyer confirmed receipt',
    deliveryArea: 'Port Harcourt',
    createdAt: '2026-08-18',
    placedAt: '18 Aug · 11:20',
    paymentId: 'PMT-7990',
    payoutId: 'PAY-7990',
    department: 'Men',
    category: 'Accessories',
    condition: 'Good',
    flags: ['payout'],
    needsAssistance: false,
    aiSummary:
      'Completed · payout eligible. Buyer confirmed receipt 26 Aug 07:40, ahead of the 48-hour window.',
    linkedRecords: [
      { id: 'PMT-7990', kind: 'payment', label: 'Confirmed' },
      { id: 'PAY-7990', kind: 'payout', label: 'Eligible', financeOnly: true },
      { id: 'LST-52988', kind: 'listing', label: 'Men’s leather belt' },
    ],
    timeline: [
      { id: 'o1', at: '18 Aug 11:20', title: 'Payment confirmed', tone: 'ok' },
      { id: 'o2', at: '19 Aug 09:00', title: 'Dispatched' },
      { id: 'o3', at: '21 Aug 14:00', title: 'Delivered', tone: 'ok' },
      {
        id: 'o4',
        at: '26 Aug 07:40',
        title: 'Buyer confirmed receipt',
        detail: 'Completed · payout eligible',
        tone: 'ok',
      },
    ],
  },
  {
    id: 'ORD-87801',
    listing: 'Replica sneakers lot',
    listingId: 'LST-52240',
    buyer: 'tunde.buys',
    seller: 'shade.vintage',
    itemPrice: 28000,
    buyerProtection: 1400,
    deliveryFee: 2500,
    total: 31900,
    status: 'Cancelled',
    paymentStatus: 'Confirmed',
    delivery: 'Cancelled · refunded',
    deliveryMethod: 'Standard',
    deliveryLabel: 'Refund completed',
    createdAt: '2026-08-15',
    placedAt: '15 Aug · 13:00',
    paymentId: 'PMT-7801',
    refundId: 'REF-3298',
    department: 'Men',
    category: 'Shoes',
    condition: 'New',
    flags: ['refund'],
    needsAssistance: false,
    aiSummary: 'Refund REF-3298 completed. Executed by Finance — order history retained.',
    linkedRecords: [
      { id: 'REF-3298', kind: 'refund', label: 'completed', financeOnly: true },
      { id: 'PMT-7801', kind: 'payment', label: 'Confirmed' },
    ],
    timeline: [
      { id: 'o1', at: '15 Aug 13:00', title: 'Payment confirmed', tone: 'ok' },
      { id: 'o2', at: '15 Aug 16:40', title: 'Cancelled by Trust & Safety', detail: 'Prohibited item', tone: 'danger' },
      { id: 'o3', at: '16 Aug 10:00', title: 'Refund completed', detail: 'REF-3298', tone: 'ok' },
    ],
  },  {
    id: 'ORD-87750',
    listing: 'Wool coat',
    listingId: 'LST-51800',
    buyer: 'ada.thrifts',
    seller: 'mum.market',
    itemPrice: 52000,
    buyerProtection: 2600,
    deliveryFee: 3000,
    total: 57600,
    status: 'Awaiting dispatch',
    paymentStatus: 'Confirmed',
    delivery: 'Seller packing',
    deliveryMethod: 'Express',
    deliveryLabel: 'Awaiting dispatch',
    deliveryArea: 'Lagos',
    addressRestricted: true,
    createdAt: '2026-08-28',
    placedAt: '28 Aug · 19:10',
    paymentId: 'PMT-7750',
    department: 'Women',
    category: 'Outerwear',
    condition: 'Very good',
    flags: ['cancellable'],
    needsAssistance: true,
    cancellableBy: 'Buyer or seller',
    aiSummary: 'Fresh paid order awaiting dispatch. Cancellation still available to parties.',
    linkedRecords: [
      { id: 'PMT-7750', kind: 'payment', label: 'Confirmed' },
      { id: 'LST-51800', kind: 'listing', label: 'Wool coat' },
    ],
    timeline: [
      { id: 'o1', at: '28 Aug · 19:10', title: 'Payment confirmed', tone: 'ok' },
      { id: 'o2', at: '28 Aug · 19:12', title: 'Awaiting dispatch' },
    ],
  },
  {
    id: 'ORD-87620',
    listing: 'Designer-look monogram tote',
    listingId: 'LST-51872',
    buyer: 'buyer.x',
    seller: 'style_by_k',
    itemPrice: 48000,
    buyerProtection: 2400,
    deliveryFee: 2500,
    total: 52900,
    status: 'Disputed',
    paymentStatus: 'Confirmed',
    delivery: 'Paused · dispute',
    deliveryMethod: 'Standard',
    deliveryLabel: 'Fulfillment paused',
    deliveryArea: 'Lagos',
    addressRestricted: true,
    createdAt: '2026-08-19',
    placedAt: '19 Aug · 14:22',
    paymentId: 'PMT-7620',
    payoutId: 'PAY-7620',
    disputeId: 'DSP-4401',
    department: 'Women',
    category: 'Bags',
    condition: 'Very good',
    flags: ['dispute', 'hold'],
    needsAssistance: true,
    completionPaused: true,
    aiSummary: 'In-transit dispute on authenticity. Payout held. Route support to Disputes.',
    aiNextStep: 'open DSP-4401',
    linkedRecords: [
      { id: 'DSP-4401', kind: 'dispute', label: 'authenticity' },
      { id: 'PMT-7620', kind: 'payment', label: 'Confirmed' },
      { id: 'PAY-7620', kind: 'payout', label: 'On hold', financeOnly: true },
    ],
    timeline: [
      { id: 'o1', at: '19 Aug · 14:22', title: 'Payment confirmed', tone: 'ok' },
      { id: 'o2', at: '20 Aug · 10:00', title: 'Dispatched' },
      { id: 'o3', at: '21 Aug · 11:30', title: 'Dispute opened', detail: 'DSP-4401', tone: 'danger' },
      { id: 'o4', at: '21 Aug · 11:31', title: 'Payout held', tone: 'warn' },
    ],
  },
  {
    id: 'ORD-87500',
    listing: 'Kids trainers · EU 30',
    listingId: 'LST-53022',
    buyer: 'mum.market',
    seller: 'ada.thrifts',
    itemPrice: 8500,
    buyerProtection: 425,
    deliveryFee: 2000,
    total: 10925,
    status: 'Paid',
    paymentStatus: 'Confirmed',
    delivery: 'Not yet confirmed by seller',
    deliveryMethod: 'Standard',
    deliveryLabel: 'Paid · seller to confirm',
    deliveryArea: 'Enugu',
    addressRestricted: true,
    createdAt: '2026-08-29',
    placedAt: '29 Aug · 07:55',
    paymentId: 'PMT-7500',
    department: 'Kids',
    category: 'Shoes',
    condition: 'Good',
    flags: [],
    needsAssistance: false,
    aiSummary: 'Newly paid. Clean — no flags.',
    linkedRecords: [
      { id: 'PMT-7500', kind: 'payment', label: 'Confirmed' },
      { id: 'LST-53022', kind: 'listing', label: 'Kids trainers' },
    ],
    timeline: [{ id: 'o1', at: '29 Aug · 07:55', title: 'Payment confirmed', tone: 'ok' }],
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
    id: 'PMT-6702',
    orderId: 'ORD-88318',
    buyer: 'tolu.a',
    itemTitle: 'Structured blazer',
    itemPrice: 48000,
    deliveryFee: 2500,
    deliveryMethod: 'Standard',
    buyerProtection: 2400,
    amount: 52900,
    status: 'Status uncertain',
    needsAttention: true,
    at: '27 Aug 09:22',
    placedLabel: '27 Aug · 09:22',
    providerRefMasked: 'Held ···· 7702',
    verification: 'Pending',
    environment: 'Test · simulated, no real money',
    attentionTitle: 'Verification required — do not resolve this manually',
    attentionBody:
      'Provider verification is pending. Do not ask the buyer to pay again, and do not mark this paid from admin.',
    aiSummary:
      'Two attempts exist for ORD-88318 two minutes apart with identical amounts. Neither attempt has a confirmed provider result yet.',
    aiNextStep: 'verify both references with the provider before any buyer-facing advice',
    timeline: [
      { id: 't1', at: '09:22:04', title: 'Initiated from checkout' },
      { id: 't2', at: '09:22:31', title: 'Processing' },
      { id: 't3', at: '09:23:10', title: 'No confirmed result received' },
      { id: 't4', at: '09:41:00', title: 'Verification attempt', detail: 'still unresolved' },
    ],
    relatedAttempts: [
      { id: 'PMT-6702', at: '09:22', amount: 52900, status: 'Uncertain', kind: 'payment' },
      { id: 'PMT-6703', at: '09:24', amount: 52900, status: 'Duplicate risk', kind: 'payment' },
      { id: 'ORD-88318', at: '', amount: 0, status: 'Not yet Paid', kind: 'order' },
    ],
    history: [
      {
        id: 'h1',
        at: '27 Aug 09:41',
        title: 'Verification requested',
        detail: 'I. Danjuma (Finance) · no status change',
      },
      {
        id: 'h2',
        at: '27 Aug 09:43',
        title: 'Internal note added',
        detail: 'I. Danjuma (Finance)',
      },
    ],
    orderStatusLabel: 'Not yet Paid',
    recordStale: {
      title: 'Verification returned while you were reviewing',
      body: "Reload — this record's status has moved on.",
    },
  },
  {
    id: 'PMT-6703',
    orderId: 'ORD-88318',
    buyer: 'tolu.a',
    itemTitle: 'Structured blazer',
    itemPrice: 48000,
    deliveryFee: 2500,
    deliveryMethod: 'Standard',
    buyerProtection: 2400,
    amount: 52900,
    status: 'Duplicate risk',
    needsAttention: true,
    at: '27 Aug 09:24',
    placedLabel: '27 Aug · 09:24',
    providerRefMasked: 'Held ···· 7703',
    verification: 'Pending',
    environment: 'Test · simulated, no real money',
    attentionTitle: 'Two attempts, no confirmed result on either',
    attentionBody:
      'Duplicate-payment risk. Verify both provider references before advising the buyer. No automated refund or delete.',
    aiSummary:
      'Second attempt for ORD-88318 two minutes after PMT-6702 with an identical total. Human verification required.',
    aiNextStep: 'verify both references; do not charge again',
    timeline: [
      { id: 't1', at: '09:24:18', title: 'Initiated from checkout' },
      { id: 't2', at: '09:24:40', title: 'Processing' },
      { id: 't3', at: '09:25:02', title: 'No confirmed result received' },
    ],
    relatedAttempts: [
      { id: 'PMT-6702', at: '09:22', amount: 52900, status: 'Uncertain', kind: 'payment' },
      { id: 'PMT-6703', at: '09:24', amount: 52900, status: 'Duplicate risk', kind: 'payment' },
      { id: 'ORD-88318', at: '', amount: 0, status: 'Not yet Paid', kind: 'order' },
    ],
    history: [],
    orderStatusLabel: 'Not yet Paid',
  },
  {
    id: 'PMT-6688',
    orderId: 'ORD-88305',
    buyer: 'ada_e',
    itemTitle: 'Linen midi dress',
    itemPrice: 22000,
    deliveryFee: 2500,
    deliveryMethod: 'Standard',
    buyerProtection: 1100,
    amount: 25600,
    status: 'Confirmed failed',
    needsAttention: true,
    at: '26 Aug 18:18',
    placedLabel: '26 Aug · 18:18',
    providerRefMasked: 'Held ···· 6688',
    verification: 'Failed',
    environment: 'Test · simulated, no real money',
    attentionTitle: 'Provider confirmed the attempt failed',
    attentionBody: 'The order is not treated as paid. The buyer must retry checkout themselves.',
    failedConfirmedAt: '26 Aug 18:22',
    timeline: [
      { id: 't1', at: '18:18:02', title: 'Initiated from checkout' },
      { id: 't2', at: '18:18:40', title: 'Processing' },
      { id: 't3', at: '18:22:11', title: 'Provider confirmed failed' },
    ],
    relatedAttempts: [
      { id: 'ORD-88305', at: '', amount: 0, status: 'Not yet Paid', kind: 'order' },
    ],
    history: [
      {
        id: 'h1',
        at: '26 Aug 18:22',
        title: 'Provider result verified',
        detail: 'Failed · confirmed',
      },
    ],
    orderStatusLabel: 'Not yet Paid',
  },
  {
    id: 'PMT-6694',
    orderId: 'ORD-88310',
    buyer: 'kemi.closet',
    itemTitle: 'Vintage denim',
    itemPrice: 34000,
    deliveryFee: 2500,
    deliveryMethod: 'Express',
    buyerProtection: 1700,
    amount: 38200,
    status: 'Status uncertain',
    needsAttention: true,
    at: '27 Aug 08:05',
    placedLabel: '27 Aug · 08:05',
    providerRefMasked: 'Held ···· 6694',
    verification: 'Pending',
    environment: 'Test · simulated, no real money',
    attentionTitle: 'Verification required — do not resolve this manually',
    attentionBody: 'Provider has not returned a final result. Order remains Not yet Paid.',
    timeline: [
      { id: 't1', at: '08:05:10', title: 'Initiated from checkout' },
      { id: 't2', at: '08:05:44', title: 'Processing' },
      { id: 't3', at: '08:12:00', title: 'No confirmed result received' },
    ],
    relatedAttempts: [{ id: 'ORD-88310', at: '', amount: 0, status: 'Not yet Paid', kind: 'order' }],
    history: [],
    orderStatusLabel: 'Not yet Paid',
  },
  {
    id: 'PMT-6670',
    orderId: 'ORD-88290',
    buyer: 'mum.market',
    itemTitle: 'Kids trainers',
    itemPrice: 8500,
    deliveryFee: 2000,
    deliveryMethod: 'Standard',
    buyerProtection: 425,
    amount: 10925,
    status: 'Successful',
    needsAttention: false,
    at: '25 Aug 12:00',
    placedLabel: '25 Aug · 12:00',
    providerRefMasked: 'Held ···· 6670',
    verification: 'Verified',
    environment: 'Test · simulated, no real money',
    timeline: [
      { id: 't1', at: '12:00:02', title: 'Initiated from checkout' },
      { id: 't2', at: '12:00:18', title: 'Processing' },
      { id: 't3', at: '12:00:41', title: 'Provider confirmed success', detail: 'Order advanced to Paid' },
    ],
    relatedAttempts: [{ id: 'ORD-88290', at: '', amount: 0, status: 'Paid', kind: 'order' }],
    history: [
      {
        id: 'h1',
        at: '25 Aug 12:00',
        title: 'Verified provider result',
        detail: 'Order advanced to Paid by workflow',
      },
    ],
    orderStatusLabel: 'Paid',
  },
  {
    id: 'PMT-6661',
    orderId: 'ORD-88280',
    buyer: 'buyer.x',
    itemTitle: 'Silk scarf',
    itemPrice: 8000,
    deliveryFee: 2000,
    deliveryMethod: 'Standard',
    buyerProtection: 400,
    amount: 10400,
    status: 'Cancelled',
    needsAttention: false,
    at: '24 Aug 16:40',
    placedLabel: '24 Aug · 16:40',
    providerRefMasked: 'Held ···· 6661',
    verification: 'Not required',
    environment: 'Test · simulated, no real money',
    attentionTitle: 'Checkout window closed',
    attentionBody: 'The buyer did not complete the attempt. No order was created as paid.',
    timeline: [
      { id: 't1', at: '16:40:10', title: 'Initiated from checkout' },
      { id: 't2', at: '16:45:00', title: 'Checkout window closed', detail: 'Cancelled attempt' },
    ],
    relatedAttempts: [],
    history: [],
  },
  {
    id: 'PMT-6710',
    orderId: 'ORD-88322',
    buyer: 'style_by_k',
    itemTitle: 'Just Initiated',
    itemPrice: 20000,
    deliveryFee: 2500,
    deliveryMethod: 'Standard',
    buyerProtection: 1000,
    amount: 23500,
    status: 'Initiated',
    needsAttention: true,
    at: '27 Aug 10:11',
    placedLabel: '27 Aug · 10:11',
    providerRefMasked: 'Held ···· 6710',
    verification: 'Pending',
    environment: 'Test · simulated, no real money',
    attentionTitle: 'Attempt in progress',
    attentionBody: 'No result yet. Nothing to act on; the order is not Paid.',
    timeline: [
      { id: 't1', at: '10:11:02', title: 'Initiated from checkout' },
      { id: 't2', at: '10:11:20', title: 'Processing' },
    ],
    relatedAttempts: [{ id: 'ORD-88322', at: '', amount: 0, status: 'Not yet Paid', kind: 'order' }],
    history: [],
    orderStatusLabel: 'Not yet Paid',
  },
  {
    id: 'PMT-6640',
    orderId: 'ORD-88240',
    buyer: 'mum.market',
    itemTitle: 'Kids party dress',
    itemPrice: 9000,
    deliveryFee: 2000,
    deliveryMethod: 'Standard',
    buyerProtection: 450,
    amount: 11450,
    status: 'Successful',
    needsAttention: false,
    at: '21 Aug 09:40',
    placedLabel: '21 Aug · 09:40',
    providerRefMasked: 'Held ···· 6640',
    verification: 'Verified',
    environment: 'Test · simulated, no real money',
    linkedRefundId: 'REF-3312',
    linkedRefundLabel: 'awaiting Finance',
    timeline: [
      { id: 't1', at: '09:40:00', title: 'Initiated from checkout' },
      { id: 't2', at: '09:40:22', title: 'Provider confirmed success' },
      { id: 't3', at: '25 Aug 11:03', title: 'Refund created', detail: 'REF-3312 · awaiting Finance' },
    ],
    relatedAttempts: [
      { id: 'ORD-88240', at: '', amount: 0, status: 'Cancelled', kind: 'order' },
      { id: 'REF-3312', at: '', amount: 0, status: 'awaiting Finance', kind: 'order' },
    ],
    history: [],
    orderStatusLabel: 'Cancelled · refund pending',
  },
];

export const mockRefunds: MockRefund[] = [
  {
    id: 'REF-3320',
    orderId: 'ORD-88052',
    buyer: 'ada_e',
    createdAt: '26 Aug 10:06',
    status: 'Awaiting Finance',
    origin: 'Eligible dispute',
    originDetail: 'Buyer-win decision · delivery refundability still to confirm',
    decisionId: 'DSP-4483',
    decidedBy: 'F. Adeyemi (Trust & Safety)',
    decidedAt: '26 Aug 10:04',
    itemAmount: 86000,
    buyerProtectionAmount: 2500,
    buyerProtectionIncluded: true,
    deliveryAmount: 2500,
    deliveryStatus: 'in_question',
    deliveryNote: '₦2,500 in question',
    totalLabel: 'Not final',
    needsDeliveryDetermination: true,
    paymentId: 'PMT-6588',
    payoutId: 'PAY-9948',
    disputeId: 'DSP-4483',
    orderStatusLabel: 'Delivered',
    whyExists:
      'Eligible dispute decided in the buyer’s favour. Item and Buyer Protection are refundable. Delivery inclusion depends on a recorded policy determination before Finance can execute.',
    linkedRecords: [
      { id: 'DSP-4483', kind: 'dispute', label: 'decision recorded', openLabel: 'Open decision' },
      { id: 'ORD-88052', kind: 'order', label: 'Delivered', openLabel: 'Open order' },
      { id: 'PMT-6588', kind: 'payment', label: 'original payment', openLabel: 'Open payment' },
      { id: 'PAY-9948', kind: 'payout', label: 'payout On Hold', openLabel: 'Open payout' },
    ],
    history: [
      {
        id: 'h1',
        at: '26 Aug 10:04',
        title: 'Dispute decided — refund buyer',
        detail: 'F. Adeyemi (Trust & Safety) · AI-assisted review',
      },
      {
        id: 'h2',
        at: '26 Aug 10:06',
        title: 'Refund record created · awaiting Finance',
        detail: 'System',
      },
    ],
    recordStale: {
      title: 'Components changed while you were reviewing',
      body: 'The delivery determination was recorded by another admin. Reload — the record is revalidated before execution.',
    },
  },
  {
    id: 'REF-3312',
    orderId: 'ORD-88240',
    buyer: 'CHIBUZO',
    createdAt: '25 Aug 11:03',
    status: 'Ready to execute',
    origin: 'Valid cancellation',
    originDetail: 'Cancelled pre-dispatch · not a dispute decision',
    itemAmount: 6000,
    buyerProtectionAmount: 450,
    buyerProtectionIncluded: false,
    buyerProtectionNote: 'not included for this cancellation reason',
    deliveryAmount: 2500,
    deliveryStatus: 'include',
    deliveryNote: 'never dispatched; cost not incurred',
    totalFinal: 8500,
    totalLabel: '₦8,500',
    needsDeliveryDetermination: false,
    paymentId: 'PMT-8640',
    orderStatusLabel: 'Cancelled pre-dispatch',
    whyExists:
      'Valid cancellation before dispatch. Because there is no seller failure, Buyer Protection is not refunded. Delivery was never incurred and is included. Finance cannot type a custom amount.',
    linkedRecords: [
      { id: 'ORD-88240', kind: 'order', label: 'Cancelled pre-dispatch', openLabel: 'Open order' },
      { id: 'PMT-8640', kind: 'payment', label: 'confirmed', openLabel: 'Open payment' },
    ],
    history: [
      {
        id: 'h1',
        at: '25 Aug 11:02',
        title: 'Cancelled by seller · before dispatch',
        detail: 'System',
      },
      {
        id: 'h2',
        at: '25 Aug 11:03',
        title: 'Refund record created · ready to execute',
        detail: 'System',
      },
    ],
  },
  {
    id: 'REF-3305',
    orderId: 'ORD-88190',
    buyer: 'kemi.closet',
    createdAt: '28 Aug 16:40',
    status: 'Processing',
    origin: 'Seller failure to fulfill',
    originDetail: 'Fulfilment failure · Buyer Protection included',
    itemAmount: 12000,
    buyerProtectionAmount: 600,
    buyerProtectionIncluded: true,
    deliveryAmount: 2500,
    deliveryStatus: 'include',
    deliveryNote: 'included · fulfilment failure',
    totalFinal: 15100,
    totalLabel: '₦15,100',
    needsDeliveryDetermination: false,
    paymentId: 'PMT-6702',
    orderStatusLabel: 'Cancelled',
    whyExists:
      'Seller failed to fulfill. Item, Buyer Protection and delivery are refundable under approved policy.',
    linkedRecords: [
      { id: 'ORD-88190', kind: 'order', label: 'Cancelled', openLabel: 'Open order' },
      { id: 'PMT-6702', kind: 'payment', label: 'original payment', openLabel: 'Open payment' },
    ],
    history: [
      {
        id: 'h1',
        at: '28 Aug 16:40',
        title: 'Refund record created',
        detail: 'System',
      },
      {
        id: 'h2',
        at: '30 Aug 11:20',
        title: 'Submitted to the provider',
        detail: 'I. Danjuma · awaiting confirmation',
      },
    ],
    processingAt: '30 Aug 11:20',
    processingBy: 'I. Danjuma',
  },
  {
    id: 'REF-3298',
    orderId: 'ORD-87801',
    buyer: 'tola.a',
    createdAt: '24 Aug 09:12',
    status: 'Completed',
    origin: 'Valid cancellation',
    originDetail: 'Pre-dispatch cancellation · no fulfilment failure',
    itemAmount: 20000,
    buyerProtectionAmount: 1000,
    buyerProtectionIncluded: false,
    buyerProtectionNote: 'not included · no fulfilment failure',
    deliveryAmount: 2500,
    deliveryStatus: 'include',
    totalFinal: 22500,
    totalLabel: '₦22,500',
    needsDeliveryDetermination: false,
    paymentId: 'PMT-5502',
    orderStatusLabel: 'Cancelled',
    whyExists: 'Pre-dispatch cancellation completed. Original payment unchanged; order history preserved.',
    linkedRecords: [
      { id: 'ORD-87801', kind: 'order', label: 'Cancelled', openLabel: 'Open order' },
      { id: 'PMT-5502', kind: 'payment', label: 'unchanged', openLabel: 'Open payment' },
    ],
    history: [
      {
        id: 'h1',
        at: '24 Aug 09:12',
        title: 'Refund record created',
      },
      {
        id: 'h2',
        at: '25 Aug 14:05',
        title: 'Refund completed',
        detail: 'I. Danjuma (Finance) · verified complete',
      },
    ],
    completedAt: '25 Aug 14:05',
    completedBy: 'I. Danjuma (Finance)',
  },
  {
    id: 'REF-3289',
    orderId: 'ORD-87750',
    buyer: 'mum.market',
    createdAt: '22 Aug 11:00',
    status: 'Status uncertain',
    origin: 'Eligible dispute',
    originDetail: 'Provider result not confirmed',
    decisionId: 'DSP-4401',
    itemAmount: 18000,
    buyerProtectionAmount: 900,
    buyerProtectionIncluded: true,
    deliveryAmount: 2000,
    deliveryStatus: 'include',
    totalFinal: 20900,
    totalLabel: '₦20,900',
    needsDeliveryDetermination: false,
    paymentId: 'PMT-6401',
    disputeId: 'DSP-4401',
    orderStatusLabel: 'Disputed',
    whyExists: 'Refund submitted but provider status is unresolved. Retry risks a double refund.',
    linkedRecords: [
      { id: 'DSP-4401', kind: 'dispute', label: 'decision recorded', openLabel: 'Open decision' },
      { id: 'ORD-87750', kind: 'order', label: 'Disputed', openLabel: 'Open order' },
      { id: 'PMT-6401', kind: 'payment', label: 'original payment', openLabel: 'Open payment' },
    ],
    history: [
      {
        id: 'h1',
        at: '22 Aug 11:00',
        title: 'Submitted to provider',
      },
      {
        id: 'h2',
        at: '22 Aug 11:40',
        title: 'No confirmed result',
        detail: 'Status uncertain',
      },
    ],
    failedRetryAvailable: false,
  },
  {
    id: 'REF-3280',
    orderId: 'ORD-87620',
    buyer: 'buyer.x',
    createdAt: '20 Aug 15:22',
    status: 'Failed',
    origin: 'Eligible dispute',
    originDetail: 'Provider confirmed failure',
    decisionId: 'DSP-4390',
    itemAmount: 15000,
    buyerProtectionAmount: 750,
    buyerProtectionIncluded: true,
    deliveryAmount: 2500,
    deliveryStatus: 'exclude',
    totalFinal: 15750,
    totalLabel: '₦15,750',
    needsDeliveryDetermination: false,
    paymentId: 'PMT-6390',
    disputeId: 'DSP-4390',
    orderStatusLabel: 'Completed',
    whyExists: 'Provider confirmed the refund failed. Retry is available; each attempt is recorded separately.',
    linkedRecords: [
      { id: 'DSP-4390', kind: 'dispute', label: 'decision recorded', openLabel: 'Open decision' },
      { id: 'ORD-87620', kind: 'order', label: 'Completed', openLabel: 'Open order' },
      { id: 'PMT-6390', kind: 'payment', label: 'original payment', openLabel: 'Open payment' },
    ],
    history: [
      {
        id: 'h1',
        at: '20 Aug 15:22',
        title: 'Submitted to provider',
      },
      {
        id: 'h2',
        at: '20 Aug 16:01',
        title: 'Provider confirmed the refund failed',
      },
    ],
    failedRetryAvailable: true,
  },
];

export const mockPayouts: MockPayout[] = [
  {
    id: 'PAY-9964',
    seller: 'kemi_curates',
    orderId: 'ORD-88267',
    createdAt: '27 Aug 09:14',
    status: 'Eligible',
    verification: 'Approved',
    saleTotal: 34000,
    commission: 2550,
    fees: 680,
    net: 30770,
    commissionRate: 0.075,
    feeRate: 0.02,
    headerStatus: 'Payout eligible',
    eligibility: [
      { label: 'Order Completed', ok: true },
      { label: '48-hour window satisfied', ok: true },
      { label: 'Payout verification approved', ok: true },
      { label: 'No active dispute', ok: true },
      { label: 'No fraud, security or compliance hold', ok: true },
    ],
    destinationMasked: 'Provider token ···· 8826',
    testReference: 'Test payout reference',
    history: [
      { id: 'h1', at: '27 Aug 09:14', title: 'Payout record created' },
      { id: 'h2', at: '27 Aug 09:16', title: 'Verification confirmed', detail: 'Approved' },
    ],
  },
  {
    id: 'PAY-9960',
    seller: 'ada.thrifts',
    orderId: 'ORD-88240',
    createdAt: '26 Aug 18:02',
    status: 'Eligible',
    verification: 'Approved',
    saleTotal: 16000,
    commission: 0,
    fees: 320,
    net: 15680,
    commissionRate: 0,
    feeRate: 0.02,
    headerStatus: 'Payout eligible',
    promoZeroCommission: true,
    promoSaleOf: 'sale 2 of 3',
    eligibility: [
      { label: 'Order Completed', ok: true },
      { label: '48-hour window satisfied', ok: true },
      { label: 'Payout verification approved', ok: true },
      { label: 'No active dispute', ok: true },
      { label: 'No fraud, security or compliance hold', ok: true },
    ],
    destinationMasked: 'Provider token ···· 4417',
    testReference: 'Test payout reference',
    history: [
      { id: 'h1', at: '26 Aug 18:02', title: 'Payout record created' },
      { id: 'h2', at: '26 Aug 18:03', title: '0% commission promo applied', detail: 'sale 2 of 3' },
    ],
  },
  {
    id: 'PAY-9911',
    seller: 'lagos_luxe',
    orderId: 'ORD-88213',
    createdAt: '24 Aug 15:01',
    status: 'On Hold',
    verification: 'Approved',
    saleTotal: 34000,
    commission: 2550,
    fees: 680,
    net: 30770,
    commissionRate: 0.075,
    feeRate: 0.02,
    headerStatus: 'On Hold',
    holdReason: 'Active dispute — DSP-4471. Placed automatically on dispute open — 25 Aug 16:12.',
    holdSellerFacing: 'Payout on hold — this transaction is currently under review.',
    holdAuto: true,
    disputeId: 'DSP-4471',
    eligibility: [
      { label: 'Order Completed', ok: false },
      { label: '48-hour window satisfied', ok: true },
      { label: 'Payout verification approved', ok: true },
      { label: 'No active dispute', ok: false },
      { label: 'No fraud, security or compliance hold', ok: true },
    ],
    destinationMasked: 'Provider token ···· 2290',
    testReference: 'Test payout reference',
    history: [
      { id: 'h1', at: '24 Aug 15:01', title: 'Payout record created' },
      {
        id: 'h2',
        at: '25 Aug 16:12',
        title: 'Hold placed automatically',
        detail: 'DSP-4471 opened',
      },
    ],
  },
  {
    id: 'PAY-9902',
    seller: 'shade.vintage',
    orderId: 'ORD-88150',
    createdAt: '25 Aug 11:40',
    status: 'Verification required',
    verification: 'Pending',
    saleTotal: 28000,
    commission: 2100,
    fees: 560,
    net: 25340,
    commissionRate: 0.075,
    feeRate: 0.02,
    headerStatus: 'Verification required',
    verificationBlocked: true,
    eligibility: [
      { label: 'Order Completed', ok: true },
      { label: '48-hour window satisfied', ok: true },
      { label: 'Payout verification approved', ok: false },
      { label: 'No active dispute', ok: true },
      { label: 'No fraud, security or compliance hold', ok: true },
    ],
    destinationMasked: 'Provider token ···· 1102',
    testReference: 'Test payout reference',
    history: [
      { id: 'h1', at: '25 Aug 11:40', title: 'Payout record created' },
      { id: 'h2', at: '25 Aug 11:41', title: 'Verification pending', detail: 'Seller documents outstanding' },
    ],
  },
  {
    id: 'PAY-9890',
    seller: 'mum.market',
    orderId: 'ORD-88088',
    createdAt: '26 Aug 08:12',
    status: 'Not yet eligible',
    verification: 'Approved',
    saleTotal: 15000,
    commission: 1125,
    fees: 300,
    net: 13575,
    commissionRate: 0.075,
    feeRate: 0.02,
    headerStatus: 'Not yet eligible',
    notYetEligibleNote:
      'Delivered 25 Aug 12:26 — 48-hour window ends 27 Aug 12:25 unless the buyer confirms sooner. Payment success alone does not make a payout eligible.',
    eligibility: [
      { label: 'Order Completed', ok: false },
      { label: '48-hour window satisfied', ok: false },
      { label: 'Payout verification approved', ok: true },
      { label: 'No active dispute', ok: true },
      { label: 'No fraud, security or compliance hold', ok: true },
    ],
    destinationMasked: 'Provider token ···· 5510',
    testReference: 'Test payout reference',
    history: [{ id: 'h1', at: '26 Aug 08:12', title: 'Payout record created', detail: 'Awaiting completion window' }],
  },
  {
    id: 'PAY-9881',
    seller: 'kemi.closet',
    orderId: 'ORD-87990',
    createdAt: '27 Aug 10:20',
    status: 'Processing',
    verification: 'Approved',
    saleTotal: 42000,
    commission: 3150,
    fees: 840,
    net: 38010,
    commissionRate: 0.075,
    feeRate: 0.02,
    headerStatus: 'Processing',
    processingAt: '28 Aug 10:22',
    processingBy: 'I. Danjuma',
    eligibility: [
      { label: 'Order Completed', ok: true },
      { label: '48-hour window satisfied', ok: true },
      { label: 'Payout verification approved', ok: true },
      { label: 'No active dispute', ok: true },
      { label: 'No fraud, security or compliance hold', ok: true },
    ],
    destinationMasked: 'Provider token ···· 7741',
    testReference: 'Test payout reference',
    history: [
      { id: 'h1', at: '27 Aug 10:20', title: 'Payout record created' },
      {
        id: 'h2',
        at: '28 Aug 10:22',
        title: 'Submitted to provider',
        detail: 'I. Danjuma · awaiting confirmation',
      },
    ],
  },
  {
    id: 'PAY-9870',
    seller: 'style_by_k',
    orderId: 'ORD-87801',
    createdAt: '24 Aug 09:00',
    status: 'Paid out',
    verification: 'Approved',
    saleTotal: 42000,
    commission: 3150,
    fees: 840,
    net: 38010,
    commissionRate: 0.075,
    feeRate: 0.02,
    headerStatus: 'Paid out',
    paidAt: '25 Aug 12:10',
    paidBy: 'I. Danjuma (Finance)',
    eligibility: [
      { label: 'Order Completed', ok: true },
      { label: '48-hour window satisfied', ok: true },
      { label: 'Payout verification approved', ok: true },
      { label: 'No active dispute', ok: true },
      { label: 'No fraud, security or compliance hold', ok: true },
    ],
    destinationMasked: 'Provider token ···· 3308',
    testReference: 'Test payout reference',
    history: [
      { id: 'h1', at: '24 Aug 09:00', title: 'Payout record created' },
      {
        id: 'h2',
        at: '25 Aug 12:10',
        title: 'Paid out',
        detail: 'I. Danjuma · reference recorded · audit entry created',
      },
    ],
  },
  {
    id: 'PAY-9855',
    seller: 'buyer.x',
    orderId: 'ORD-87750',
    createdAt: '23 Aug 16:44',
    status: 'Failed',
    verification: 'Approved',
    saleTotal: 22000,
    commission: 1650,
    fees: 440,
    net: 19910,
    commissionRate: 0.075,
    feeRate: 0.02,
    headerStatus: 'Failed',
    failedRetryAvailable: false,
    eligibility: [
      { label: 'Order Completed', ok: true },
      { label: '48-hour window satisfied', ok: true },
      { label: 'Payout verification approved', ok: true },
      { label: 'No active dispute', ok: true },
      { label: 'No fraud, security or compliance hold', ok: true },
    ],
    destinationMasked: 'Provider token ···· 9912',
    testReference: 'Test payout reference',
    history: [
      { id: 'h1', at: '23 Aug 16:44', title: 'Payout record created' },
      { id: 'h2', at: '24 Aug 09:12', title: 'Submitted to provider' },
      { id: 'h3', at: '24 Aug 09:40', title: 'Payout failed at provider', detail: 'Not confirmed' },
    ],
  },
  {
    id: 'PAY-9840',
    seller: 'ada.thrifts',
    orderId: 'ORD-87620',
    createdAt: '22 Aug 14:10',
    status: 'On Hold',
    verification: 'Approved',
    saleTotal: 48000,
    commission: 3600,
    fees: 960,
    net: 43440,
    commissionRate: 0.075,
    feeRate: 0.02,
    headerStatus: 'On Hold',
    holdReason: 'Compliance review — manual hold by Trust & Safety.',
    holdSellerFacing: 'Payout on hold — this transaction is currently under review.',
    disputeId: 'DSP-4401',
    eligibility: [
      { label: 'Order Completed', ok: true },
      { label: '48-hour window satisfied', ok: true },
      { label: 'Payout verification approved', ok: true },
      { label: 'No active dispute', ok: false },
      { label: 'No fraud, security or compliance hold', ok: false },
    ],
    destinationMasked: 'Provider token ···· 2201',
    testReference: 'Test payout reference',
    recordStale: {
      by: 'F. Adeyemi (Trust & Safety)',
      action: 'Hold placed while you were reviewing',
      at: '10:19',
    },
    history: [
      { id: 'h1', at: '22 Aug 14:10', title: 'Payout record created' },
      { id: 'h2', at: '23 Aug 10:19', title: 'Hold placed', detail: 'F. Adeyemi · Trust & Safety' },
    ],
  },
];

export const mockReviews: MockReview[] = [
  {
    id: 'REV-7742',
    orderId: 'ORD-88044',
    seller: 'lagos_luxe',
    buyer: 'ada_e',
    rating: 1,
    comment:
      'Item arrived nothing like the photos and the seller ignored me. Call 0803 441 2290 if she does this to you too.',
    commentSummary: 'Written comment reported for a policy concern',
    status: 'Under review',
    flagged: true,
    reported: true,
    hasComment: true,
    eligibilityAnomaly: false,
    duplicateAnomaly: false,
    submittedAt: '24 Aug 19:12',
    headerMeta: 'Reported for a policy concern · submitted 24 Aug 19:12',
    aiSummary:
      'The review contains a personal accusation and a phone number. Eligibility checks pass: Completed order, buyer is the reviewer, one review only. Recommended: Trust & Safety review of the comment only. The 1-star rating is the buyer’s opinion and is not a policy matter.',
    aiNextStep:
      'Trust & Safety review of the comment only. The 1-star rating is the buyer’s opinion and is not a policy matter.',
    eligibility: [
      { label: 'Order ORD-88044 is Completed', ok: true },
      { label: 'Reviewer @ada_e is the buyer on that transaction', ok: true },
      { label: 'One review only for this transaction', ok: true },
    ],
    linkedRecords: [
      { id: 'RPT-2207', kind: 'report', label: 'review reported', openLabel: 'Open report' },
      { id: 'ORD-88044', kind: 'order', label: 'Completed', openLabel: 'Open order' },
      { id: '@lagos_luxe', kind: 'user', label: 'seller account', openLabel: 'Open user' },
    ],
    sellerAvg: 4.6,
    sellerReviewCount: 38,
    sellerRatingNote:
      'Seller average is calculated automatically from visible ratings. Admins cannot edit star ratings or recompute averages manually. This 1★ is included while the comment is under review.',
    history: [
      {
        id: 'h1',
        at: '25 Aug 08:02',
        title: 'Review reported',
        detail: 'routed from Reports',
      },
    ],
    createdAt: '2026-08-24',
  },
  {
    id: 'REV-7738',
    orderId: 'ORD-87990',
    seller: 'kemi.closet',
    buyer: 'buyer.x',
    rating: 5,
    comment: '',
    commentSummary: 'No written comment',
    status: 'Valid',
    flagged: false,
    reported: false,
    hasComment: false,
    eligibilityAnomaly: false,
    duplicateAnomaly: false,
    submittedAt: '26 Aug 07:50',
    headerMeta: 'Stars only · submitted 26 Aug 07:50',
    aiSummary: 'Rating-only review. Eligibility sound. No comment to moderate.',
    eligibility: [
      { label: 'Order ORD-87990 is Completed', ok: true },
      { label: 'Reviewer @buyer.x is the buyer on that transaction', ok: true },
      { label: 'One review only for this transaction', ok: true },
    ],
    linkedRecords: [
      { id: 'ORD-87990', kind: 'order', label: 'Completed', openLabel: 'Open order' },
      { id: '@kemi.closet', kind: 'user', label: 'seller account', openLabel: 'Open user' },
    ],
    sellerAvg: 4.8,
    sellerReviewCount: 22,
    sellerRatingNote: 'This 5★ rating is counted in the seller average. No comment to hide.',
    history: [{ id: 'h1', at: '26 Aug 07:50', title: 'Review submitted', detail: 'stars only' }],
    createdAt: '2026-08-26',
  },
  {
    id: 'REV-7731',
    orderId: 'ORD-87801',
    seller: 'shade.vintage',
    buyer: 'tunde.buys',
    rating: 2,
    comment: 'Never again.',
    commentSummary: 'Reviewer does not match the transaction buyer',
    status: 'Eligibility anomaly',
    flagged: true,
    reported: false,
    hasComment: true,
    eligibilityAnomaly: true,
    duplicateAnomaly: false,
    submittedAt: '20 Aug 11:04',
    headerMeta: 'Eligibility anomaly · submitted 20 Aug 11:04',
    aiSummary:
      'Reviewer handle does not match the Completed transaction buyer. Do not treat as a valid marketplace review until eligibility is resolved.',
    aiNextStep: 'investigate identity mismatch before any hide or clear action',
    eligibility: [
      { label: 'Order ORD-87801 is Completed', ok: true },
      { label: 'Reviewer @tunde.buys is the buyer on that transaction', ok: false },
      { label: 'One review only for this transaction', ok: true },
    ],
    linkedRecords: [
      { id: 'ORD-87801', kind: 'order', label: 'Completed', openLabel: 'Open order' },
      { id: '@shade.vintage', kind: 'user', label: 'seller account', openLabel: 'Open user' },
      { id: '@tunde.buys', kind: 'user', label: 'claimed reviewer', openLabel: 'Open user' },
    ],
    sellerAvg: 3.9,
    sellerReviewCount: 14,
    sellerRatingNote:
      'Because eligibility failed, this rating should not be trusted in the seller average until the anomaly is cleared.',
    history: [
      { id: 'h1', at: '20 Aug 11:05', title: 'Eligibility check failed', detail: 'buyer mismatch' },
    ],
    createdAt: '2026-08-20',
  },
  {
    id: 'REV-7724',
    orderId: 'ORD-88150',
    seller: 'ada.thrifts',
    buyer: 'tunde.buys',
    rating: 4,
    comment: 'Nice piece, packing was messy.',
    commentSummary: 'Second review submitted for the same transaction',
    status: 'Duplicate anomaly',
    flagged: true,
    reported: false,
    hasComment: true,
    eligibilityAnomaly: false,
    duplicateAnomaly: true,
    submittedAt: '27 Aug 09:18',
    headerMeta: 'Duplicate anomaly · submitted 27 Aug 09:18',
    aiSummary:
      'A second review was submitted for ORD-88150. Policy is one review per Completed transaction. Keep the first valid review; this duplicate needs human confirmation.',
    aiNextStep: 'confirm which review is the original and suppress the duplicate comment if needed',
    eligibility: [
      { label: 'Order ORD-88150 is Completed', ok: true },
      { label: 'Reviewer @tunde.buys is the buyer on that transaction', ok: true },
      { label: 'One review only for this transaction', ok: false },
    ],
    linkedRecords: [
      { id: 'REV-7719', kind: 'order', label: 'earlier review on same order', openLabel: 'Open order' },
      { id: 'ORD-88150', kind: 'order', label: 'Completed', openLabel: 'Open order' },
      { id: '@ada.thrifts', kind: 'user', label: 'seller account', openLabel: 'Open user' },
    ],
    sellerAvg: 4.7,
    sellerReviewCount: 51,
    sellerRatingNote:
      'Duplicate ratings must not double-count. Confirm before this 4★ affects the average.',
    history: [
      { id: 'h1', at: '27 Aug 09:18', title: 'Duplicate review detected', detail: 'same order as REV-7719' },
    ],
    createdAt: '2026-08-27',
  },
  {
    id: 'REV-7719',
    orderId: 'ORD-88150',
    seller: 'ada.thrifts',
    buyer: 'tunde.buys',
    rating: 5,
    comment: 'Great jacket, as pictured.',
    commentSummary: 'Written comment',
    status: 'Valid',
    flagged: false,
    reported: false,
    hasComment: true,
    eligibilityAnomaly: false,
    duplicateAnomaly: false,
    submittedAt: '26 Aug 18:40',
    headerMeta: 'Valid written comment · submitted 26 Aug 18:40',
    aiSummary: 'Clean product feedback. Eligibility sound.',
    eligibility: [
      { label: 'Order ORD-88150 is Completed', ok: true },
      { label: 'Reviewer @tunde.buys is the buyer on that transaction', ok: true },
      { label: 'One review only for this transaction', ok: true },
    ],
    linkedRecords: [
      { id: 'ORD-88150', kind: 'order', label: 'Completed', openLabel: 'Open order' },
      { id: '@ada.thrifts', kind: 'user', label: 'seller account', openLabel: 'Open user' },
    ],
    sellerAvg: 4.7,
    sellerReviewCount: 51,
    sellerRatingNote: 'This 5★ is counted in the seller average.',
    history: [{ id: 'h1', at: '26 Aug 18:40', title: 'Review submitted' }],
    createdAt: '2026-08-26',
  },
  {
    id: 'REV-7702',
    orderId: 'ORD-87500',
    seller: 'mum.market',
    buyer: 'ada.thrifts',
    rating: 1,
    comment: '[comment hidden after human review]',
    commentSummary: 'Written comment hidden after human review — rating retained and counted',
    status: 'Hidden',
    flagged: false,
    reported: true,
    hasComment: true,
    eligibilityAnomaly: false,
    duplicateAnomaly: false,
    submittedAt: '18 Aug 14:22',
    headerMeta: 'Comment hidden · submitted 18 Aug 14:22',
    aiSummary:
      'Comment previously hid for harassment. The 1★ rating remains and still counts toward the seller average.',
    eligibility: [
      { label: 'Order ORD-87500 is Completed', ok: true },
      { label: 'Reviewer @ada.thrifts is the buyer on that transaction', ok: true },
      { label: 'One review only for this transaction', ok: true },
    ],
    linkedRecords: [
      { id: 'RPT-2188', kind: 'report', label: 'review reported', openLabel: 'Open report' },
      { id: 'ORD-87500', kind: 'order', label: 'Completed', openLabel: 'Open order' },
      { id: '@mum.market', kind: 'user', label: 'seller account', openLabel: 'Open user' },
    ],
    sellerAvg: 4.2,
    sellerReviewCount: 19,
    sellerRatingNote:
      'Hidden comments are not shown publicly. The star rating is retained and counted in the seller average.',
    history: [
      { id: 'h1', at: '18 Aug 14:22', title: 'Review submitted' },
      { id: 'h2', at: '19 Aug 10:11', title: 'Comment hidden', detail: 'O. Bello · Trust & Safety' },
    ],
    createdAt: '2026-08-18',
  },
  {
    id: 'REV-7690',
    orderId: 'ORD-88240',
    seller: 'ada.thrifts',
    buyer: 'mum.market',
    rating: 3,
    comment: 'Dress was fine but sizing ran small.',
    commentSummary: 'Written comment',
    status: 'Valid',
    flagged: false,
    reported: false,
    hasComment: true,
    eligibilityAnomaly: false,
    duplicateAnomaly: false,
    submittedAt: '22 Aug 16:05',
    headerMeta: 'Valid · submitted 22 Aug 16:05',
    aiSummary: 'Ordinary product feedback. No policy signal.',
    eligibility: [
      { label: 'Order ORD-88240 is Completed', ok: true },
      { label: 'Reviewer @mum.market is the buyer on that transaction', ok: true },
      { label: 'One review only for this transaction', ok: true },
    ],
    linkedRecords: [
      { id: 'ORD-88240', kind: 'order', label: 'Completed', openLabel: 'Open order' },
      { id: '@ada.thrifts', kind: 'user', label: 'seller account', openLabel: 'Open user' },
    ],
    sellerAvg: 4.7,
    sellerReviewCount: 51,
    sellerRatingNote: 'This 3★ is counted in the seller average.',
    history: [{ id: 'h1', at: '22 Aug 16:05', title: 'Review submitted' }],
    createdAt: '2026-08-22',
  },
];

export const mockAudit: MockAudit[] = [
  {
    id: 'AUD-118204',
    at: '27 Aug 09:41',
    atFull: '27 Aug 2026 · 09:41:12 WAT',
    actor: 'M. Okafor',
    role: 'Super Admin',
    module: 'Users',
    action: 'Permanent ban executed',
    recordId: '@resell_bot',
    recordSub: 'USR-8841',
    result: 'Completed',
    sensitivity: 'High',
    hasAi: true,
    previousState: 'Suspended',
    resultingState: 'Permanently banned',
    reason: 'Repeated counterfeit listings after warning · 4 upheld reports.',
    confirmation: {
      recommendedBy: 'O. Bello · Trust & Safety',
      steps: 'Two-step confirm · reason recorded',
      aiAssisted: true,
    },
    relatedEvents: [
      { id: 'AUD-118190', label: 'Ban recommended', openLabel: 'Open event' },
      { id: 'AUD-118112', label: 'Account suspended', openLabel: 'Open event' },
      { id: 'USR-8841', label: 'User record', openLabel: 'Open user' },
    ],
    affectedRecordPath: '/users',
    affectedRecordLabel: 'Open affected record',
    aiSummary:
      'Account moved warning → suspension → permanent ban after four upheld counterfeit reports. Sequence is consistent. A denied refund attempt on a linked order may still need human review — it is logged separately and did not alter this ban.',
    visibility: {
      super_admin: 'full',
      trust_safety: 'full',
    },
  },
  {
    id: 'AUD-118188',
    at: '27 Aug 08:12',
    atFull: '27 Aug 2026 · 08:12:44 WAT',
    actor: 'F. Adeyemi',
    role: 'Trust & Safety',
    module: 'Live',
    action: 'Session ended for platform safety',
    recordId: 'LIV-0331',
    recordSub: '@night.market',
    result: 'Completed',
    sensitivity: 'High',
    hasAi: true,
    previousState: 'Live',
    resultingState: 'Ended · host revoked',
    reason: 'Repeated unsafe behaviour during broadcast · viewers at risk.',
    confirmation: {
      recommendedBy: 'System signal · Trust & Safety queue',
      steps: 'Confirm end Live · reason recorded',
      aiAssisted: true,
    },
    relatedEvents: [
      { id: 'AUD-118170', label: 'Host warned in-session', openLabel: 'Open event' },
      { id: 'LIV-0331', label: 'Live session', openLabel: 'Open Live' },
    ],
    affectedRecordPath: '/live',
    affectedRecordLabel: 'Open affected record',
    aiSummary:
      'Forced end and host revoke follow prior unsafe signals on this session. Audit trail is complete. No orders or payments were changed by ending Live.',
    visibility: {
      super_admin: 'full',
      trust_safety: 'full',
    },
  },
  {
    id: 'AUD-118176',
    at: '26 Aug 17:05',
    atFull: '26 Aug 2026 · 17:05:09 WAT',
    actor: 'A. Nwosu',
    role: 'Customer Support',
    module: 'Refunds',
    action: 'Refund execution attempt blocked',
    recordId: 'REF-3312',
    result: 'Denied',
    sensitivity: 'Access',
    hasAi: false,
    previousState: 'Awaiting Finance',
    resultingState: 'Unchanged · attempt denied',
    reason: 'Role not permitted to execute refunds.',
    deniedBanner: {
      title: 'Refund execution attempt denied',
      body: 'Role not permitted. Recorded with actor, role, target and result — no financial effect.',
    },
    relatedEvents: [
      { id: 'REF-3312', label: 'Refund record', openLabel: 'Open refund' },
    ],
    affectedRecordPath: '/refunds',
    affectedRecordLabel: 'Open affected record',
    visibility: {
      super_admin: 'full',
      finance: 'full',
      support: 'full',
    },
  },
  {
    id: 'AUD-118160',
    at: '26 Aug 14:22',
    atFull: '26 Aug 2026 · 14:22:31 WAT',
    actor: 'M. Okafor',
    role: 'Super Admin',
    module: 'Access',
    action: 'Admin access revoked',
    recordId: 'ADM-044',
    recordSub: 'former Support seat',
    result: 'Completed',
    sensitivity: 'High',
    hasAi: false,
    previousState: 'Active · Customer Support',
    resultingState: 'Access revoked',
    reason: 'Offboarding · seat no longer required.',
    confirmation: {
      steps: 'Confirm revoke · reason recorded',
    },
    relatedEvents: [{ id: 'ADM-044', label: 'Admin seat', openLabel: 'Open event' }],
    affectedRecordPath: null,
    recordUnavailable: true,
    affectedRecordLabel: 'Open affected record',
    visibility: {
      super_admin: 'full',
    },
  },
  {
    id: 'AUD-118142',
    at: '25 Aug 14:05',
    atFull: '25 Aug 2026 · 14:05:18 WAT',
    actor: 'I. Danjuma',
    role: 'Finance',
    module: 'Refunds',
    action: 'Refund executed',
    recordId: 'REF-3298',
    recordSub: '@tola.a',
    result: 'Completed',
    sensitivity: 'High',
    hasAi: false,
    previousState: 'Ready to execute',
    resultingState: 'Completed',
    reason: 'Valid cancellation · components reviewed · provider confirmed.',
    confirmation: {
      steps: 'Review checkbox · confirm execute',
    },
    relatedEvents: [
      { id: 'REF-3298', label: 'Refund', openLabel: 'Open refund' },
      { id: 'PMT-5502', label: 'Original payment', openLabel: 'Open payment' },
    ],
    affectedRecordPath: '/refunds',
    affectedRecordLabel: 'Open affected record',
    visibility: {
      super_admin: 'full',
      finance: 'full',
      trust_safety: 'status_only',
    },
  },
  {
    id: 'AUD-118130',
    at: '25 Aug 11:40',
    atFull: '25 Aug 2026 · 11:40:02 WAT',
    actor: 'I. Danjuma',
    role: 'Finance',
    module: 'Payouts',
    action: 'Payout processed',
    recordId: 'PAY-9964',
    recordSub: '@lagos_luxe',
    result: 'Completed',
    sensitivity: 'High',
    hasAi: false,
    previousState: 'Eligible',
    resultingState: 'Paid out',
    reason: 'Verification approved · net payout confirmed.',
    relatedEvents: [
      { id: 'PAY-9964', label: 'Payout', openLabel: 'Open payout' },
    ],
    affectedRecordPath: '/payouts',
    affectedRecordLabel: 'Open affected record',
    visibility: {
      super_admin: 'full',
      finance: 'full',
      trust_safety: 'status_only',
    },
  },
  {
    id: 'AUD-118118',
    at: '24 Aug 16:50',
    atFull: '24 Aug 2026 · 16:50:41 WAT',
    actor: 'O. Bello',
    role: 'Trust & Safety',
    module: 'Disputes',
    action: 'Dispute outcome recorded',
    recordId: 'DSP-4471',
    recordSub: 'Refund buyer',
    result: 'Completed',
    sensitivity: 'Medium',
    hasAi: true,
    previousState: 'Under review',
    resultingState: 'Buyer win · refund pending Finance',
    reason: 'Evidence supports never-arrived claim · seller did not rebut.',
    confirmation: {
      recommendedBy: 'AI case summary · human decision',
      aiAssisted: true,
      steps: 'Decision reason recorded',
    },
    relatedEvents: [
      { id: 'DSP-4471', label: 'Dispute', openLabel: 'Open dispute' },
      { id: 'REF-3320', label: 'Refund created', openLabel: 'Open refund' },
    ],
    affectedRecordPath: '/disputes',
    affectedRecordLabel: 'Open affected record',
    aiSummary:
      'Buyer-win decision follows incomplete seller response. Refund was created for Finance; this event does not execute money movement.',
    visibility: {
      super_admin: 'full',
      trust_safety: 'full',
      finance: 'outcome_only',
      support: 'status_only',
    },
  },
  {
    id: 'AUD-118100',
    at: '24 Aug 11:02',
    atFull: '24 Aug 2026 · 11:02:15 WAT',
    actor: 'A. Nwosu',
    role: 'Customer Support',
    module: 'Orders',
    action: 'Internal note added',
    recordId: 'ORD-88213',
    result: 'Completed',
    sensitivity: 'Standard',
    hasAi: false,
    reason: 'Buyer asked for delivery ETA · escalated to seller follow-up.',
    relatedEvents: [{ id: 'ORD-88213', label: 'Order', openLabel: 'Open order' }],
    affectedRecordPath: '/orders',
    affectedRecordLabel: 'Open affected record',
    visibility: {
      super_admin: 'full',
      support: 'full',
      trust_safety: 'status_only',
    },
  },
  {
    id: 'AUD-118088',
    at: '23 Aug 15:18',
    atFull: '23 Aug 2026 · 15:18:07 WAT',
    actor: 'O. Bello',
    role: 'Trust & Safety',
    module: 'Listings',
    action: 'Listing hidden',
    recordId: 'LST-52100',
    recordSub: 'Counterfeit cluster',
    result: 'Completed',
    sensitivity: 'Medium',
    hasAi: true,
    previousState: 'Active',
    resultingState: 'Hidden',
    reason: 'Counterfeit cluster signal · irreversible until restore.',
    confirmation: { aiAssisted: true, steps: 'Confirm hide · reason recorded' },
    relatedEvents: [{ id: 'LST-52100', label: 'Listing', openLabel: 'Open listing' }],
    affectedRecordPath: '/listings',
    affectedRecordLabel: 'Open affected record',
    aiSummary: 'Hide aligns with linked reports on the same seller cluster. Restore remains a separate human action.',
    visibility: {
      super_admin: 'full',
      trust_safety: 'full',
    },
  },
  {
    id: 'AUD-118070',
    at: '22 Aug 10:44',
    atFull: '22 Aug 2026 · 10:44:55 WAT',
    actor: 'System',
    role: 'System',
    module: 'Payouts',
    action: 'Payout placed on hold',
    recordId: 'PAY-9948',
    recordSub: 'Auto · dispute link',
    result: 'Completed',
    sensitivity: 'Medium',
    hasAi: false,
    previousState: 'Eligible',
    resultingState: 'On Hold',
    reason: 'Auto-hold when DSP-4483 opened against linked order.',
    relatedEvents: [
      { id: 'PAY-9948', label: 'Payout', openLabel: 'Open payout' },
      { id: 'DSP-4483', label: 'Dispute', openLabel: 'Open dispute' },
    ],
    affectedRecordPath: '/payouts',
    affectedRecordLabel: 'Open affected record',
    visibility: {
      super_admin: 'full',
      finance: 'full',
      trust_safety: 'status_only',
    },
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
  orders: 11,
  payments: 6,
  refunds: 4,
  payouts: 9,
};

export function formatNaira(amount: number) {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}
