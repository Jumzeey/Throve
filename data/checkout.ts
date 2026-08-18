import type { DeliveryMethod } from '@/data/types';

export const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string; eta: string; fee: number }[] = [
  { value: 'Standard', label: 'Standard delivery', eta: 'Estimated 2–5 working days', fee: 2500 },
  { value: 'Express', label: 'Express delivery', eta: 'Estimated 1–2 working days', fee: 4000 },
];

export function getDeliveryOption(method: DeliveryMethod) {
  return DELIVERY_OPTIONS.find((option) => option.value === method) ?? DELIVERY_OPTIONS[0];
}
