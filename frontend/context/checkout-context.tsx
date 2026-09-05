import { apiFetch } from '@/lib/api';
import type { CheckoutDraft, DeliveryMethod, Order, OrderStatus, Review } from '@/data/types';
import { useAuth } from '@/context/auth-context';
import { CHECKOUT_RESERVE_MS, useLive } from '@/context/live-context';
import type { Href } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type CheckoutContextValue = {
  draft: CheckoutDraft | null;
  lastOrder: Order | null;
  orders: Order[];
  loading: boolean;
  now: number;
  remaining: number;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  startCheckout: (input: {
    listingId: string;
    buyer: string;
    liveSessionId?: string | null;
    liveStreamProductId?: string | null;
    claimId?: string | null;
  }) => Promise<boolean>;
  updateDraft: (patch: Partial<Pick<CheckoutDraft, 'name' | 'address' | 'city' | 'phone' | 'deliveryMethod'>>) => void;
  cancelCheckout: () => Promise<string | null>;
  completePayment: () => Promise<Order | null>;
  getOrder: (id: string) => Order | undefined;
  markDispatched: (id: string, username: string) => Promise<boolean>;
  confirmReceived: (id: string, username: string) => Promise<boolean>;
  cancelOrder: (id: string, username: string, reason: string) => Promise<boolean>;
  submitReview: (id: string, username: string, rating: number, comment: string) => Promise<boolean>;
  getReviews: (username: string) => Review[];
  ratingInfo: (username: string) => { avg: number; count: number };
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const { session, isReady } = useAuth();
  const live = useLive();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const data = await apiFetch<Order[]>('/checkout/orders');
      setOrders(data);
    } catch {
      // Backend offline — orders screens handle empty/offline UI
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!session) {
      setOrders([]);
      setLoading(false);
      return;
    }
    void refresh();
  }, [isReady, session?.userId, refresh]);

  useEffect(() => {
    if (!draft) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [draft]);

  const remaining = useMemo(() => {
    if (!draft) return 0;
    if (draft.liveSessionId) {
      const claim = live.getClaim(draft.liveSessionId);
      return claim ? claim.expiresAt - now : draft.expiresAt - now;
    }
    return draft.expiresAt - now;
  }, [draft, live, now]);

  const startCheckout = useCallback(
    async (input: {
      listingId: string;
      buyer: string;
      liveSessionId?: string | null;
      liveStreamProductId?: string | null;
      claimId?: string | null;
    }) => {
      try {
        const started = await apiFetch<CheckoutDraft>('/checkout/start', {
          method: 'POST',
          body: JSON.stringify({
            listingId: input.listingId,
            liveSessionId: input.liveSessionId ?? null,
            liveStreamProductId: input.liveStreamProductId ?? null,
            claimId: input.claimId ?? null,
          }),
        });
        setDraft({
          listingId: started.listingId,
          liveSessionId: started.liveSessionId ?? null,
          liveStreamProductId: started.liveStreamProductId ?? input.liveStreamProductId ?? null,
          claimId: started.claimId ?? input.claimId ?? null,
          itemPrice: started.itemPrice,
          buyer: started.buyer,
          name: '',
          address: '',
          city: '',
          phone: '',
          deliveryMethod: 'Standard',
          expiresAt: started.expiresAt ?? Date.now() + CHECKOUT_RESERVE_MS,
        });
        setNow(Date.now());
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const updateDraft = useCallback((patch: Partial<Pick<CheckoutDraft, 'name' | 'address' | 'city' | 'phone' | 'deliveryMethod'>>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const cancelCheckout = useCallback(async () => {
    const liveId = draft?.liveSessionId ?? null;
    if (draft?.claimId && draft.liveStreamProductId && draft.liveSessionId) {
      try {
        await live.releaseClaim(draft.liveSessionId, draft.liveStreamProductId, draft.claimId);
      } catch {
        /* ignore */
      }
    } else if (draft) {
      await live.releaseListing(draft.listingId);
    }
    setDraft(null);
    return liveId;
  }, [draft, live]);

  const completePayment = useCallback(async () => {
    if (!draft) return null;
    const order = await apiFetch<Order>('/checkout/complete', {
      method: 'POST',
      body: JSON.stringify({
        listingId: draft.listingId,
        liveSessionId: draft.liveSessionId,
        liveStreamProductId: draft.liveStreamProductId,
        claimId: draft.claimId,
        name: draft.name,
        address: draft.address,
        city: draft.city,
        phone: draft.phone,
        deliveryMethod: draft.deliveryMethod,
      }),
    });
    await live.completeSale(draft.listingId);
    setLastOrder(order);
    setOrders((current) => [order, ...current]);
    setDraft(null);
    return order;
  }, [draft, live]);

  const getOrder = useCallback(
    (id: string) => orders.find((item) => item.id === id) ?? (lastOrder?.id === id ? lastOrder : undefined),
    [lastOrder, orders],
  );

  const markDispatched = useCallback(async (id: string, _username: string) => {
    await apiFetch(`/checkout/orders/${id}/dispatch`, { method: 'POST' });
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, status: 'dispatched' } : order)));
    setLastOrder((current) => (current?.id === id ? { ...current, status: 'dispatched' } : current));
    return true;
  }, []);

  const confirmReceived = useCallback(async (id: string, _username: string) => {
    await apiFetch(`/checkout/orders/${id}/confirm-received`, { method: 'POST' });
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, status: 'completed' } : order)));
    setLastOrder((current) => (current?.id === id ? { ...current, status: 'completed' } : current));
    return true;
  }, []);

  const cancelOrder = useCallback(async (id: string, _username: string, reason: string) => {
    const order = orders.find((item) => item.id === id);
    await apiFetch(`/checkout/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
    setOrders((current) => current.map((item) => (item.id === id ? { ...item, status: 'cancelled', cancelReason: reason } : item)));
    if (order) await live.releaseListing(order.listingId);
    return true;
  }, [live, orders]);

  const submitReview = useCallback(async (id: string, _username: string, rating: number, comment: string) => {
    await apiFetch(`/checkout/orders/${id}/review`, { method: 'POST', body: JSON.stringify({ rating, comment }) });
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, reviewed: true } : order)));
    setLastOrder((current) => (current?.id === id ? { ...current, reviewed: true } : current));
    return true;
  }, []);

  const getReviews = useCallback((username: string) => reviews[username] ?? [], [reviews]);

  const loadReviews = useCallback(async (username: string) => {
    const data = await apiFetch<{ reviews: Review[]; avg: number; count: number }>(`/checkout/reviews/${encodeURIComponent(username)}`);
    setReviews((current) => ({ ...current, [username]: data.reviews }));
    return data;
  }, []);

  const ratingInfo = useCallback(
    (username: string) => {
      const list = reviews[username] ?? [];
      if (!list.length) return { avg: 0, count: 0 };
      const sum = list.reduce((total, review) => total + review.rating, 0);
      return { avg: sum / list.length, count: list.length };
    },
    [reviews],
  );

  useEffect(() => {
    // Preload reviews lazily when orders load
  }, []);

  const value = useMemo(
    () => ({
      draft,
      lastOrder,
      orders,
      loading,
      now,
      remaining,
      refresh,
      startCheckout,
      updateDraft,
      cancelCheckout,
      completePayment,
      getOrder,
      markDispatched,
      confirmReceived,
      cancelOrder,
      submitReview,
      getReviews,
      ratingInfo,
    }),
    [
      cancelCheckout,
      cancelOrder,
      completePayment,
      confirmReceived,
      draft,
      getOrder,
      getReviews,
      lastOrder,
      loading,
      markDispatched,
      now,
      orders,
      ratingInfo,
      refresh,
      remaining,
      startCheckout,
      submitReview,
      updateDraft,
    ],
  );

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
  const value = useContext(CheckoutContext);
  if (!value) throw new Error('useCheckout must be used within CheckoutProvider');
  return value;
}

export function deliveryLabel(method: DeliveryMethod) {
  return `${method} delivery`;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  paid: 'Paid',
  dispatched: 'Dispatched',
  in_transit: 'In transit',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function orderStatusColor(status: OrderStatus) {
  if (status === 'cancelled') return '#8a2e2e';
  if (status === 'completed') return '#2e6b2e';
  return '#77746e';
}

export function leaveCheckout(router: { replace: (href: Href) => void }, liveId: string | null, listingId?: string) {
  if (liveId) {
    router.replace(`/live/${liveId}`);
    return;
  }
  if (listingId) {
    router.replace(`/product/${listingId}`);
    return;
  }
  router.replace('/(tabs)');
}
