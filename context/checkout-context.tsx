import { getDeliveryOption } from '@/data/checkout';
import { REVIEWS, SEED_ORDERS } from '@/data/seed';
import type { CheckoutDraft, DeliveryMethod, Order, OrderStatus, Review } from '@/data/types';
import { CHECKOUT_RESERVE_MS, useLive } from '@/context/live-context';
import { useListings } from '@/context/listings-context';
import type { Href } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type CheckoutContextValue = {
  draft: CheckoutDraft | null;
  lastOrder: Order | null;
  orders: Order[];
  now: number;
  remaining: number;
  startCheckout: (input: { listingId: string; buyer: string; liveSessionId?: string | null }) => boolean;
  updateDraft: (patch: Partial<Pick<CheckoutDraft, 'name' | 'address' | 'city' | 'phone' | 'deliveryMethod'>>) => void;
  cancelCheckout: () => string | null;
  completePayment: () => Order | null;
  getOrder: (id: string) => Order | undefined;
  markDispatched: (id: string, username: string) => boolean;
  confirmReceived: (id: string, username: string) => boolean;
  cancelOrder: (id: string, username: string, reason: string) => boolean;
  submitReview: (id: string, username: string, rating: number, comment: string) => boolean;
  getReviews: (username: string) => Review[];
  ratingInfo: (username: string) => { avg: number; count: number };
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

function cloneReviews() {
  return Object.fromEntries(Object.entries(REVIEWS).map(([key, list]) => [key, list.map((review) => ({ ...review }))]));
}

function patchOrder(orders: Order[], id: string, patch: Partial<Order>) {
  return orders.map((order) => (order.id === id ? { ...order, ...patch } : order));
}

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const live = useLive();
  const { getListing, setStatus } = useListings();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>(() => SEED_ORDERS.map((order) => ({ ...order })));
  const [orderCount, setOrderCount] = useState(0);
  const [reviews, setReviews] = useState<Record<string, Review[]>>(cloneReviews);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!draft) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [draft]);

  const remaining = useMemo(() => {
    if (!draft) return 0;
    if (draft.liveSessionId) {
      const claim = live.getClaim(draft.liveSessionId);
      return claim ? claim.expiresAt - live.now : draft.expiresAt - now;
    }
    return draft.expiresAt - now;
  }, [draft, live, now]);

  const startCheckout = useCallback(
    (input: { listingId: string; buyer: string; liveSessionId?: string | null }) => {
      if (input.liveSessionId) {
        const reserved = live.beginCheckoutReservation(input.listingId, input.buyer, input.liveSessionId);
        if (!reserved) return false;
      } else {
        const listing = getListing(input.listingId);
        if (!listing || listing.status !== 'available') return false;
        setStatus(input.listingId, 'reserved');
      }
      setDraft({
        listingId: input.listingId,
        liveSessionId: input.liveSessionId ?? null,
        buyer: input.buyer,
        name: '',
        address: '',
        city: '',
        phone: '',
        deliveryMethod: 'Standard',
        expiresAt: Date.now() + CHECKOUT_RESERVE_MS,
      });
      setNow(Date.now());
      return true;
    },
    [getListing, live, setStatus],
  );

  const updateDraft = useCallback((patch: Partial<Pick<CheckoutDraft, 'name' | 'address' | 'city' | 'phone' | 'deliveryMethod'>>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const cancelCheckout = useCallback(() => {
    const liveId = draft?.liveSessionId ?? null;
    if (draft) live.releaseListing(draft.listingId);
    setDraft(null);
    return liveId;
  }, [draft, live]);

  const completePayment = useCallback(() => {
    if (!draft) return null;
    const listing = live.resolveListing(draft.listingId);
    if (!listing || listing.status === 'sold') return null;
    const delivery = getDeliveryOption(draft.deliveryMethod);
    const order: Order = {
      id: `ORD${1001 + orderCount}`,
      listingId: listing.id,
      listingTitle: listing.title,
      buyer: draft.buyer,
      seller: listing.seller,
      name: draft.name.trim(),
      address: draft.address.trim(),
      city: draft.city.trim(),
      phone: draft.phone.trim(),
      deliveryMethod: draft.deliveryMethod,
      deliveryFee: delivery.fee,
      itemPrice: listing.price,
      total: listing.price + delivery.fee,
      fromLiveId: draft.liveSessionId,
      createdAt: new Date().toISOString(),
      status: 'paid',
      reviewed: false,
    };
    live.completeSale(listing.id);
    setLastOrder(order);
    setOrders((current) => [order, ...current]);
    setOrderCount((count) => count + 1);
    setDraft(null);
    return order;
  }, [draft, live, orderCount]);

  const getOrder = useCallback(
    (id: string) => orders.find((item) => item.id === id) ?? (lastOrder?.id === id ? lastOrder : undefined),
    [lastOrder, orders],
  );

  const markDispatched = useCallback((id: string, username: string) => {
    const order = orders.find((item) => item.id === id);
    if (!order || order.seller !== username || order.status !== 'paid') return false;
    const patch = { status: 'dispatched' as const };
    setOrders((current) => patchOrder(current, id, patch));
    setLastOrder((current) => (current?.id === id ? { ...current, ...patch } : current));
    return true;
  }, [orders]);

  const confirmReceived = useCallback((id: string, username: string) => {
    const order = orders.find((item) => item.id === id);
    if (!order || order.buyer !== username) return false;
    if (order.status !== 'dispatched' && order.status !== 'in_transit') return false;
    const patch = { status: 'completed' as const };
    setOrders((current) => patchOrder(current, id, patch));
    setLastOrder((current) => (current?.id === id ? { ...current, ...patch } : current));
    return true;
  }, [orders]);

  const cancelOrder = useCallback(
    (id: string, username: string, reason: string) => {
      const order = orders.find((item) => item.id === id);
      if (!order || order.status !== 'paid') return false;
      if (order.buyer !== username && order.seller !== username) return false;
      const patch = { status: 'cancelled' as const, cancelReason: reason };
      setOrders((current) => patchOrder(current, id, patch));
      setLastOrder((current) => (current?.id === id ? { ...current, ...patch } : current));
      setStatus(order.listingId, 'available');
      return true;
    },
    [orders, setStatus],
  );

  const submitReview = useCallback(
    (id: string, username: string, rating: number, comment: string) => {
      const order = orders.find((item) => item.id === id);
      if (!order || order.buyer !== username || order.status !== 'completed' || order.reviewed) return false;
      if (rating < 1 || rating > 5) return false;
      const review: Review = { buyer: username, rating, comment: comment.trim(), date: 'Just now' };
      setReviews((current) => ({ ...current, [order.seller]: [...(current[order.seller] ?? []), review] }));
      setOrders((current) => patchOrder(current, id, { reviewed: true }));
      setLastOrder((current) => (current?.id === id ? { ...current, reviewed: true } : current));
      return true;
    },
    [orders],
  );

  const getReviews = useCallback((username: string) => reviews[username] ?? [], [reviews]);

  const ratingInfo = useCallback(
    (username: string) => {
      const list = reviews[username] ?? [];
      if (!list.length) return { avg: 0, count: 0 };
      const sum = list.reduce((total, review) => total + review.rating, 0);
      return { avg: sum / list.length, count: list.length };
    },
    [reviews],
  );

  const value = useMemo(
    () => ({
      draft,
      lastOrder,
      orders,
      now,
      remaining,
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
      markDispatched,
      now,
      orders,
      ratingInfo,
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
  if (!value) {
    throw new Error('useCheckout must be used within CheckoutProvider');
  }
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
