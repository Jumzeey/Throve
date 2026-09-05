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

export function checkoutTotals(input: {
  itemPrice: number;
  deliveryMethod: DeliveryMethod | null | undefined;
  listedPrice?: number | null;
}) {
  const delivery = getDeliveryOption(input.deliveryMethod);
  const protectionFee = buyerProtectionFee(input.itemPrice);
  const total = input.itemPrice + delivery.fee + protectionFee;
  return {
    itemPrice: input.itemPrice,
    listedPrice: input.listedPrice ?? null,
    delivery,
    protectionFee,
    total,
  };
}
