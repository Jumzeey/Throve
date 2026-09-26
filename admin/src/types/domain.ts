/** Admin domain DTO shapes shared by API clients and pages. */

export type AdminUser = {
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
  banRecommendation?: { by: string; role: string; reason: string; at: string };
  recordStale?: { by: string; action: string; at: string };
  actionAlreadyApplied?: { action: string; by: string; at: string };
};

export type AdminListing = {
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

export type AdminReport = {
  id: string;
  route: 'User' | 'Listing' | 'Live' | 'Live comment';
  reason: string;
  target: string;
  reporter: string;
  status: 'New' | 'Under review' | 'Escalated' | 'Action taken' | 'Closed';
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

export type AdminLive = {
  id: string;
  host: string;
  title: string;
  status: 'Live' | 'Upcoming' | 'Ended' | 'Incident';
  viewers: number;
  reports: number;
  startedAt: string;
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

export type AdminOrderFlag = 'dispute' | 'hold' | 'cancellable' | 'payout' | 'refund' | 'verify';

export type AdminOrder = {
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
  flags: AdminOrderFlag[];
  needsAssistance: boolean;
  completionPaused?: boolean;
  cancellableBy?: string;
  aiSummary: string;
  aiNextStep?: string;
  linkedRecords: {
    id: string;
    kind: 'dispute' | 'payment' | 'payout' | 'refund' | 'listing';
    label: string;
    financeOnly?: boolean;
  }[];
  recordStale?: { by: string; action: string; at: string };
  timeline: { id: string; at: string; title: string; detail?: string; tone?: 'default' | 'warn' | 'danger' | 'ok' }[];
};

export type AdminDispute = {
  id: string;
  orderId: string;
  listingId?: string;
  paymentId?: string;
  reason: string;
  status: 'Open' | 'With T&S' | 'Approved for refund' | 'Denied' | 'Closed';
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
  unassigned?: boolean;
  evidenceBlockReason?: string;
  awaitingBuyerSince?: string;
  recordStale?: { by: string; action: string; at: string };
  actionAlreadyApplied?: { action: string; by: string; at: string };
  decidedBy?: string;
  decidedAt?: string;
};

export type AdminPayment = {
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

export type AdminRefund = {
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

export type AdminPayout = {
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

export type AdminReview = {
  id: string;
  orderId: string;
  seller: string;
  buyer: string;
  rating: number;
  comment: string;
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

export type AdminAudit = {
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
  visibility: Partial<
    Record<'super_admin' | 'trust_safety' | 'support' | 'finance', 'full' | 'outcome_only' | 'status_only'>
  >;
};

export type AdminOpsCase = {
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
