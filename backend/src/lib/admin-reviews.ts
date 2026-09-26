import { createServiceClient } from './supabase.js';

export type ReviewUiStatus =
  | 'Under review'
  | 'Valid'
  | 'Eligibility anomaly'
  | 'Duplicate anomaly'
  | 'Hidden';

export type ReviewQueue = 'flagged' | 'all' | 'reported' | 'eligibility' | 'with_comment';

export type ReviewEventAction = 'note' | 'escalated' | 'comment_hidden' | 'received';

export type ReviewRow = {
  id: string;
  seller_id: string;
  buyer_id: string;
  order_id: string | null;
  rating: number;
  comment: string;
  created_at: string;
  comment_hidden: boolean;
  hidden_at: string | null;
  hidden_by: string | null;
  escalated_at: string | null;
};

export type AdminReviewDto = {
  id: string;
  orderId: string;
  seller: string;
  buyer: string;
  rating: number;
  comment: string;
  commentSummary: string;
  status: ReviewUiStatus;
  flagged: boolean;
  reported: boolean;
  hasComment: boolean;
  eligibilityAnomaly: boolean;
  duplicateAnomaly: boolean;
  submittedAt: string;
  headerMeta: string;
  aiSummary: string;
  aiNextStep?: string;
  aiUnavailable?: boolean;
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

export type EligibilityContext = {
  orderStatus: string | null;
  orderBuyerId: string | null;
  reviewsForOrder: number;
};

export function formatAt(iso: string) {
  return iso.slice(0, 16).replace('T', ' ');
}

export function openLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ');
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildEligibility(row: ReviewRow, ctx: EligibilityContext) {
  const orderId = row.order_id ?? '—';
  const orderOk = Boolean(row.order_id && ctx.orderStatus === 'completed');
  const buyerOk = Boolean(
    row.order_id && ctx.orderBuyerId && ctx.orderBuyerId === row.buyer_id,
  );
  const oneOk = !row.order_id || ctx.reviewsForOrder <= 1;

  return [
    {
      label: row.order_id
        ? `Order ${orderId} is Completed`
        : 'Linked to a Completed order',
      ok: orderOk,
    },
    {
      label: 'Reviewer is the buyer on that transaction',
      ok: buyerOk,
    },
    {
      label: 'One review only for this transaction',
      ok: oneOk,
    },
  ];
}

export function deriveStatus(
  row: ReviewRow,
  eligibility: { ok: boolean }[],
): {
  status: ReviewUiStatus;
  eligibilityAnomaly: boolean;
  duplicateAnomaly: boolean;
  flagged: boolean;
  reported: boolean;
} {
  if (row.comment_hidden) {
    return {
      status: 'Hidden',
      eligibilityAnomaly: false,
      duplicateAnomaly: false,
      flagged: true,
      reported: Boolean(row.escalated_at),
    };
  }

  const orderOk = eligibility[0]?.ok ?? false;
  const buyerOk = eligibility[1]?.ok ?? false;
  const oneOk = eligibility[2]?.ok ?? true;
  const eligibilityAnomaly = !orderOk || !buyerOk;
  const duplicateAnomaly = !oneOk;

  if (eligibilityAnomaly) {
    return {
      status: 'Eligibility anomaly',
      eligibilityAnomaly: true,
      duplicateAnomaly,
      flagged: true,
      reported: Boolean(row.escalated_at),
    };
  }
  if (duplicateAnomaly) {
    return {
      status: 'Duplicate anomaly',
      eligibilityAnomaly: false,
      duplicateAnomaly: true,
      flagged: true,
      reported: Boolean(row.escalated_at),
    };
  }
  if (row.escalated_at) {
    return {
      status: 'Under review',
      eligibilityAnomaly: false,
      duplicateAnomaly: false,
      flagged: true,
      reported: true,
    };
  }
  return {
    status: 'Valid',
    eligibilityAnomaly: false,
    duplicateAnomaly: false,
    flagged: false,
    reported: false,
  };
}

export function matchesQueue(
  dto: Pick<
    AdminReviewDto,
    | 'status'
    | 'flagged'
    | 'reported'
    | 'hasComment'
    | 'eligibilityAnomaly'
    | 'duplicateAnomaly'
  >,
  queue: ReviewQueue,
): boolean {
  if (queue === 'all') return true;
  if (queue === 'flagged') {
    return (
      dto.flagged ||
      dto.status === 'Under review' ||
      dto.status === 'Eligibility anomaly' ||
      dto.status === 'Duplicate anomaly' ||
      dto.status === 'Hidden'
    );
  }
  if (queue === 'reported') return dto.reported;
  if (queue === 'eligibility') return dto.eligibilityAnomaly || dto.duplicateAnomaly;
  if (queue === 'with_comment') return dto.hasComment;
  return true;
}

export function commentSummary(row: ReviewRow): string {
  if (row.comment_hidden) return 'Comment hidden after human review';
  const text = String(row.comment ?? '').trim();
  if (!text) return 'No written comment';
  return text.length > 72 ? `${text.slice(0, 72)}…` : text;
}

export async function recordReviewEvent(
  reviewId: string,
  actorId: string | null,
  action: ReviewEventAction,
  reason?: string | null,
  meta?: Record<string, unknown>,
) {
  const service = createServiceClient();
  const { error } = await service.from('review_events').insert({
    review_id: reviewId,
    actor_id: actorId,
    action,
    reason: reason ?? null,
    meta: meta ?? {},
  });
  if (error) console.warn('[admin/reviews] event write failed', error.message);
}

export async function loadReviewEvents(reviewId: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from('review_events')
    .select('id, action, reason, created_at, actor_id')
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

const EVENT_TITLES: Record<ReviewEventAction, string> = {
  note: 'Internal note added',
  escalated: 'Escalated for review',
  comment_hidden: 'Comment hidden',
  received: 'Review received',
};

export function mapEventsToHistory(
  events: {
    id: string;
    action: string;
    reason: string | null;
    created_at: string;
    actor_id: string | null;
  }[],
  actorNames: Map<string, string>,
  createdAt: string,
) {
  const history = events.map((row) => {
    const action = row.action as ReviewEventAction;
    const by = row.actor_id ? actorNames.get(String(row.actor_id)) : null;
    const detail = [by ? `@${by}` : null, row.reason ? String(row.reason) : null]
      .filter(Boolean)
      .join(' · ');
    return {
      id: String(row.id),
      at: formatAt(String(row.created_at)),
      title: EVENT_TITLES[action] ?? String(row.action),
      detail: detail || undefined,
    };
  });

  if (!events.some((e) => e.action === 'received')) {
    history.unshift({
      id: `received-${createdAt}`,
      at: formatAt(createdAt),
      title: 'Review received',
      detail: undefined,
    });
  }

  return history.reverse();
}
