import type { DeliveryMethod } from '@/data/types';

export const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string; eta: string; fee: number }[] = [
  { value: 'Standard', label: 'Standard delivery', eta: 'Estimated 2–5 working days', fee: 2500 },
  { value: 'Express', label: 'Express delivery', eta: 'Estimated 1–2 working days', fee: 4000 },
];

export function getDeliveryOption(method: DeliveryMethod | null | undefined) {
  if (!method) return DELIVERY_OPTIONS[0];
  return DELIVERY_OPTIONS.find((option) => option.value === method) ?? DELIVERY_OPTIONS[0];
}

/** 5% of item price, ₦300 minimum, ₦2,500 maximum. Never on delivery. */
export function buyerProtectionFee(itemPrice: number) {
  const raw = Math.round(itemPrice * 0.05);
  return Math.min(2500, Math.max(300, raw));
}

/**
 * `itemPrice` and `listedPrice` are per unit; the returned `itemPrice` / `listedPrice` are line
 * totals for `quantity` units. Delivery is charged once per order; Buyer Protection is on the items.
 */
export function checkoutTotals(input: {
  itemPrice: number;
  deliveryMethod: DeliveryMethod | null | undefined;
  listedPrice?: number | null;
  quantity?: number;
}) {
  const quantity = Math.max(1, Math.trunc(input.quantity ?? 1));
  const itemPrice = input.itemPrice * quantity;
  const delivery = getDeliveryOption(input.deliveryMethod);
  const protectionFee = buyerProtectionFee(itemPrice);
  const total = itemPrice + delivery.fee + protectionFee;
  return {
    unitPrice: input.itemPrice,
    quantity,
    itemPrice,
    listedPrice: input.listedPrice != null ? input.listedPrice * quantity : null,
    delivery,
    protectionFee,
    total,
  };
}
