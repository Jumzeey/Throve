import { getDeliveryOption } from '@/data/checkout';
import type { CheckoutDraft, DeliveryMethod, Order } from '@/data/types';
import { CHECKOUT_RESERVE_MS, useLive } from '@/context/live-context';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type CheckoutContextValue = {
  draft: CheckoutDraft | null;
  lastOrder: Order | null;
  startCheckout: (input: { listingId: string; liveSessionId: string; buyer: string }) => boolean;
  updateDraft: (patch: Partial<Pick<CheckoutDraft, 'name' | 'address' | 'city' | 'phone' | 'deliveryMethod'>>) => void;
  cancelCheckout: () => string | null;
  completePayment: () => Order | null;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const live = useLive();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [orderCount, setOrderCount] = useState(0);

  const startCheckout = useCallback(
    (input: { listingId: string; liveSessionId: string; buyer: string }) => {
      const reserved = live.beginCheckoutReservation(input.listingId, input.buyer, input.liveSessionId);
      if (!reserved) return false;
      setDraft({
        listingId: input.listingId,
        liveSessionId: input.liveSessionId,
        buyer: input.buyer,
        name: '',
        address: '',
        city: '',
        phone: '',
        deliveryMethod: 'Standard',
        expiresAt: Date.now() + CHECKOUT_RESERVE_MS,
      });
      return true;
    },
    [live],
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
    };
    live.completeSale(listing.id);
    setLastOrder(order);
    setOrderCount((count) => count + 1);
    setDraft(null);
    return order;
  }, [draft, live, orderCount]);

  const value = useMemo(
    () => ({ draft, lastOrder, startCheckout, updateDraft, cancelCheckout, completePayment }),
    [cancelCheckout, completePayment, draft, lastOrder, startCheckout, updateDraft],
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
