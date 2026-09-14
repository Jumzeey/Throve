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
