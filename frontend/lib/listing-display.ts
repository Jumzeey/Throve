import { DELIVERY_OPTIONS } from '@/data/checkout';
import { getCachedListingCatalog } from '@/lib/listing-catalog';

export const BUYER_PROTECTION_RATE = 0.05;
export const BUYER_PROTECTION_MAX = 2500;

export function buyerProtectionFee(price: number) {
  return Math.min(BUYER_PROTECTION_MAX, Math.max(0, Math.round(price * BUYER_PROTECTION_RATE)));
}

export function displayListingSize(size: string) {
  const trimmed = size.trim();
  if (!trimmed || trimmed === '—') return 'One size';
  if (trimmed === 'S') return 'Small';
  if (trimmed === 'M') return 'Medium';
  if (trimmed === 'L') return 'Large';
  return trimmed;
}

export function formatUploaded(createdAt: string) {
  const ts = Date.parse(createdAt);
  if (!Number.isFinite(ts)) return createdAt;
  const days = Math.max(0, Math.floor((Date.now() - ts) / 86400000));
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  return new Date(ts).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function shippingRows() {
  const catalog = getCachedListingCatalog();
  if (catalog) {
    return catalog.shipping.map((option) => ({
      label: `${option.label} · ${option.eta}`,
      fee: option.fee,
    }));
  }
  return DELIVERY_OPTIONS.map((option) => ({
    label: `${option.label} · ${option.eta.replace(/^Estimated /, '')}`,
    fee: option.fee,
  }));
}
